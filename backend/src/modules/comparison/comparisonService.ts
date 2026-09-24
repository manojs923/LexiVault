// FENCO 2.0 — Document Comparison Service (§7A)
// Compares two uploaded documents against each other (not just against benchmark).
// Uses the same embedding + pgvector machinery as benchmark matching.
// Provider: Google Gemini (via @google/genai)
// Last verified: 2026-09-22

import { query } from '../../db/connection';
import { callLlmJson, callLlm } from '../../services/llmService';
import { getEnv } from '../../config/env';
import { LEGAL_DISCLAIMER } from '../../types/index';
import { sleep } from '../../utils/index';
import type { MoreFavorable } from '../../types/index';

interface ClauseData {
  id: string;
  clauseIndex: number;
  clauseType: string;
  text: string;
}

interface MatchedPair {
  clauseA: ClauseData;
  clauseB: ClauseData;
  similarity: number;
}

export interface PairDifferenceResult {
  pairId: string;
  clauseAId: string;
  clauseBId: string;
  clauseType: string;
  differenceExplanation: string;
  moreFavorable: MoreFavorable;
}

export interface ComparisonOutput {
  id: string;
  documentAId: string;
  documentBId: string;
  summary: string;
  matchedPairs: PairDifferenceResult[];
  onlyInDocumentA: ClauseData[];
  onlyInDocumentB: ClauseData[];
  disclaimer: string;
  createdAt: Date;
}

const DIFFERENCE_SCHEMA = {
  type: 'object',
  properties: {
    differenceExplanation: {
      type: 'string',
      description: 'Plain-English explanation of the material differences (2-4 sentences)',
    },
    moreFavorable: {
      type: 'string',
      enum: ['document_a', 'document_b', 'neither', 'depends'],
    },
  },
  required: ['differenceExplanation', 'moreFavorable'],
};

/**
 * Run a document-to-document comparison.
 * Matches clauses between two documents using embedding similarity.
 */
