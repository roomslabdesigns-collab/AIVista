export interface StepItem {
  label: string;
  short: string;
  meta: string;
  tool: number;
}

export interface ToolActivityItem {
  glyph: string;
  name: string;
  firstStep: number;
  lastStep: number;
  summary: string;
  bullets: string[];
  hasLink?: boolean;
  linkLabel?: string;
  drawer?: 'queries' | 'evidence';
}

export interface QueryEvidence {
  q: string;
  you: string;
  top: string;
}

export interface FindingItem {
  tag: string;
  title: string;
  stat: string;
  statColor: string;
  body: string;
  evidence: QueryEvidence[];
}

export interface QueryItem {
  q: string;
  intent: 'high intent' | 'comparison' | 'medium intent';
  answer: string;
  brands: string[];
  cites: string[];
}

export interface CompetitorMetric {
  name: string;
  mention: string;
  citation: string;
  rec: string;
  pos: string;
  gap: string;
  up?: boolean;
  you?: boolean;
}

export interface OpportunityItem {
  n: string;
  title: string;
  impact: 'High impact' | 'Medium impact';
  conf: string;
  body: string;
}

export interface KpiMetric {
  label: string;
  value: string;
  delta: string;
  stroke: string;
  fill: string;
  series: number[];
}

export interface NotificationItem {
  id: string;
  glyph: string;
  title: string;
  body: string;
  time: string;
  go: string;
}

export interface ScopeChipItem {
  label: string;
  impactGain: number;
}

export type LayoutMode = 'Command rail' | 'Case file' | 'Stream';

export interface AnalysisState {
  brandName: string;
  stepIndex: number;
  isComplete: boolean;
  approved: boolean;
  scope: number[];
  selectedDrawer: 'queries' | 'evidence' | null;
}

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

export interface RunResults {
  run: AnalysisRun;
  analysis?: WebsiteAnalysis | null;
  queries?: SearchQuery[];
  pages?: WebsitePage[];
  searchResults?: AISearchResult[];
}

