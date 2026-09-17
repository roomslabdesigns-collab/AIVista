import { Request, Response, NextFunction } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export class AppError extends Error {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: AppError | Error, statusCode?: number) {
  const isAppErr = error instanceof AppError;
  const status = statusCode || (isAppErr ? error.statusCode : 500);
  const code = isAppErr ? error.code : 'INTERNAL_SERVER_ERROR';

  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message: error.message || 'An unexpected error occurred',
      ...(isAppErr && error.details ? { details: error.details } : {})
    },
    timestamp: new Date().toISOString()
  };

  return res.status(status).json(payload);
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  console.error(`[Server Error] ${req.method} ${req.url}:`, err);
  sendError(res, err);
}
