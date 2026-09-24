// FENCO 2.0 — Confidence Engine (§7.4)
// Computes a confidence score (0.0-1.0) for each scored clause.
// Combines: LLM self-reported confidence + fallback penalty + similarity margin.

export interface ConfidenceInput {
  llmSelfReportedConfidence: number;  // 0.0-1.0, from LLM output
  usedFallbackEmbedding: boolean;     // heavily penalizes confidence
  topSimilarityScore: number;         // best benchmark match score
  secondSimilarityScore?: number;     // second best (margin signal)
  stage1Only: boolean;                // resolved at Stage 1 without LLM
}

/**
 * Compute a composite confidence score.
 * 
 * Formula:
 *   confidence = llmConfidence * fallbackPenalty * marginSignal
 * 
 * Where:
 *   fallbackPenalty = 0.3 if fallback embedding used, else 1.0
 *   marginSignal = clamp(margin / 0.15, 0, 1) where margin = top - second
 *     A narrow margin (< 0.05 diff between top 2 matches) = low confidence
 *     A wide margin (> 0.15 diff) = high confidence
 *
 * Stage 1-only clauses (no LLM): confidence capped at 0.6 since only
 * similarity was used (no semantic analysis).
 */
export function computeConfidenceScore(input: ConfidenceInput): number {
  const fallbackPenalty = input.usedFallbackEmbedding ? 0.3 : 1.0;
  
  let marginSignal = 1.0;
  if (input.secondSimilarityScore !== undefined) {
    const margin = input.topSimilarityScore - input.secondSimilarityScore;
    marginSignal = Math.min(margin / 0.15, 1.0);
    marginSignal = Math.max(marginSignal, 0.1); // floor at 0.1
  }
  
  let confidence = input.llmSelfReportedConfidence * fallbackPenalty * marginSignal;
  
  // Stage 1-only clauses: cap at 0.6 (no LLM semantic analysis was run)
  if (input.stage1Only) {
    confidence = Math.min(confidence, 0.6);
  }
  
  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Determine confidence label for display.
 */
export function getConfidenceLabel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.7) return 'high';
  if (score >= 0.4) return 'medium';
  return 'low';
}
