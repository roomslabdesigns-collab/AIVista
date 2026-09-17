import {
  getDb,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy
} from './db.js';
import {
  Project,
  AnalysisRun,
  CreateProjectInput,
  UpdateProjectInput,
  WebsitePage,
  WebsiteAnalysis,
  SearchQuery,
  AISearchResult
} from './types.js';
import { AppError } from './apiResponse.js';
import { crawlWebsitePages } from './crawler.js';
import { analyzeWebsiteAndGenerateQueries } from './geminiService.js';
import { getAIProvider } from './providers/index.js';
import { analyzeSearchResponse } from './aiSearchAnalyzer.js';

// Clean and normalize URL
function normalizeUrl(urlStr: string): string {
  let cleaned = urlStr.trim();
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  try {
    const parsed = new URL(cleaned);
    return parsed.toString();
  } catch (err) {
    throw new AppError('Invalid website URL format', 400, 'INVALID_URL');
  }
}

// Generate an ID if needed
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  if (!input.companyName || input.companyName.trim().length === 0) {
    throw new AppError('Company name is required', 400, 'VALIDATION_ERROR');
  }
  if (!input.websiteUrl || input.websiteUrl.trim().length === 0) {
    throw new AppError('Website URL is required', 400, 'VALIDATION_ERROR');
  }

  const websiteUrl = normalizeUrl(input.websiteUrl);
  const db = getDb();
  const id = generateId('proj');
  const now = new Date().toISOString();

  const project: Project = {
    id,
    websiteUrl,
    companyName: input.companyName.trim(),
    industry: input.industry?.trim() || '',
    targetAudience: input.targetAudience?.trim() || '',
    targetMarket: input.targetMarket?.trim() || '',
    competitors: Array.isArray(input.competitors)
      ? input.competitors.map((c) => String(c).trim()).filter(Boolean)
      : [],
    status: input.status || 'active',
    createdAt: now,
    updatedAt: now
  };

  try {
    const docRef = doc(db, 'projects', id);
    await setDoc(docRef, project);
    return project;
  } catch (err: any) {
    console.error('[ProjectService] Failed to create project:', err);
    throw new AppError(`Failed to save project to Firestore: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

export async function listProjects(): Promise<Project[]> {
  const db = getDb();
  try {
    const collRef = collection(db, 'projects');
    const q = query(collRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const projects: Project[] = [];
    snapshot.forEach((d) => {
      projects.push(d.data() as Project);
    });
    return projects;
  } catch (err: any) {
    console.error('[ProjectService] Failed to list projects:', err);
    throw new AppError(`Failed to retrieve projects: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

export async function getProjectById(id: string): Promise<Project> {
  if (!id || id.trim().length === 0) {
    throw new AppError('Project ID is required', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  try {
    const docRef = doc(db, 'projects', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      throw new AppError(`Project with ID '${id}' not found`, 404, 'NOT_FOUND');
    }
    return snapshot.data() as Project;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[ProjectService] Failed to get project ${id}:`, err);
    throw new AppError(`Failed to retrieve project: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<Project> {
  const existing = await getProjectById(id);
  const db = getDb();

  const updates: Partial<Project> = {
    updatedAt: new Date().toISOString()
  };

  if (input.companyName !== undefined) {
    if (input.companyName.trim().length === 0) {
      throw new AppError('Company name cannot be empty', 400, 'VALIDATION_ERROR');
    }
    updates.companyName = input.companyName.trim();
  }

  if (input.websiteUrl !== undefined) {
    updates.websiteUrl = normalizeUrl(input.websiteUrl);
  }

  if (input.industry !== undefined) {
    updates.industry = input.industry.trim();
  }

  if (input.targetAudience !== undefined) {
    updates.targetAudience = input.targetAudience.trim();
  }

  if (input.targetMarket !== undefined) {
    updates.targetMarket = input.targetMarket.trim();
  }

  if (input.competitors !== undefined) {
    updates.competitors = Array.isArray(input.competitors)
      ? input.competitors.map((c) => String(c).trim()).filter(Boolean)
      : [];
  }

  if (input.status !== undefined) {
    if (!['active', 'archived', 'draft'].includes(input.status)) {
      throw new AppError(`Invalid status '${input.status}'. Must be active, archived, or draft`, 400, 'VALIDATION_ERROR');
    }
    updates.status = input.status;
  }

  try {
    const docRef = doc(db, 'projects', id);
    await updateDoc(docRef, updates);
    return { ...existing, ...updates };
  } catch (err: any) {
    console.error(`[ProjectService] Failed to update project ${id}:`, err);
    throw new AppError(`Failed to update project in Firestore: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

export async function createAnalysisRun(projectId: string): Promise<AnalysisRun> {
  // Ensure project exists first
  const project = await getProjectById(projectId);

  const db = getDb();
  const id = generateId('run');
  const now = new Date().toISOString();

  const run: AnalysisRun = {
    id,
    projectId,
    status: 'queued',
    startedAt: null,
    completedAt: null,
    error: null,
    progressStage: null,
    crawledPagesCount: 0,
    queriesCount: 0,
    createdAt: now
  };

  try {
    const docRef = doc(db, 'analysis_runs', id);
    await setDoc(docRef, run);

    // Trigger the Website Investigation Agent in the background
    executeInvestigationRun(id, project).catch((err) => {
      console.error(`[ProjectService] Background investigation failed for run ${id}:`, err);
    });

    return run;
  } catch (err: any) {
    console.error(`[ProjectService] Failed to create analysis run for project ${projectId}:`, err);
    throw new AppError(`Failed to save analysis run to Firestore: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

// Background investigation runner
export async function executeInvestigationRun(runId: string, project: Project): Promise<void> {
  const db = getDb();
  const runDocRef = doc(db, 'analysis_runs', runId);

  try {
    // 1. Transition to 'running' and stage 'crawling'
    await updateDoc(runDocRef, {
      status: 'running',
      startedAt: new Date().toISOString(),
      progressStage: 'crawling'
    });

    console.log(`[InvestigationAgent] Starting crawl for ${project.websiteUrl} (Run: ${runId})`);

    // 2. Safely crawl important publicly accessible pages
    const pages = await crawlWebsitePages(project.websiteUrl, 4);

    if (pages.length === 0) {
      throw new Error(`No accessible pages found or crawled for ${project.websiteUrl}`);
    }

    // 3. Persist crawled pages to Firestore
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageId = `${runId}_p_${i}`;
      const pageDoc: WebsitePage = {
        id: pageId,
        runId,
        projectId: project.id,
        url: page.url,
        title: page.title,
        description: page.description,
        headings: page.headings,
        contentSnippet: page.contentSnippet,
        statusCode: page.statusCode,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'website_pages', pageId), pageDoc);
    }

    // 4. Update progress to 'analyzing'
    await updateDoc(runDocRef, {
      progressStage: 'analyzing',
      crawledPagesCount: pages.length
    });

    console.log(`[InvestigationAgent] Crawled ${pages.length} pages. Analyzing with Gemini (Run: ${runId})`);

    // 5. Use Gemini server-side to extract business intelligence & generate 20–30 queries
    const analysisResult = await analyzeWebsiteAndGenerateQueries(project, pages);

    // 6. Update progress to 'generating_queries'
    await updateDoc(runDocRef, {
      progressStage: 'generating_queries'
    });

    // 7. Store WebsiteAnalysis in Firestore
    const analysisDoc: WebsiteAnalysis = {
      id: runId,
      runId,
      projectId: project.id,
      companyDescription: analysisResult.companyDescription,
      productsServices: analysisResult.productsServices,
      industryCategory: analysisResult.industryCategory,
      targetCustomers: analysisResult.targetCustomers,
      useCases: analysisResult.useCases,
      importantTopics: analysisResult.importantTopics,
      competitorsMentioned: analysisResult.competitorsMentioned,
      createdAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'website_analyses', runId), analysisDoc);

    // 8. Store generated SearchQuery documents in Firestore
    for (let i = 0; i < analysisResult.generatedQueries.length; i++) {
      const gq = analysisResult.generatedQueries[i];
      const queryId = `${runId}_q_${i + 1}`;
      const queryDoc: SearchQuery = {
        id: queryId,
        runId,
        projectId: project.id,
        query: gq.query,
        intent: gq.intent,
        buyerPersona: gq.buyerPersona,
        estimatedFunnelStage: gq.estimatedFunnelStage,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'search_queries', queryId), queryDoc);
    }

    await updateDoc(runDocRef, {
      queriesCount: analysisResult.generatedQueries.length
    });

    console.log(`[InvestigationAgent] Generated ${analysisResult.generatedQueries.length} queries. Starting AI Search Analysis layer (Run: ${runId})`);

    // 9. Execute Phase 4: AI Search Analysis layer
    await executeAISearchAnalysis(runId);
  } catch (err: any) {
    console.error(`[InvestigationAgent] Run ${runId} failed:`, err);
    try {
      await updateDoc(runDocRef, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        progressStage: 'failed',
        error: err.message || String(err)
      });
    } catch (saveErr) {
      console.error(`[InvestigationAgent] Failed to update run ${runId} to failed status:`, saveErr);
    }
  }
}

// Phase 4: AI Search Analysis Engine
export async function executeAISearchAnalysis(runId: string): Promise<void> {
  const db = getDb();
  const runDocRef = doc(db, 'analysis_runs', runId);

  const run = await getAnalysisRunById(runId);
  const project = await getProjectById(run.projectId);
  const queries = await getRunQueries(runId);
  const analysis = await getRunAnalysis(runId);

  if (queries.length === 0) {
    console.warn(`[AISearchAnalysis] No search queries found for run ${runId}`);
    await updateDoc(runDocRef, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      progressStage: 'completed'
    });
    return;
  }

  // Get existing AI search results to make execution resumable
  const existingResults = await getRunAISearchResults(runId);
  const completedMap = new Map<string, AISearchResult>();
  for (const res of existingResults) {
    if (res.status === 'completed' && res.responseText) {
      completedMap.set(res.queryId, res);
    }
  }

  const allCompetitors = Array.from(new Set([
    ...(project.competitors || []),
    ...(analysis?.competitorsMentioned || [])
  ]));

  await updateDoc(runDocRef, {
    status: 'running',
    progressStage: 'evaluating_ai_search',
    totalSearchQueriesCount: queries.length,
    completedSearchQueriesCount: completedMap.size
  });

  const provider = getAIProvider('gemini');
  let completedCount = completedMap.size;

  for (let i = 0; i < queries.length; i++) {
    const q = queries[i];
    if (completedMap.has(q.id)) {
      continue;
    }

    const resultId = `${runId}_res_${i + 1}`;

    try {
      console.log(`[AISearchAnalysis] (${i + 1}/${queries.length}) Evaluating: "${q.query.slice(0, 50)}..."`);
      const providerRes = await provider.evaluateQuery({
        query: q.query,
        brandName: project.companyName,
        websiteUrl: project.websiteUrl,
        competitors: allCompetitors,
        industry: project.industry || analysis?.industryCategory
      });

      const extracted = analyzeSearchResponse(
        providerRes.responseText,
        project.companyName,
        project.websiteUrl,
        allCompetitors
      );

      const resultDoc: AISearchResult = {
        id: resultId,
        runId,
        projectId: project.id,
        queryId: q.id,
        query: q.query,
        provider: providerRes.provider,
        model: providerRes.model,
        timestamp: providerRes.timestamp,
        responseText: providerRes.responseText,
        isSearchGrounded: providerRes.isSearchGrounded,
        brandMentioned: extracted.brandMentioned,
        brandRecommended: extracted.brandRecommended,
        competitorsMentioned: extracted.competitorsMentioned,
        recommendationContext: extracted.recommendationContext,
        citations: providerRes.citations,
        status: 'completed',
        error: null,
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'ai_search_results', resultId), resultDoc);
      completedCount++;

      await updateDoc(runDocRef, {
        completedSearchQueriesCount: completedCount,
        progressStage: 'evaluating_ai_search'
      });

      // Controlled throttle between queries to respect provider quotas
      await new Promise((r) => setTimeout(r, 650));
    } catch (queryErr: any) {
      console.error(`[AISearchAnalysis] Error evaluating query "${q.query}":`, queryErr.message || queryErr);
      const failedDoc: AISearchResult = {
        id: resultId,
        runId,
        projectId: project.id,
        queryId: q.id,
        query: q.query,
        provider: 'gemini',
        model: 'unknown',
        timestamp: new Date().toISOString(),
        responseText: '',
        isSearchGrounded: false,
        brandMentioned: false,
        brandRecommended: false,
        competitorsMentioned: [],
        recommendationContext: `Evaluation failed: ${queryErr.message || queryErr}`,
        citations: [],
        status: 'failed',
        error: queryErr.message || String(queryErr),
        createdAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'ai_search_results', resultId), failedDoc);
      completedCount++;

      await updateDoc(runDocRef, {
        completedSearchQueriesCount: completedCount
      });

      await new Promise((r) => setTimeout(r, 800));
    }
  }

  // Once all queries are done, mark run complete
  await updateDoc(runDocRef, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    progressStage: 'completed',
    completedSearchQueriesCount: completedCount,
    totalSearchQueriesCount: queries.length,
    queriesCount: queries.length
  });

  console.log(`[AISearchAnalysis] Successfully evaluated ${completedCount}/${queries.length} queries for run ${runId}`);
}

