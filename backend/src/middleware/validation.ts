// FENCO 2.0 — Request Validation Middleware

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { createError } from './errorHandler';

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(createError(`Validation error: ${result.error.issues.map(i => i.message).join(', ')}`, 400));
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      next(createError(`Invalid parameters: ${result.error.issues.map(i => i.message).join(', ')}`, 400));
      return;
    }
    next();
  };
}

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid document ID format'),
});

export const comparisonParamSchema = z.object({
  id: z.string().uuid('Invalid comparison ID format'),
});
