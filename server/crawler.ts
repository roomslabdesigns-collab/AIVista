import dns from 'dns/promises';

export interface CrawledPage {
  url: string;
  title: string;
  description: string;
  headings: string[];
  contentSnippet: string;
  statusCode: number;
}

// SSRF Protection: verify IP address is not private, loopback, or cloud metadata
export function isPrivateOrReservedIp(ip: string): boolean {
  // IPv4 check
  if (ip.includes('.')) {
    const parts = ip.split('.').map((p) => parseInt(p, 10));
    if (parts.length !== 4 || parts.some(isNaN)) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 (loopback)
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (link-local, cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
    if (a >= 224) return true; // Multicast / Class E
    return false;
  }

  // IPv6 check
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::' || lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  return false;
}

// Validate URL against SSRF and illegal protocols
export async function validateSafeUrl(urlStr: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid URL format: ${urlStr}`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Forbidden protocol: ${parsed.protocol}. Only http and https are permitted.`);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.includes('metadata.google') ||
    hostname === '169.254.169.254'
  ) {
    throw new Error(`Forbidden host address: ${hostname}`);
  }

  // Resolve DNS to verify the target IP is public
  try {
    const lookupResults = await dns.lookup(hostname, { all: true });
    if (!lookupResults || lookupResults.length === 0) {
      throw new Error(`Could not resolve hostname: ${hostname}`);
    }
    for (const record of lookupResults) {
      if (isPrivateOrReservedIp(record.address)) {
        throw new Error(`Access to private/internal network IP (${record.address}) is blocked.`);
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('blocked')) throw err;
    throw new Error(`DNS resolution failed for ${hostname}: ${err.message || err}`);
  }

  return parsed;
}

