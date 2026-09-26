// FENCO 2.0 — Global Error Handler Middleware
// Never leaks internal error detail to the client.

import { Request, Response, NextFunction } from 'express';
import { truncateForLog } from '../utils/index';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export function createError(message: string, statusCode = 500): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.isOperational = true;
  return err;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  
  // Log internally
  console.error(`[ERROR] ${req.method} ${req.path} (${statusCode}):`, err.message || err);
  if (err.stack) {
    console.error(err.stack);
  }
  
  // In development, return the actual error message to diagnose issues immediately
  const isDev = process.env.NODE_ENV !== 'production';
  const clientMessage = (err.isOperational || isDev)
    ? err.message
    : 'An unexpected error occurred. Please try again.';
  
  res.status(statusCode).json({
    error: clientMessage,
    requestId: req.headers['x-request-id'] || 'unknown',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: `Route ${req.path} not found` });
}
