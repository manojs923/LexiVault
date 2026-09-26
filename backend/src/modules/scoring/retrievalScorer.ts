// FENCO 2.0 — Stage 1 Retrieval Scorer
// Uses pgvector cosine similarity against the benchmark corpus.
// HNSW index ensures fast similarity search.
// Clauses below SIMILARITY_THRESHOLD are resolved at Stage 1 without LLM.

import { query } from '../../db/connection';
import { getEnv } from '../../config/env';
import type { DocumentType } from '../../types/index';

export interface BenchmarkMatch {
  benchmarkId: string;
  clauseType: string;
  benchmarkText: string;
  similarityScore: number;
}

export interface RetrievalResult {
  clauseId: string;
  embedding: number[];
  topMatches: BenchmarkMatch[];
  topSimilarity: number;
  secondSimilarity: number;
  needsStage2: boolean; // true if similarity >= threshold
}

/**
 * Stage 1: Find top-3 benchmark matches for each clause.
 * Returns whether Stage 2 LLM analysis is needed.
 */
export async function retrieveBenchmarkMatches(
  clauseId: string,
  embeddingVector: number[],
  documentType: DocumentType
): Promise<RetrievalResult> {
  const env = getEnv();
  
  // pgvector cosine similarity search using the halfvec-backed HNSW index.
  // The <=> operator computes cosine distance; 1 - distance = similarity.
  const result = await query<{
    id: string;
    clause_type: string;
    text: string;
    similarity: number;
  }>(
      `SELECT id, clause_type, text,
          1 - (embedding <=> $1::vector) as similarity
     FROM benchmark_clauses
     WHERE document_type = $2
       ORDER BY embedding <=> $1::vector
     LIMIT 3`,
    [
      `[${embeddingVector.join(',')}]`,
      documentType,
    ]
  );
  
  const matches = result.rows;
  
  if (matches.length === 0) {
    // No benchmark data for this document type — must go to Stage 2
    return {
      clauseId,
      embedding: embeddingVector,
      topMatches: [],
      topSimilarity: 0,
      secondSimilarity: 0,
      needsStage2: true,
    };
  }
  
  const topMatches: BenchmarkMatch[] = matches.map(m => ({
    benchmarkId: m.id,
    clauseType: m.clause_type,
    benchmarkText: m.text,
    similarityScore: m.similarity,
  }));
  
  const topSimilarity = topMatches[0]?.similarityScore ?? 0;
  const secondSimilarity = topMatches[1]?.similarityScore ?? 0;
  
  // Clauses with HIGH similarity to benchmark (>= threshold) are LIKELY STANDARD
  // but we need Stage 2 to confirm they're not deceptively similar
  // Clauses with LOW similarity are SUSPICIOUS — already mark as Caution at Stage 1
  // 
  // Note: The threshold logic is INVERTED from what you might expect:
  // LOW similarity = potentially risky (diverges from standard) = needs Stage 2 for explanation
  // HIGH similarity = likely standard = can skip Stage 2
  //
  // We use: similarity < threshold -> likely risky -> Stage 2
  //         similarity >= threshold -> likely standard -> Stage 1 resolution
  const needsStage2 = topSimilarity < env.SIMILARITY_THRESHOLD;
  
  return {
    clauseId,
    embedding: embeddingVector,
    topMatches,
    topSimilarity,
    secondSimilarity,
    needsStage2,
  };
}