export async function getAnalysisRunById(id: string): Promise<AnalysisRun> {
  if (!id || id.trim().length === 0) {
    throw new AppError('Run ID is required', 400, 'VALIDATION_ERROR');
  }

  const db = getDb();
  try {
    const docRef = doc(db, 'analysis_runs', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      throw new AppError(`Analysis run with ID '${id}' not found`, 404, 'NOT_FOUND');
    }
    return snapshot.data() as AnalysisRun;
  } catch (err: any) {
    if (err instanceof AppError) throw err;
    console.error(`[ProjectService] Failed to get analysis run ${id}:`, err);
    throw new AppError(`Failed to retrieve analysis run: ${err.message || err}`, 500, 'FIRESTORE_ERROR');
  }
}

export async function getRunPages(runId: string): Promise<WebsitePage[]> {
  const db = getDb();
  try {
    const coll = collection(db, 'website_pages');
    const q = query(coll, where('runId', '==', runId));
    const snapshot = await getDocs(q);
    const pages: WebsitePage[] = [];
    snapshot.forEach((d) => pages.push(d.data() as WebsitePage));
    return pages;
  } catch (err: any) {
    console.error(`[ProjectService] Failed to get pages for run ${runId}:`, err);
    return [];
  }
}

export async function getRunAnalysis(runId: string): Promise<WebsiteAnalysis | null> {
  const db = getDb();
  try {
    const docRef = doc(db, 'website_analyses', runId);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) return null;
    return snapshot.data() as WebsiteAnalysis;
  } catch (err: any) {
    console.error(`[ProjectService] Failed to get analysis for run ${runId}:`, err);
    return null;
  }
}

