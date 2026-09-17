export interface CitationItem {
  uri: string;
  title: string;
}

export interface ProviderQueryParams {
  query: string;
  brandName: string;
  websiteUrl: string;
  competitors: string[];
  industry?: string;
}

export interface ProviderQueryResponse {
  provider: string; // 'gemini' | 'openai' | 'anthropic'
  model: string;
  responseText: string;
  isSearchGrounded: boolean;
  citations: CitationItem[];
  timestamp: string;
  rawMetadata?: any;
}

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  evaluateQuery(params: ProviderQueryParams): Promise<ProviderQueryResponse>;
}