export async function runComparison(
  documentAId: string,
  documentBId: string
): Promise<ComparisonOutput> {
  const env = getEnv();
  const MATCH_THRESHOLD = env.COMPARISON_MATCH_THRESHOLD;
  
  // Verify both documents exist and are ingested
  for (const docId of [documentAId, documentBId]) {
    const result = await query<{ status: string }>(
      'SELECT status FROM documents WHERE id = $1',
      [docId]
    );
    if (result.rows.length === 0) throw new Error(`Document not found: ${docId}`);
    if (!['ingested', 'analyzed'].includes(result.rows[0].status)) {
      throw new Error(`Document ${docId} is not ready (status: ${result.rows[0].status})`);
    }
  }
  
  // Create comparison record
  const compResult = await query<{ id: string }>(
    'INSERT INTO comparisons (document_a_id, document_b_id) VALUES ($1, $2) RETURNING id',
    [documentAId, documentBId]
  );
  const comparisonId = compResult.rows[0].id;
  
  // Fetch all clauses from both documents
  const fetchClauses = async (docId: string): Promise<(ClauseData & { embedding: string })[]> => {
    const result = await query<{
      id: string; clause_index: number; clause_type: string;
      text: string; embedding: string;
    }>(
      `SELECT id, clause_index, clause_type, text, embedding::text
       FROM clauses WHERE document_id = $1 AND embedding IS NOT NULL
       ORDER BY clause_index`,
      [docId]
    );
    return result.rows.map(r => ({
      id: r.id,
      clauseIndex: r.clause_index,
      clauseType: r.clause_type,
      text: r.text,
      embedding: r.embedding,
    }));
  };
  
  const [clausesA, clausesB] = await Promise.all([
    fetchClauses(documentAId),
    fetchClauses(documentBId),
  ]);
  
  // Match clauses between documents using pgvector similarity
  const matchedPairs: MatchedPair[] = [];
  const matchedAIds = new Set<string>();
  const matchedBIds = new Set<string>();
  
  for (const clauseA of clausesA) {
    if (!clauseA.embedding) continue;
    
    // Find best matching clause in doc B
    const matchResult = await query<{
      id: string; clause_index: number; clause_type: string;
      text: string; similarity: number;
    }>(
      `SELECT id, clause_index, clause_type, text,
              1 - (embedding <=> $1::vector) as similarity
       FROM clauses
       WHERE document_id = $2
         AND embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      [clauseA.embedding, documentBId]
    );
    
    if (matchResult.rows.length > 0 && matchResult.rows[0].similarity >= MATCH_THRESHOLD) {
      const clauseB = matchResult.rows[0];
      matchedPairs.push({
        clauseA: { id: clauseA.id, clauseIndex: clauseA.clauseIndex, clauseType: clauseA.clauseType, text: clauseA.text },
        clauseB: { id: clauseB.id, clauseIndex: clauseB.clause_index, clauseType: clauseB.clause_type, text: clauseB.text },
        similarity: clauseB.similarity,
      });
      matchedAIds.add(clauseA.id);
      matchedBIds.add(clauseB.id);
    }
  }
  
  const onlyInDocumentA: ClauseData[] = clausesA
    .filter(c => !matchedAIds.has(c.id))
    .map(c => ({ id: c.id, clauseIndex: c.clauseIndex, clauseType: c.clauseType, text: c.text }));
  
  const onlyInDocumentB: ClauseData[] = clausesB
    .filter(c => !matchedBIds.has(c.id))
    .map(c => ({ id: c.id, clauseIndex: c.clauseIndex, clauseType: c.clauseType, text: c.text }));
  
  // Generate difference explanations for matched pairs
  const pairResults: PairDifferenceResult[] = [];
  
  for (const pair of matchedPairs) {
    try {
      const result = await callLlmJson<{ differenceExplanation: string; moreFavorable: MoreFavorable }>({
        systemPrompt: `You are comparing two versions of the same contract clause to help a user understand which is more favorable to them (the party signing/receiving the contract, not the drafter).

Be specific about material differences. Focus on practical impact for the signing party.`,
        userPrompt: `Compare these two ${pair.clauseA.clauseType} clauses:

**Document A - Clause ${pair.clauseA.clauseIndex}:**
${pair.clauseA.text.slice(0, 1500)}

**Document B - Clause ${pair.clauseB.clauseIndex}:**
${pair.clauseB.text.slice(0, 1500)}

Explain the material differences in plain English and state which is more favorable to the signing party (document_a, document_b, neither, or depends on circumstances).`,
        schema: DIFFERENCE_SCHEMA,
      });
      
      // Save to DB
      const pairDbResult = await query<{ id: string }>(
        `INSERT INTO comparison_clause_pairs
          (comparison_id, clause_a_id, clause_b_id, clause_type, difference_explanation, more_favorable)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [
          comparisonId,
          pair.clauseA.id,
          pair.clauseB.id,
          pair.clauseA.clauseType,
          result.data.differenceExplanation,
          result.data.moreFavorable,
        ]
      );
      
      pairResults.push({
        pairId: pairDbResult.rows[0].id,
        clauseAId: pair.clauseA.id,
        clauseBId: pair.clauseB.id,
        clauseType: pair.clauseA.clauseType,
        differenceExplanation: result.data.differenceExplanation,
        moreFavorable: result.data.moreFavorable,
      });
      
      await sleep(300); // rate limit
    } catch (err) {
      console.warn(`[Comparison] Failed to analyze pair: ${String(err)}`);
    }
  }
  
  // Save one-sided clauses to DB
  for (const clause of onlyInDocumentA) {
    await query(
      `INSERT INTO comparison_clause_pairs
        (comparison_id, clause_a_id, clause_type, only_in_document)
       VALUES ($1, $2, $3, $4)`,
      [comparisonId, clause.id, clause.clauseType, 'document_a']
    );
  }
  
  for (const clause of onlyInDocumentB) {
    await query(
      `INSERT INTO comparison_clause_pairs
        (comparison_id, clause_b_id, clause_type, only_in_document)
       VALUES ($1, $2, $3, $4)`,
      [comparisonId, clause.id, clause.clauseType, 'document_b']
    );
  }
  
  // Generate overall summary
  const summaryContext = [
    matchedPairs.length > 0 ? `${matchedPairs.length} matching clause types found.` : 'No matching clauses found.',
    onlyInDocumentA.length > 0 ? `Document A has ${onlyInDocumentA.length} unique clauses: ${onlyInDocumentA.map(c => c.clauseType).join(', ')}.` : '',
    onlyInDocumentB.length > 0 ? `Document B has ${onlyInDocumentB.length} unique clauses: ${onlyInDocumentB.map(c => c.clauseType).join(', ')}.` : '',
    pairResults.length > 0 ? `Favorability breakdown: ${pairResults.filter(p => p.moreFavorable === 'document_a').length} favor Doc A, ${pairResults.filter(p => p.moreFavorable === 'document_b').length} favor Doc B.` : '',
  ].filter(Boolean).join(' ');
  
  const summaryResult = await callLlm({
    systemPrompt: 'Provide a brief, plain-English overall comparison summary for a non-lawyer. 2-3 sentences maximum.',
    userPrompt: `Based on this comparison data, which document is overall more favorable to the signing party and why?\n\n${summaryContext}`,
    maxTokens: 300,
  });
  
  const summary = summaryResult.content;
  
  // Save summary
  await query(
    'UPDATE comparisons SET summary = $1 WHERE id = $2',
    [summary, comparisonId]
  );
  
  return {
    id: comparisonId,
    documentAId,
    documentBId,
    summary,
    matchedPairs: pairResults,
    onlyInDocumentA,
    onlyInDocumentB,
    disclaimer: LEGAL_DISCLAIMER,
    createdAt: new Date(),
  };
}

