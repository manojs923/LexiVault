// FENCO 2.0 — Q&A Routes (§7B)

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { answerQuestion, getSessionHistory } from '../modules/qa/qaService';
import { validateBody } from '../middleware/validation';
import { createError } from '../middleware/errorHandler';

const router = Router();

const askSchema = z.object({
  question: z.string().min(5, 'Question must be at least 5 characters').max(1000, 'Question too long'),
  sessionId: z.string().uuid().optional(),
});

// POST /api/documents/:id/ask
router.post('/:id/ask',
  validateBody(askSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await answerQuestion(
        req.params.id,
        req.body.question,
        req.body.sessionId || req.sessionId
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/documents/:id/qa-sessions/:sessionId
router.get('/:id/qa-sessions/:sessionId',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await getSessionHistory(req.params.sessionId, req.params.id);
      res.json(result);
    } catch (err) {
      if (err instanceof Error && err.message === 'Session not found') {
        return next(createError('Session not found', 404));
      }
      next(err);
    }
  }
);

export default router;
