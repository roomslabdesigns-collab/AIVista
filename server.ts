import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { sendSuccess, AppError, errorHandler } from './server/apiResponse.js';
import { projectRouter } from './server/routes.js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Request logger
app.use((req: Request, _res: Response, next) => {
  const start = Date.now();
  const { method, url } = req;
  _res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[API] ${method} ${url} ${_res.statusCode} - ${duration}ms`);
  });
  next();
});

// GET /api/health
app.get('/api/health', (req: Request, res: Response) => {
  return sendSuccess(res, {
    status: 'healthy',
    service: 'AIVista — AI Search Revenue Agent API',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      provider: 'Firestore',
      status: 'configured'
    }
  });
});

// GET /api/config
app.get('/api/config', (req: Request, res: Response) => {
  return sendSuccess(res, {
    brandName: 'Relay CRM',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    aiEnabled: Boolean(process.env.GEMINI_API_KEY)
  });
});

// Mount project and analysis run routes
app.use('/api', projectRouter);

// 404 for unmatched API routes
app.all('/api/*', (req: Request, _res: Response, next) => {
  next(new AppError(`API endpoint not found: ${req.method} ${req.url}`, 404, 'NOT_FOUND'));
});

// Global error handler for API
app.use('/api', errorHandler);

async function start() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[AIVista Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

start().catch((err) => {
  console.error('[AIVista Server] Failed to start:', err);
  process.exit(1);
});
