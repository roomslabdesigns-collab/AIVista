import { Project, AnalysisRun, RunResults, WebsitePage, WebsiteAnalysis, SearchQuery } from '../types';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects');
  const json: ApiResponse<Project[]> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to fetch projects');
  }
  return json.data || [];
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`);
  const json: ApiResponse<Project> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Failed to fetch project ${id}`);
  }
  return json.data!;
}

export async function createProjectApi(input: {
  websiteUrl: string;
  companyName: string;
  industry?: string;
  targetAudience?: string;
  targetMarket?: string;
  competitors?: string[];
  status?: 'active' | 'archived' | 'draft';
}): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const json: ApiResponse<Project> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to create project');
  }
  return json.data!;
}

export async function updateProjectApi(
  id: string,
  input: {
    websiteUrl?: string;
    companyName?: string;
    industry?: string;
    targetAudience?: string;
    targetMarket?: string;
    competitors?: string[];
    status?: 'active' | 'archived' | 'draft';
  }
): Promise<Project> {
  const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input)
  });
  const json: ApiResponse<Project> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Failed to update project ${id}`);
  }
  return json.data!;
}

export async function createAnalysisRunApi(projectId: string): Promise<AnalysisRun> {
  const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/runs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const json: ApiResponse<AnalysisRun> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Failed to create analysis run for project ${projectId}`);
  }
  return json.data!;
}

export async function fetchAnalysisRun(runId: string): Promise<AnalysisRun> {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}`);
  const json: ApiResponse<AnalysisRun> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Failed to fetch analysis run ${runId}`);
  }
  return json.data!;
}

export async function fetchRunResults(runId: string): Promise<RunResults> {
  const res = await fetch(`/api/runs/${encodeURIComponent(runId)}/results`);
  const json: ApiResponse<RunResults> = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || `Failed to fetch run results for ${runId}`);
  }
  return json.data!;
}
