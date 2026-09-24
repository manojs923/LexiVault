// FENCO 2.0 — Unit Tests: Composite Confidence Engine (§7.4)

import { computeConfidenceScore, getConfidenceLabel } from '../../src/modules/confidence/confidenceEngine';

describe('Confidence Engine', () => {
  it('computes high confidence for high LLM confidence with primary embeddings and wide similarity margin', () => {
    const score = computeConfidenceScore({
      llmSelfReportedConfidence: 0.95,
      usedFallbackEmbedding: false,
      topSimilarityScore: 0.88,
      secondSimilarityScore: 0.65, // wide margin: 0.23 > 0.15
      stage1Only: false,
    });

    expect(score).toBeGreaterThanOrEqual(0.85);
    expect(getConfidenceLabel(score)).toBe('high');
  });

  it('heavily penalizes confidence when fallback embeddings are used', () => {
    const score = computeConfidenceScore({
      llmSelfReportedConfidence: 0.90,
      usedFallbackEmbedding: true, // triggers 0.3x multiplier
      topSimilarityScore: 0.70,
      secondSimilarityScore: 0.50,
      stage1Only: false,
    });

    // 0.9 * 0.3 * 1.0 = 0.27
    expect(score).toBeLessThan(0.35);
    expect(getConfidenceLabel(score)).toBe('low');
  });

  it('reduces confidence when top similarity margin is narrow (ambiguous match)', () => {
    const highMarginScore = computeConfidenceScore({
      llmSelfReportedConfidence: 0.90,
      usedFallbackEmbedding: false,
      topSimilarityScore: 0.80,
      secondSimilarityScore: 0.60, // margin 0.20
      stage1Only: false,
    });

    const lowMarginScore = computeConfidenceScore({
      llmSelfReportedConfidence: 0.90,
      usedFallbackEmbedding: false,
      topSimilarityScore: 0.80,
      secondSimilarityScore: 0.78, // narrow margin: 0.02
      stage1Only: false,
    });

    expect(lowMarginScore).toBeLessThan(highMarginScore);
  });

  it('caps confidence at 0.6 for Stage 1 only resolutions without LLM analysis', () => {
    const score = computeConfidenceScore({
      llmSelfReportedConfidence: 1.0,
      usedFallbackEmbedding: false,
      topSimilarityScore: 0.90,
      secondSimilarityScore: 0.60,
      stage1Only: true,
    });

    expect(score).toBeLessThanOrEqual(0.60);
  });
});
