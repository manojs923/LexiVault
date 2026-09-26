// FENCO 2.0 — Analysis Routes

import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../db/connection';
import { runScoringPipeline } from '../modules/scoring/scoringPipeline';
import { generateCounterDrafts } from '../modules/counterdraft/counterDraftGenerator';
import { generateGotchasSummary, persistGotchas, getPersistedGotchas } from '../modules/gotchas/gotchasGenerator';
import { createError } from '../middleware/errorHandler';
import { LEGAL_DISCLAIMER } from '../types/index';
import type { ScoredClause, AnalysisResult } from '../types/index';

const router = Router();

// POST /api/documents/:id/analyze
router.post('/:id/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    // Check document exists and is ingested
    const docResult = await query<{ status: string; document_type: string; reduced_accuracy_mode: boolean }>(
      'SELECT status, document_type, reduced_accuracy_mode FROM documents WHERE id = $1',
      [id]
    );
    
    if (docResult.rows.length === 0) return next(createError('Document not found', 404));
    
    const doc = docResult.rows[0];
    if (!['ingested', 'analyzed'].includes(doc.status)) {
      return next(createError(`Document is not ready for analysis. Current status: ${doc.status}`, 400));
    }
    
    // Run scoring pipeline
    const { clauses, stats } = await runScoringPipeline(id, doc.document_type as any);
    
    // Generate counter-drafts for flagged clauses
    await generateCounterDrafts(id, clauses);
    
    // Generate gotchas summary and persist to DB
    const gotchas = await generateGotchasSummary(doc.document_type, clauses);
    await persistGotchas(id, gotchas);
    
    res.json({
      status: 'analyzed',
      summary: {
        total: stats.total,
        standard: stats.standard,
        caution: stats.caution,
        unfavorable: stats.unfavorable,
        stage1SavedCount: stats.stage1Resolved,
      },
      disclaimer: LEGAL_DISCLAIMER,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/analysis
router.get('/:id/analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const docResult = await query<{
      id: string; status: string; document_type: string;
      reduced_accuracy_mode: boolean; original_name: string;
    }>(
      'SELECT id, status, document_type, reduced_accuracy_mode, original_name FROM documents WHERE id = $1',
      [id]
    );
    
    if (docResult.rows.length === 0) return next(createError('Document not found', 404));
    
    const doc = docResult.rows[0];
    if (doc.status !== 'analyzed') {
      return next(createError(`Analysis not yet complete. Status: ${doc.status}`, 400));
    }
    
    const clauseResult = await query<{
      id: string; clause_index: number; clause_type: string; text: string;
      risk_level: string; similarity_score: number; confidence_score: number;
      used_fallback_embedding: boolean; used_fallback_llm_model: string | null;
      semantic_delta_explanation: string; counter_draft: string | null;
      counter_draft_explanation: string | null; stage1_only: boolean;
    }>(
      `SELECT id, clause_index, clause_type, text, risk_level, similarity_score,
              confidence_score, used_fallback_embedding, used_fallback_llm_model,
              semantic_delta_explanation, counter_draft, counter_draft_explanation, stage1_only
       FROM clauses WHERE document_id = $1 ORDER BY clause_index`,
      [id]
    );
    
    const clauses: ScoredClause[] = clauseResult.rows.map(c => ({
      id: c.id,
      clauseIndex: c.clause_index,
      clauseType: c.clause_type,
      text: c.text,
      riskLevel: c.risk_level as any,
      similarityScore: c.similarity_score,
      confidenceScore: c.confidence_score,
      usedFallbackEmbedding: c.used_fallback_embedding,
      usedFallbackLlmModel: c.used_fallback_llm_model || undefined,
      semanticDeltaExplanation: c.semantic_delta_explanation,
      counterDraft: c.counter_draft || undefined,
      counterDraftExplanation: c.counter_draft_explanation || undefined,
      stage1Only: c.stage1_only,
    }));
    
    // Reconstruct gotchas from flagged clauses
    const flagged = clauses.filter(c => c.riskLevel !== 'Standard');
    
    const result: AnalysisResult = {
      documentId: id,
      documentType: doc.document_type as any,
      reducedAccuracyMode: doc.reduced_accuracy_mode,
      summary: {
        total: clauses.length,
        standard: clauses.filter(c => c.riskLevel === 'Standard').length,
        caution: clauses.filter(c => c.riskLevel === 'Caution').length,
        unfavorable: clauses.filter(c => c.riskLevel === 'Unfavorable').length,
        stage1SavedCount: clauses.filter(c => c.stage1Only).length,
      },
      clauses,
      gotchas: [], // Loaded separately via /gotchas endpoint
      disclaimer: LEGAL_DISCLAIMER,
    };
    
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/clauses
router.get('/:id/clauses', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const result = await query(
      `SELECT id, clause_index, clause_type, risk_level, confidence_score,
              similarity_score, stage1_only, used_fallback_embedding
       FROM clauses WHERE document_id = $1 ORDER BY clause_index`,
      [id]
    );
    
    res.json({ clauses: result.rows, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id/gotchas
router.get('/:id/gotchas', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Check if gotchas are already persisted in DB
    const existing = await getPersistedGotchas(id);
    if (existing.length > 0) {
      res.json({ gotchas: existing, disclaimer: LEGAL_DISCLAIMER });
      return;
    }
    
    const clauseResult = await query<{
      id: string; clause_index: number; clause_type: string; text: string;
      risk_level: string; confidence_score: number;
      semantic_delta_explanation: string; stage1_only: boolean;
      used_fallback_embedding: boolean;
    }>(
      `SELECT id, clause_index, clause_type, text, risk_level, confidence_score,
              semantic_delta_explanation, stage1_only, used_fallback_embedding
       FROM clauses
       WHERE document_id = $1 AND risk_level IN ('Caution', 'Unfavorable')
       ORDER BY 
         CASE risk_level WHEN 'Unfavorable' THEN 0 WHEN 'Caution' THEN 1 END,
         clause_index`,
      [id]
    );
    
    const scoredClauses = clauseResult.rows.map(c => ({
      id: c.id,
      clauseIndex: c.clause_index,
      clauseType: c.clause_type,
      text: c.text,
      riskLevel: c.risk_level as any,
      similarityScore: 0,
      confidenceScore: c.confidence_score,
      usedFallbackEmbedding: c.used_fallback_embedding,
      semanticDeltaExplanation: c.semantic_delta_explanation,
      stage1Only: c.stage1_only,
    }));
    
    const docResult = await query<{ document_type: string }>(
      'SELECT document_type FROM documents WHERE id = $1',
      [id]
    );
    
    const gotchas = await generateGotchasSummary(
      docResult.rows[0]?.document_type || 'other',
      scoredClauses
    );
    await persistGotchas(id, gotchas);
    
    res.json({ gotchas, disclaimer: LEGAL_DISCLAIMER });
  } catch (err) {
    next(err);
  }
});

export default router;
