import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess, AppError } from './apiResponse.js';
import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  createAnalysisRun,
  getAnalysisRunById,
  getRunPages,
  getRunAnalysis,
  getRunQueries,
  getRunFullResults,
  getRunAISearchResults,
  executeAISearchAnalysis
} from './projectService.js';

export const projectRouter = Router();

// POST /api/projects - Create a new project
projectRouter.post('/projects', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { websiteUrl, companyName, industry, targetAudience, targetMarket, competitors, status } = req.body;
    const project = await createProject({
      websiteUrl,
      companyName,
      industry,
      targetAudience,
      targetMarket,
      competitors,
      status
    });
    return sendSuccess(res, project, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects - List all projects
projectRouter.get('/projects', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const projects = await listProjects();
    return sendSuccess(res, projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:id - Get a single project
projectRouter.get('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const project = await getProjectById(req.params.id);
    return sendSuccess(res, project);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/projects/:id - Update project fields
projectRouter.patch('/projects/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { websiteUrl, companyName, industry, targetAudience, targetMarket, competitors, status } = req.body;
    const updated = await updateProject(req.params.id, {
      websiteUrl,
      companyName,
      industry,
      targetAudience,
      targetMarket,
      competitors,
      status
    });
    return sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects/:id/runs - Create an analysis run for a project
projectRouter.post('/projects/:id/runs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await createAnalysisRun(req.params.id);
    return sendSuccess(res, run, 201);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id - Get an analysis run by ID
projectRouter.get('/runs/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const run = await getAnalysisRunById(req.params.id);
    return sendSuccess(res, run);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id/results - Get full run results (run, pages, analysis, queries)
projectRouter.get('/runs/:id/results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await getRunFullResults(req.params.id);
    return sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id/pages - Get crawled pages for run
projectRouter.get('/runs/:id/pages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pages = await getRunPages(req.params.id);
    return sendSuccess(res, pages);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id/analysis - Get website analysis for run
projectRouter.get('/runs/:id/analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analysis = await getRunAnalysis(req.params.id);
    return sendSuccess(res, analysis);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id/queries - Get generated search queries for run
projectRouter.get('/runs/:id/queries', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const queries = await getRunQueries(req.params.id);
    return sendSuccess(res, queries);
  } catch (err) {
    next(err);
  }
});

// GET /api/runs/:id/ai-search-results - Get AI search evaluation results for run
projectRouter.get('/runs/:id/ai-search-results', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results = await getRunAISearchResults(req.params.id);
    return sendSuccess(res, results);
  } catch (err) {
    next(err);
  }
});

// POST /api/runs/:id/ai-search - Trigger or resume AI search analysis layer
projectRouter.post('/runs/:id/ai-search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const runId = req.params.id;
    // Execute in background and return immediate accepted status
    executeAISearchAnalysis(runId).catch((err) => {
      console.error(`[ProjectRoutes] AI Search Analysis failed for run ${runId}:`, err);
    });

    const run = await getAnalysisRunById(runId);
    return sendSuccess(res, {
      message: 'AI Search Analysis started',
      run
    }, 202);
  } catch (err) {
    next(err);
  }
});
