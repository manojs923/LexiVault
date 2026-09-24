// FENCO 2.0 — Comparison Routes (§7A)

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { runComparison, getComparison } from '../modules/comparison/comparisonService';
import { validateBody } from '../middleware/validation';
import { createError } from '../middleware/errorHandler';

const router = Router();

const createComparisonSchema = z.object({
  documentAId: z.string().uuid('documentAId must be a valid UUID'),
  documentBId: z.string().uuid('documentBId must be a valid UUID'),
}).refine(data => data.documentAId !== data.documentBId, {
  message: 'documentAId and documentBId must be different documents',
});

// POST /api/comparisons
router.post('/',
  validateBody(createComparisonSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run comparison in background
      const { documentAId, documentBId } = req.body;
      
      // Start async - return comparison ID immediately
      const result = await runComparison(documentAId, documentBId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/comparisons/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await getComparison(req.params.id);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'Comparison not found') {
      return next(createError('Comparison not found', 404));
    }
    next(err);
  }
});

export default router;
