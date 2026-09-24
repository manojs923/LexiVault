// FENCO 2.0 — Attorney-Prep Checklist Routes (§7C)

import { Router, Request, Response, NextFunction } from 'express';
import { generateDocumentChecklist, generateComparisonChecklist } from '../modules/checklist/checklistService';
import { createError } from '../middleware/errorHandler';

const router = Router();

// GET /api/documents/:id/attorney-checklist
router.get('/documents/:id/attorney-checklist',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await generateDocumentChecklist(req.params.id);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'Document not found') {
        return next(createError('Document not found', 404));
      }
      next(err);
    }
  }
);

// GET /api/comparisons/:id/attorney-checklist
router.get('/comparisons/:id/attorney-checklist',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await generateComparisonChecklist(req.params.id);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'Comparison not found') {
        return next(createError('Comparison not found', 404));
      }
      next(err);
    }
  }
);

export default router;
