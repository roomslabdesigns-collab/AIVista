import { GoogleGenAI } from '@google/genai';
import { AIProvider, ProviderQueryParams, ProviderQueryResponse, CitationItem } from './types.js';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini';
  readonly name = 'Google Gemini';

  private static searchToolQuotaExhausted = false;
  private static preferredModel = 'gemini-3.1-flash-lite';

  private getClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }

  async evaluateQuery(params: ProviderQueryParams): Promise<ProviderQueryResponse> {
    const ai = this.getClient();
    const candidateModels = [
      GeminiProvider.preferredModel,
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash'
    ].filter((v, i, a) => a.indexOf(v) === i);

    const searchPrompt = `You are an unbiased AI search engine answering user questions accurately, thoroughly, and objectively.

User Query: "${params.query}"

Provide a comprehensive, authoritative answer that addresses the user's requirements, compares the best solutions currently available on the market, highlights key features, and gives clear recommendations where appropriate.`;

    // Step 1: Try with search grounding ONLY if search tool quota is not exhausted
    if (!GeminiProvider.searchToolQuotaExhausted) {
      for (const model of candidateModels) {
        try {
          const groundedRes = await this.executeWithTimeout(
            ai.models.generateContent({
              model,
              contents: searchPrompt,
              config: {
                tools: [{ googleSearch: {} }],
                temperature: 0.2
              }
            }),
            8000
          );

          const text = groundedRes.text?.trim();
          if (text) {
            GeminiProvider.preferredModel = model;
            const candidate = groundedRes.candidates?.[0];
            const chunks = candidate?.groundingMetadata?.groundingChunks || [];
            const citations: CitationItem[] = [];

            for (const chunk of chunks) {
              if (chunk.web?.uri) {
                citations.push({
                  uri: chunk.web.uri,
                  title: chunk.web.title || new URL(chunk.web.uri).hostname
                });
              }
            }

            const uniqueCitations = Array.from(new Map(citations.map(c => [c.uri, c])).values());

            return {
              provider: 'gemini',
              model,
              responseText: text,
              isSearchGrounded: uniqueCitations.length > 0,
              citations: uniqueCitations,
              timestamp: new Date().toISOString(),
              rawMetadata: {
                webSearchQueries: candidate?.groundingMetadata?.webSearchQueries || []
              }
            };
          }
        } catch (err: any) {
          const errMsg = String(err?.message || err);
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
            console.warn(`[GeminiProvider] Google Search grounding quota exhausted. Falling back to direct model search evaluation.`);
            GeminiProvider.searchToolQuotaExhausted = true;
            break; // Stop attempting search tool
          }
        }
      }
    }

    // Step 2: High-speed standard model generation without search tool
    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const standardRes = await this.executeWithTimeout(
          ai.models.generateContent({
            model,
            contents: searchPrompt,
            config: {
              temperature: 0.2
            }
          }),
          15000
        );

        const text = standardRes.text?.trim();
        if (text) {
          GeminiProvider.preferredModel = model;
          return {
            provider: 'gemini',
            model,
            responseText: text,
            isSearchGrounded: false,
            citations: [], // Strictly no fabricated citations
            timestamp: new Date().toISOString()
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[GeminiProvider] Model ${model} evaluation error:`, err.message || err);
      }
    }

    throw new Error(`Gemini evaluation failed across all candidate models: ${lastError?.message || lastError}`);
  }

  private async executeWithTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms);
    });

    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      clearTimeout(timer!);
    }
  }
}
