// FENCO 2.0 — Gotchas Summary Generator
// Single batched LLM call to produce a "Before You Sign" summary.

import { callLlmJson } from '../../services/llmService';
import { query } from '../../db/connection';
import type { ScoredClause, Gotcha } from '../../types/index';

interface GotchasOutput {
  gotchas: Array<{
    title: string;
    explanation: string;
    riskLevel: string;
    relatedClauseIndex: number;
  }>;
}

const GOTCHAS_SCHEMA = {
  type: 'object',
  properties: {
    gotchas: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short, memorable title (5-8 words max)' },
          explanation: { type: 'string', description: 'Plain-English explanation for a non-lawyer (2-3 sentences). What does this risk mean in practice?' },
          riskLevel: { type: 'string', enum: ['Standard', 'Caution', 'Unfavorable'] },
          relatedClauseIndex: { type: 'number' },
        },
        required: ['title', 'explanation', 'riskLevel', 'relatedClauseIndex'],
      },
    },
  },
  required: ['gotchas'],
};

/**
 * Generate a "Before You Sign" gotchas summary from all flagged clauses.
 * Uses a single batched LLM call over all flagged clauses.
 */
export async function generateGotchasSummary(
  documentType: string,
  scoredClauses: ScoredClause[]
): Promise<Gotcha[]> {
  const flaggedClauses = scoredClauses.filter(
    c => c.riskLevel === 'Unfavorable' || c.riskLevel === 'Caution'
  );
  
  if (flaggedClauses.length === 0) {
    return [];
  }
  
  const clauseSummaries = flaggedClauses.map(c =>
    `[Clause ${c.clauseIndex}, ${c.clauseType}, Risk: ${c.riskLevel}]:\n${c.text.slice(0, 500)}`
  ).join('\n\n---\n\n');
  
  try {
    const result = await callLlmJson<GotchasOutput>({
      systemPrompt: `You are writing a "Before You Sign" risk summary for someone who has never worked with a lawyer. 

Your audience is a freelancer, tenant, or small business owner who needs to quickly understand the biggest risks in this contract. Write in plain English — no legalese. Focus on practical impact: "what does this actually mean for you?"

Each gotcha should have:
- A memorable, specific title (not generic like "High Risk Clause")
- A practical explanation of what the risk means in real life
- The risk level`,
      userPrompt: `This is a ${documentType} contract. Here are the flagged clauses:

${clauseSummaries}

Write a "Before You Sign" summary with a gotcha entry for each flagged clause. Make each title specific and memorable (e.g., "You Pay Even If They Mess Up" not just "Indemnification Issue").`,
      schema: GOTCHAS_SCHEMA,
    });
    
    return result.data.gotchas.map(g => ({
      title: g.title,
      explanation: g.explanation,
      riskLevel: g.riskLevel as Gotcha['riskLevel'],
      relatedClauseIndex: g.relatedClauseIndex,
    }));
    
  } catch (err) {
    console.warn(`[Gotchas] Generation failed: ${String(err)}`);
    // Fallback: generate simple gotchas from existing analysis
    return flaggedClauses.map(c => ({
      title: `${c.riskLevel}: ${c.clauseType}`,
      explanation: c.semanticDeltaExplanation,
      riskLevel: c.riskLevel,
      relatedClauseIndex: c.clauseIndex,
    }));
  }
}

/**
 * Persist generated gotchas to the database table.
 */
export async function persistGotchas(
  documentId: string,
  gotchas: Gotcha[]
): Promise<void> {
  // Clear any existing gotchas for this document first
  await query('DELETE FROM gotchas WHERE document_id = $1', [documentId]);

  for (const gotcha of gotchas) {
    await query(
      `INSERT INTO gotchas (document_id, title, explanation, risk_level, related_clause_index)
       VALUES ($1, $2, $3, $4, $5)`,
      [documentId, gotcha.title, gotcha.explanation, gotcha.riskLevel, gotcha.relatedClauseIndex]
    );
  }
}

/**
 * Fetch persisted gotchas from the database table.
 */
export async function getPersistedGotchas(documentId: string): Promise<Gotcha[]> {
  const result = await query<{
    title: string;
    explanation: string;
    risk_level: string;
    related_clause_index: number;
  }>(
    `SELECT title, explanation, risk_level, related_clause_index
     FROM gotchas
     WHERE document_id = $1
     ORDER BY created_at ASC`,
    [documentId]
  );

  return result.rows.map(r => ({
    title: r.title,
    explanation: r.explanation,
    riskLevel: r.risk_level as Gotcha['riskLevel'],
    relatedClauseIndex: r.related_clause_index,
  }));
}