/**
 * Fetch a stored comparison result.
 */
export async function getComparison(comparisonId: string): Promise<ComparisonOutput> {
  const compResult = await query<{
    id: string; document_a_id: string; document_b_id: string;
    summary: string; created_at: Date;
  }>(
    'SELECT id, document_a_id, document_b_id, summary, created_at FROM comparisons WHERE id = $1',
    [comparisonId]
  );
  
  if (compResult.rows.length === 0) throw new Error('Comparison not found');
  const comp = compResult.rows[0];
  
  const pairsResult = await query<{
    id: string; clause_a_id: string | null; clause_b_id: string | null;
    clause_type: string; difference_explanation: string | null;
    more_favorable: string | null; only_in_document: string | null;
  }>(
    `SELECT ccp.id, ccp.clause_a_id, ccp.clause_b_id, ccp.clause_type,
            ccp.difference_explanation, ccp.more_favorable, ccp.only_in_document,
            ca.text as text_a, ca.clause_index as index_a,
            cb.text as text_b, cb.clause_index as index_b
     FROM comparison_clause_pairs ccp
     LEFT JOIN clauses ca ON ccp.clause_a_id = ca.id
     LEFT JOIN clauses cb ON ccp.clause_b_id = cb.id
     WHERE ccp.comparison_id = $1`,
    [comparisonId]
  );
  
  const matchedPairs: PairDifferenceResult[] = [];
  const onlyInDocumentA: ClauseData[] = [];
  const onlyInDocumentB: ClauseData[] = [];
  
  for (const row of pairsResult.rows) {
    if (row.only_in_document === 'document_a' && row.clause_a_id) {
      onlyInDocumentA.push({
        id: row.clause_a_id,
        clauseIndex: (row as any).index_a,
        clauseType: row.clause_type,
        text: (row as any).text_a || '',
      });
    } else if (row.only_in_document === 'document_b' && row.clause_b_id) {
      onlyInDocumentB.push({
        id: row.clause_b_id,
        clauseIndex: (row as any).index_b,
        clauseType: row.clause_type,
        text: (row as any).text_b || '',
      });
    } else if (row.clause_a_id && row.clause_b_id) {
      matchedPairs.push({
        pairId: row.id,
        clauseAId: row.clause_a_id,
        clauseBId: row.clause_b_id,
        clauseType: row.clause_type,
        differenceExplanation: row.difference_explanation || '',
        moreFavorable: (row.more_favorable || 'depends') as MoreFavorable,
      });
    }
  }
  
  return {
    id: comp.id,
    documentAId: comp.document_a_id,
    documentBId: comp.document_b_id,
    summary: comp.summary,
    matchedPairs,
    onlyInDocumentA,
    onlyInDocumentB,
    disclaimer: LEGAL_DISCLAIMER,
    createdAt: comp.created_at,
  };
}