export async function getRunQueries(runId: string): Promise<SearchQuery[]> {
  const db = getDb();
  try {
    const coll = collection(db, 'search_queries');
    const q = query(coll, where('runId', '==', runId));
    const snapshot = await getDocs(q);
    const queries: SearchQuery[] = [];
    snapshot.forEach((d) => queries.push(d.data() as SearchQuery));
    return queries;
  } catch (err: any) {
    console.error(`[ProjectService] Failed to get queries for run ${runId}:`, err);
    return [];
  }
}

export async function getRunAISearchResults(runId: string): Promise<AISearchResult[]> {
  const db = getDb();
  try {
    const coll = collection(db, 'ai_search_results');
    const q = query(coll, where('runId', '==', runId));
    const snapshot = await getDocs(q);
    const results: AISearchResult[] = [];
    snapshot.forEach((d) => results.push(d.data() as AISearchResult));
    // Sort by queryId ascending
    results.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    return results;
  } catch (err: any) {
    console.error(`[ProjectService] Failed to get AI search results for run ${runId}:`, err);
    return [];
  }
}

export async function getRunFullResults(runId: string) {
  const run = await getAnalysisRunById(runId);
  const [pages, analysis, queries, searchResults] = await Promise.all([
    getRunPages(runId),
    getRunAnalysis(runId),
    getRunQueries(runId),
    getRunAISearchResults(runId)
  ]);
  return { run, pages, analysis, queries, searchResults };
}
