export interface AnalysisIdentification {
  brandMentioned: boolean;
  brandRecommended: boolean;
  competitorsMentioned: string[];
  recommendationContext: string;
}

export function analyzeSearchResponse(
  responseText: string,
  brandName: string,
  websiteUrl: string,
  knownCompetitors: string[] = []
): AnalysisIdentification {
  if (!responseText || typeof responseText !== 'string') {
    return {
      brandMentioned: false,
      brandRecommended: false,
      competitorsMentioned: [],
      recommendationContext: 'No response received from AI search provider.'
    };
  }

  // 1. Detect Brand Mention
  const cleanBrand = brandName.trim();
  let domainHost = '';
  try {
    domainHost = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`).hostname.replace(/^www\./, '');
  } catch {
    domainHost = cleanBrand.toLowerCase();
  }

  // Build regex patterns for brand
  const brandPatterns: RegExp[] = [];
  if (cleanBrand) {
    // Escaped brand name with word boundaries
    const escaped = cleanBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    brandPatterns.push(new RegExp(`\\b${escaped}\\b`, 'i'));
    
    // If brand ends with .com / .io / .ai etc, also check root name if >= 4 chars
    const rootName = cleanBrand.replace(/\.(com|io|ai|app|co|dev|net|org)$/i, '');
    if (rootName.length >= 3 && rootName.toLowerCase() !== 'the' && rootName.toLowerCase() !== 'app') {
      brandPatterns.push(new RegExp(`\\b${rootName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
    }
  }

  if (domainHost && domainHost !== cleanBrand.toLowerCase()) {
    brandPatterns.push(new RegExp(`\\b${domainHost.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
  }

  const brandMentioned = brandPatterns.some(pattern => pattern.test(responseText));

  // 2. Detect Competitors Mentioned
  const detectedCompetitors = new Set<string>();
  
  // Standard list of software/market competitors to look for if present
  const candidateCompetitors = Array.from(new Set([
    ...knownCompetitors,
    'Calendly',
    'Acuity Scheduling',
    'Chili Piper',
    'SavvyCal',
    'HubSpot Meetings',
    'Doodle',
    'OnceHub',
    'Setmore',
    'Zoho Bookings',
    'Google Calendar'
  ].filter(Boolean)));

  for (const comp of candidateCompetitors) {
    if (cleanBrand.toLowerCase().includes(comp.toLowerCase()) || comp.toLowerCase().includes(cleanBrand.toLowerCase())) {
      continue; // Don't detect self as competitor
    }
    const escaped = comp.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const compRegex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (compRegex.test(responseText)) {
      detectedCompetitors.add(comp);
    }
  }

  // 3. Detect Brand Recommendation & Context
  let brandRecommended = false;
  let recommendationContext = '';

  if (!brandMentioned) {
    brandRecommended = false;
    if (detectedCompetitors.size > 0) {
      recommendationContext = `Not mentioned. Competitors like ${Array.from(detectedCompetitors).slice(0, 3).join(', ')} were recommended instead.`;
    } else {
      recommendationContext = `Not mentioned in the AI search response.`;
    }
  } else {
    // Extract sentences or context containing the brand
    const sentences = responseText.split(/(?<=[.?!])\s+/);
    const brandSentences = sentences.filter(s => brandPatterns.some(p => p.test(s)));
    const brandSnippet = brandSentences.slice(0, 2).join(' ').trim();

    // Recommendation indicators
    const recommendationSignals = [
      /\b(top pick|best overall|our pick|highly recommend|strongest choice|stands out|ideal choice|winner|recommended|best option|great choice|leading choice|best alternative)\b/i,
      /\b(#1|number one|premier|go-to platform|gold standard)\b/i,
      /\b(best for (startups|enterprises|developers|customization|teams|scheduling|privacy))\b/i
    ];

    const negativeSignals = [
      /\b(not recommended|falls short|drawback|lacks|steep learning curve|limited support|avoid|inferior|weakness|complex to host)\b/i
    ];

    const hasPositiveSignal = recommendationSignals.some(sig => sig.test(brandSnippet || responseText));
    const hasNegativeSignal = negativeSignals.some(sig => sig.test(brandSnippet));

    // Also check if brand appears as a top bullet / heading
    const isHeadingOrNumbered = brandPatterns.some(p => {
      const headingMatch = new RegExp(`(^|\\n)\\s*([0-9]+\\.|[*-])\\s*(\\*\\*)?.*${p.source}`, 'i');
      return headingMatch.test(responseText);
    });

    if ((hasPositiveSignal || isHeadingOrNumbered) && !hasNegativeSignal) {
      brandRecommended = true;
      if (brandSnippet) {
        recommendationContext = brandSnippet.length > 220 ? `${brandSnippet.slice(0, 217)}...` : brandSnippet;
      } else {
        recommendationContext = `Recommended by AI search as a top solution.`;
      }
    } else {
      brandRecommended = false;
      if (brandSnippet) {
        recommendationContext = brandSnippet.length > 220 ? `${brandSnippet.slice(0, 217)}...` : brandSnippet;
      } else {
        recommendationContext = `Mentioned in comparison but not ranked as the primary recommendation.`;
      }
    }
  }

  return {
    brandMentioned,
    brandRecommended,
    competitorsMentioned: Array.from(detectedCompetitors),
    recommendationContext
  };
}