// Simple HTML text extractor
export function extractPageMetadata(html: string, url: string, statusCode: number): CrawledPage {
  // Title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? cleanText(titleMatch[1]) : '';

  // Meta description
  let description = '';
  const descMatch = html.match(/<meta[^>]+(?:name=["']description["']|property=["']og:description["'])[^>]+content=["']([^"']*)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+(?:name=["']description["']|property=["']og:description["'])/i);
  if (descMatch) {
    description = cleanText(descMatch[1]);
  }

  // Headings (h1, h2, h3)
  const headings: string[] = [];
  const headingRegex = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let hMatch: RegExpExecArray | null;
  while ((hMatch = headingRegex.exec(html)) !== null && headings.length < 15) {
    const cleaned = cleanText(hMatch[1]);
    if (cleaned && cleaned.length > 2 && !headings.includes(cleaned)) {
      headings.push(cleaned);
    }
  }

  // Clean body text
  let bodyContent = html;
  // Remove scripts, styles, SVGs, noscript
  bodyContent = bodyContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  bodyContent = bodyContent.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  bodyContent = bodyContent.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  bodyContent = bodyContent.replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ');
  bodyContent = bodyContent.replace(/<!--[\s\S]*?-->/g, ' ');

  // Strip remaining HTML tags
  const rawText = cleanText(bodyContent.replace(/<[^>]+>/g, ' '));
  // Keep first 5000 characters
  const contentSnippet = rawText.slice(0, 5000);

  return {
    url,
    title: title || url,
    description,
    headings,
    contentSnippet,
    statusCode
  };
}

function cleanText(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Extract same-origin internal links
export function extractInternalLinks(html: string, baseUrl: URL): string[] {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"'#\s]+)["']/gi;
  let match: RegExpExecArray | null;

  const priorityKeywords = ['product', 'feature', 'pricing', 'about', 'solution', 'platform', 'service'];

  while ((match = linkRegex.exec(html)) !== null) {
    const rawHref = match[1];
    if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:') || rawHref.startsWith('javascript:')) {
      continue;
    }
    try {
      const resolved = new URL(rawHref, baseUrl);
      // Only keep same origin
      if (resolved.origin === baseUrl.origin) {
        // Exclude binary files
        if (!resolved.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|pdf|zip|tar|gz|mp4|css|js)$/i)) {
          const cleanLink = `${resolved.origin}${resolved.pathname}`;
          if (!links.includes(cleanLink) && cleanLink !== baseUrl.href) {
            links.push(cleanLink);
          }
        }
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  // Sort priority pages (e.g. pricing, product, about) first
  return links.sort((a, b) => {
    const aPriority = priorityKeywords.some((k) => a.toLowerCase().includes(k)) ? 1 : 0;
    const bPriority = priorityKeywords.some((k) => b.toLowerCase().includes(k)) ? 1 : 0;
    return bPriority - aPriority;
  });
}

// Check robots.txt (user-agent: * disallow rules)
export async function checkRobotsAllowed(baseUrl: URL, pathToCheck: string): Promise<boolean> {
  try {
    const robotsUrl = `${baseUrl.origin}/robots.txt`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'AIVista-Bot/1.0 (+https://aivista.dev)' }
    });
    clearTimeout(timeout);

    if (!res.ok) return true; // If no robots.txt, default to allowed

    const text = await res.text();
    const lines = text.split('\n');
    let appliesToAll = false;

    for (const line of lines) {
      const cleanLine = line.trim();
      if (cleanLine.toLowerCase().startsWith('user-agent:')) {
        const agent = cleanLine.split(':')[1]?.trim() || '';
        appliesToAll = agent === '*';
      } else if (appliesToAll && cleanLine.toLowerCase().startsWith('disallow:')) {
        const disallowPath = cleanLine.split(':')[1]?.trim() || '';
        if (disallowPath && pathToCheck.startsWith(disallowPath)) {
          return false;
        }
      }
    }
    return true;
  } catch {
    // If robots.txt fetch fails or times out, proceed
    return true;
  }
}

// Fetch a single page safely with redirects and timeout
async function fetchSafePage(urlStr: string): Promise<{ html: string; status: number; finalUrl: string }> {
  let currentUrl = urlStr;
  let hops = 0;
  const maxHops = 3;

  while (hops <= maxHops) {
    const parsed = await validateSafeUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    let res: Response;
    try {
      res = await fetch(parsed.toString(), {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 AIVistaBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    // Handle redirects safely
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new Error(`Received redirect status ${res.status} without Location header`);
      }
      hops++;
      if (hops > maxHops) {
        throw new Error(`Too many redirects (exceeded ${maxHops})`);
      }
      const nextUrl = new URL(location, parsed).toString();
      currentUrl = nextUrl;
      continue;
    }

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status} ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml') && !contentType.includes('text/plain')) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    const html = await res.text();
    return { html, status: res.status, finalUrl: currentUrl };
  }

  throw new Error(`Failed to fetch page: too many redirects`);
}

// Safely crawl up to 4 key pages
export async function crawlWebsitePages(startUrl: string, maxPages = 4): Promise<CrawledPage[]> {
  const initialUrl = await validateSafeUrl(startUrl);
  const crawled: CrawledPage[] = [];
  const visited = new Set<string>();

  // 1. Fetch homepage
  visited.add(initialUrl.href);
  const homeRobotsAllowed = await checkRobotsAllowed(initialUrl, initialUrl.pathname);
  if (!homeRobotsAllowed) {
    throw new Error(`Crawling of ${initialUrl.href} is disallowed by website robots.txt`);
  }

  const homeResult = await fetchSafePage(initialUrl.href);
  const homeMetadata = extractPageMetadata(homeResult.html, homeResult.finalUrl, homeResult.status);
  crawled.push(homeMetadata);

  // 2. Discover internal links
  const discoveredLinks = extractInternalLinks(homeResult.html, new URL(homeResult.finalUrl));

  // 3. Crawl top candidate pages up to maxPages
  for (const link of discoveredLinks) {
    if (crawled.length >= maxPages) break;
    if (visited.has(link)) continue;
    visited.add(link);

    try {
      const linkUrl = new URL(link);
      const isAllowed = await checkRobotsAllowed(linkUrl, linkUrl.pathname);
      if (!isAllowed) continue;

      const pageResult = await fetchSafePage(link);
      const pageMetadata = extractPageMetadata(pageResult.html, pageResult.finalUrl, pageResult.status);
      crawled.push(pageMetadata);
    } catch (err: any) {
      console.warn(`[Crawler] Skipped page ${link}:`, err.message || err);
    }
  }

  return crawled;
}
