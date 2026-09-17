import { AIProvider } from './types.js';
import { GeminiProvider } from './geminiProvider.js';

export * from './types.js';
export { GeminiProvider } from './geminiProvider.js';

const providers: Record<string, () => AIProvider> = {
  gemini: () => new GeminiProvider()
  // Future: openai: () => new OpenAIProvider(),
  // Future: anthropic: () => new AnthropicProvider()
};

export function getAIProvider(providerName: string = 'gemini'): AIProvider {
  const normalized = providerName.toLowerCase().trim();
  const factory = providers[normalized];
  if (!factory) {
    throw new Error(`AI Provider "${providerName}" is not supported. Supported providers: ${Object.keys(providers).join(', ')}`);
  }
  return factory();
}
