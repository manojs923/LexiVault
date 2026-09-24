// FENCO 2.0 — Scoring Pipeline Orchestrator
// Runs Stage 1 (retrieval) and Stage 2 (LLM) for all clauses in a document.

import { query } from '../../db/connection';
import { getEnv } from '../../config/env';
import { embedText } from '../../services/embeddingService';
import { retrieveBenchmarkMatches } from './retrievalScorer';
import { classifySemanticRisk } from './semanticDeltaScorer';
import { computeConfidenceScore } from '../confidence/confidenceEngine';
import { sleep } from '../../utils/index';
import type { DocumentType, ScoredClause, RiskLevel } from '../../types/index';

export interface ScoringStats {
  total: number;
  stage1Resolved: number; // saved from LLM
  stage2Analyzed: number;
  standard: number;
  caution: number;
  unfavorable: number;
  anyFallback: boolean;
}

/**
 * Run the full two-stage scoring pipeline for a document.
 */
export async function runScoringPipeline(
  documentId: string,
  documentType: DocumentType
): Promise<{ clauses: ScoredClause[]; stats: ScoringStats }> {
  const env = getEnv();
  
  // Update status
  await query(
    'UPDATE documents SET status = $1, updated_at = NOW() WHERE id = $2',
    ['analyzing', documentId]
  );
  
  // Fetch all clauses for this document
  const clauseResult = await query<{
    id: string;
    clause_index: number;
    clause_type: string;
    text: string;
    embedding: string;
    used_fallback_embedding: boolean;
  }>(
    `SELECT id, clause_index, clause_type, text, 
            embedding::text, used_fallback_embedding
     FROM clauses
     WHERE document_id = $1
     ORDER BY clause_index`,
    [documentId]
  );
  
  const clauses = clauseResult.rows;
  const stats: ScoringStats = {
    total: clauses.length,
    stage1Resolved: 0,
    stage2Analyzed: 0,
    standard: 0,
    caution: 0,
    unfavorable: 0,
    anyFallback: false,
  };
  
  const scoredClauses: ScoredClause[] = [];
  
  for (const clause of clauses) {
    // Parse embedding from PostgreSQL vector format
    let embedding: number[];
    try {
      embedding = JSON.parse(clause.embedding.replace(/^\[/, '[').replace(/\]$/, ']'));
    } catch {
      // Re-embed if parsing fails
      const embedResult = await embedText(clause.text);
      embedding = embedResult.embedding;
    }
    
    // Stage 1: Retrieval
    const retrieval = await retrieveBenchmarkMatches(
      clause.id,
      embedding,
      documentType
    );
    
    let riskLevel: RiskLevel;
    let explanation: string;
    let selfConfidence: number;
    let modelUsed: string | undefined;
    let usedFallbackLlm = false;
    let stage1Only: boolean;
    
    if (!retrieval.needsStage2) {
      // Stage 1 resolution: high similarity = likely standard
      riskLevel = 'Standard';
      explanation = `This clause closely matches market-standard language (similarity: ${(retrieval.topSimilarity * 100).toFixed(0)}%). No significant concerns identified.`;
      selfConfidence = 0.8; // moderate confidence for Stage 1 only
      stage1Only = true;
      stats.stage1Resolved++;
      console.log(`[Scoring] Clause ${clause.clause_index}: Stage 1 → Standard (similarity: ${retrieval.topSimilarity.toFixed(3)})`);
    } else {
      // Stage 2: LLM analysis
      const benchmarkText = retrieval.topMatches[0]?.benchmarkText || '';
      const semanticResult = await classifySemanticRisk(
        clause.text,
        benchmarkText,
        clause.clause_type
      );
      
      riskLevel = semanticResult.riskLevel;
      explanation = semanticResult.explanation;
      selfConfidence = semanticResult.selfReportedConfidence;
      modelUsed = semanticResult.modelUsed;
      usedFallbackLlm = semanticResult.usedFallback;
      stage1Only = false;
      stats.stage2Analyzed++;
      
      if (usedFallbackLlm) stats.anyFallback = true;
      
      console.log(`[Scoring] Clause ${clause.clause_index}: Stage 2 → ${riskLevel} (model: ${modelUsed})`);
      
      // Respect rate limits between Stage 2 calls
      await sleep(200);
    }
    
    if (clause.used_fallback_embedding) stats.anyFallback = true;
    
    // Compute composite confidence score
    const confidenceScore = computeConfidenceScore({
      llmSelfReportedConfidence: selfConfidence,
      usedFallbackEmbedding: clause.used_fallback_embedding,
      topSimilarityScore: retrieval.topSimilarity,
      secondSimilarityScore: retrieval.secondSimilarity,
      stage1Only,
    });
    
    // Update stats
    if (riskLevel === 'Standard') stats.standard++;
    else if (riskLevel === 'Caution') stats.caution++;
    else stats.unfavorable++;
    
    // Persist scoring results
    await query(
      `UPDATE clauses SET
         risk_level = $1,
         similarity_score = $2,
         confidence_score = $3,
         semantic_delta_explanation = $4,
         top_benchmark_match_id = $5,
         stage1_only = $6,
         used_fallback_llm_model = $7
       WHERE id = $8`,
      [
        riskLevel,
        retrieval.topSimilarity,
        confidenceScore,
        explanation,
        retrieval.topMatches[0]?.benchmarkId || null,
        stage1Only,
        modelUsed || null,
        clause.id,
      ]
    );
    
    scoredClauses.push({
      id: clause.id,
      clauseIndex: clause.clause_index,
      clauseType: clause.clause_type,
      text: clause.text,
      riskLevel,
      similarityScore: retrieval.topSimilarity,
      confidenceScore,
      usedFallbackEmbedding: clause.used_fallback_embedding,
      usedFallbackLlmModel: modelUsed,
      semanticDeltaExplanation: explanation,
      stage1Only,
    });
  }
  
  // Update document with final status and reduced_accuracy_mode
  await query(
    `UPDATE documents SET 
       status = $1, 
       reduced_accuracy_mode = $2, 
       updated_at = NOW()
     WHERE id = $3`,
    ['analyzed', stats.anyFallback, documentId]
  );
  
  console.log(`[Scoring] Pipeline complete. Total: ${stats.total}, Stage1: ${stats.stage1Resolved}, Stage2: ${stats.stage2Analyzed}`);
  console.log(`[Scoring] Cost savings: ${stats.total > 0 ? ((stats.stage1Resolved / stats.total) * 100).toFixed(0) : 0}% of clauses skipped LLM call`);
  
  return { clauses: scoredClauses, stats };
}
