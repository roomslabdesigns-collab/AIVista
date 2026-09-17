import { GoogleGenAI } from '@google/genai';
import { CrawledPage } from './crawler.js';
import { Project } from './types.js';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for AI analysis');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface GeminiAnalysisResult {
  companyDescription: string;
  productsServices: string[];
  industryCategory: string;
  targetCustomers: string[];
  useCases: string[];
  importantTopics: string[];
  competitorsMentioned: string[];
  generatedQueries: Array<{
    query: string;
    intent: 'category' | 'comparison' | 'intent_to_buy' | 'evaluative';
    buyerPersona: string;
    estimatedFunnelStage: 'top' | 'mid' | 'bottom';
  }>;
}

export async function analyzeWebsiteAndGenerateQueries(
  project: Project,
  pages: CrawledPage[]
): Promise<GeminiAnalysisResult> {
  const ai = getAiClient();

  const pagesSummary = pages
    .map(
      (p, i) =>
        `--- Page ${i + 1}: ${p.url} ---\nTitle: ${p.title}\nDescription: ${p.description}\nHeadings: ${p.headings.join(' | ')}\nContent:\n${p.contentSnippet}\n`
    )
    .join('\n\n');

  const prompt = `You are an expert AI Search Engine Optimization (GEO/AEO) & Revenue Intelligence Agent.
You are analyzing a business based on the content crawled from their official website.

TARGET BUSINESS METADATA:
- Company Name: ${project.companyName}
- Website URL: ${project.websiteUrl}
- Known Industry: ${project.industry || 'Not specified'}
- Stated ICP/Target Audience: ${project.targetAudience || 'Not specified'}
- Known Competitors: ${(project.competitors || []).join(', ') || 'Not specified'}

CRAWLED WEBSITE CONTENT:
${pagesSummary}

YOUR MISSION:
1. Extract and synthesize core business intelligence:
   - companyDescription: concise, highly accurate description of what the company does and its value proposition (2-3 sentences).
   - productsServices: array of specific products, features, or service offerings.
   - industryCategory: the precise category/industry the business operates in.
   - targetCustomers: array of target customer roles, personas, or organization types.
   - useCases: array of primary customer use cases or workflows solved.
   - importantTopics: array of core topics, keywords, or domain themes discussed.
   - competitorsMentioned: array of competitors mentioned directly on the website or top market competitors in this niche.

2. Generate between 22 and 28 high-intent customer search queries based on the business:
   - These must be the realistic, natural questions a prospective customer asks an AI assistant (like ChatGPT, Perplexity, Claude, or Google AI Overviews) when researching, comparing, or looking to buy in this space.
   - DO NOT make generic keyword searches. Make them realistic conversational buyer questions.
   - Examples of query styles:
     * Category questions: "What is the best CRM for mid-market B2B sales teams with automated pipeline tracking?"
     * Comparison questions: "How does ${project.companyName} compare to [Competitor] for enterprise revenue operations?"
     * Evaluative / use-case: "Which software provides real-time outbound call transcription and automated CRM updates?"
     * Intent-to-buy: "Top CRM software alternatives to Salesforce for high-velocity SDR teams in 2026"
   - Distribute the queries across:
     * intent: "category" | "comparison" | "intent_to_buy" | "evaluative"
     * buyerPersona: specific buyer persona asking (e.g. "VP of Sales", "RevOps Director", "Head of Growth", "CTO")
     * estimatedFunnelStage: "top" | "mid" | "bottom"
   - You MUST generate at least 22 queries and at most 28 queries (strictly within 20–30 range).

OUTPUT FORMAT:
Return pure valid JSON matching this schema:
{
  "companyDescription": "string",
  "productsServices": ["string"],
  "industryCategory": "string",
  "targetCustomers": ["string"],
  "useCases": ["string"],
  "importantTopics": ["string"],
  "competitorsMentioned": ["string"],
  "generatedQueries": [
    {
      "query": "string",
      "intent": "category" | "comparison" | "intent_to_buy" | "evaluative",
      "buyerPersona": "string",
      "estimatedFunnelStage": "top" | "mid" | "bottom"
    }
  ]
}`;

  const models = ['gemini-flash-latest', 'gemini-3.1-flash-lite', 'gemini-3.1-pro-preview'];
  let responseText = '';
  let lastError: any = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        });
        const txt = response.text?.trim();
        if (txt) {
          responseText = txt;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiService] Model ${model} attempt ${attempt} error:`, err.message || err);
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      }
    }
    if (responseText) break;
  }

  if (!responseText) {
    let cleanMsg = lastError?.message || String(lastError);
    try {
      const parsedErr = JSON.parse(cleanMsg);
      if (parsedErr?.error?.message) {
        cleanMsg = parsedErr.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(`Gemini AI service unavailable: ${cleanMsg}`);
  }

  try {
    const parsed: GeminiAnalysisResult = JSON.parse(responseText);

    // Validate and clean up
    if (!parsed.companyDescription) {
      parsed.companyDescription = `${project.companyName} provides solutions in the ${project.industry || 'technology'} domain.`;
    }
    if (!Array.isArray(parsed.productsServices)) parsed.productsServices = [];
    if (!parsed.industryCategory) parsed.industryCategory = project.industry || 'Technology';
    if (!Array.isArray(parsed.targetCustomers)) parsed.targetCustomers = [];
    if (!Array.isArray(parsed.useCases)) parsed.useCases = [];
    if (!Array.isArray(parsed.importantTopics)) parsed.importantTopics = [];
    if (!Array.isArray(parsed.competitorsMentioned)) parsed.competitorsMentioned = project.competitors || [];
    if (!Array.isArray(parsed.generatedQueries)) parsed.generatedQueries = [];

    // Ensure valid intents
    parsed.generatedQueries = parsed.generatedQueries.map((q) => ({
      query: String(q.query || '').trim(),
      intent: (['category', 'comparison', 'intent_to_buy', 'evaluative'].includes(q.intent)
        ? q.intent
        : 'category') as any,
      buyerPersona: String(q.buyerPersona || 'Decision Maker').trim(),
      estimatedFunnelStage: (['top', 'mid', 'bottom'].includes(q.estimatedFunnelStage)
        ? q.estimatedFunnelStage
        : 'mid') as any
    }));

    return parsed;
  } catch (err: any) {
    console.error('[GeminiService] Failed to parse JSON response:', responseText);
    throw new Error(`Failed to parse AI model response: ${err.message || err}`);
  }
}
