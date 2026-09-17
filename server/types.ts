export interface Project {
  id: string;
  websiteUrl: string;
  companyName: string;
  industry?: string;
  targetAudience?: string;
  targetMarket?: string;
  competitors?: string[];
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisRun {
  id: string;
  projectId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  progressStage?: 'crawling' | 'analyzing' | 'generating_queries' | 'evaluating_ai_search' | 'completed' | 'failed' | null;
  crawledPagesCount?: number;
  queriesCount?: number;
  completedSearchQueriesCount?: number;
  totalSearchQueriesCount?: number;
  createdAt: string;
}

export interface WebsitePage {
  id: string;
  runId: string;
  projectId: string;
  url: string;
  title: string;
  description: string;
  headings: string[];
  contentSnippet: string;
  statusCode: number;
  createdAt: string;
}

export interface WebsiteAnalysis {
  id: string;
  runId: string;
  projectId: string;
  companyDescription: string;
  productsServices: string[];
  industryCategory: string;
  targetCustomers: string[];
  useCases: string[];
  importantTopics: string[];
  competitorsMentioned: string[];
  createdAt: string;
}

export interface SearchQuery {
  id: string;
  runId: string;
  projectId: string;
  query: string;
  intent: 'category' | 'comparison' | 'intent_to_buy' | 'evaluative';
  buyerPersona: string;
  estimatedFunnelStage: 'top' | 'mid' | 'bottom';
  createdAt: string;
}

export interface CreateProjectInput {
  websiteUrl: string;
  companyName: string;
  industry?: string;
  targetAudience?: string;
  targetMarket?: string;
  competitors?: string[];
  status?: 'active' | 'archived' | 'draft';
}

export interface UpdateProjectInput {
  websiteUrl?: string;
  companyName?: string;
  industry?: string;
  targetAudience?: string;
  targetMarket?: string;
  competitors?: string[];
  status?: 'active' | 'archived' | 'draft';
}

export interface CitationItem {
  uri: string;
  title: string;
}

export interface AISearchResult {
  id: string;
  runId: string;
  projectId: string;
  queryId: string;
  query: string;
  provider: string;
  model: string;
  timestamp: string;
  responseText: string;
  isSearchGrounded: boolean;
  brandMentioned: boolean;
  brandRecommended: boolean;
  competitorsMentioned: string[];
  recommendationContext: string;
  citations: CitationItem[];
  status: 'completed' | 'failed';
  error?: string | null;
  createdAt: string;
}

