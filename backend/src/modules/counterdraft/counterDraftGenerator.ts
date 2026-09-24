// FENCO 2.0 — Counter-Draft Generator
// Generates fairer alternative clauses for flagged (Unfavorable/Caution) clauses.

import { callLlmJson } from '../../services/llmService';
import { query } from '../../db/connection';
import { getEnv } from '../../config/env';
import { sleep, truncateForLog } from '../../utils/index';
import type { ScoredClause, RiskLevel } from '../../types/index';

interface CounterDraftOutput {
  counterDraft: string;
  explanation: string;
}

const COUNTER_DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    counterDraft: {
      type: 'string',
      description: 'The rewritten clause text, ready to propose to the other party',
    },
    explanation: {
      type: 'string',
      description: 'Plain-English explanation of what was changed and why it is still commercially reasonable for both sides (2-3 sentences)',
    },
  },
  required: ['counterDraft', 'explanation'],
};

/**
 * Generate counter-drafts for the top N flagged clauses.
 * Processes Unfavorable clauses first, then Caution.
 */
export async function generateCounterDrafts(
  documentId: string,
  scoredClauses: ScoredClause[]
): Promise<void> {
  const env = getEnv();
  
  // Sort: Unfavorable first, then Caution
  const flaggedClauses = scoredClauses
    .filter(c => c.riskLevel === 'Unfavorable' || c.riskLevel === 'Caution')
    .sort((a, b) => {
      const priority = { Unfavorable: 0, Caution: 1, Standard: 2 } as Record<RiskLevel, number>;
      return priority[a.riskLevel] - priority[b.riskLevel];
    })
    .slice(0, env.MAX_COUNTER_DRAFTS);
  
  console.log(`[CounterDraft] Generating for ${flaggedClauses.length} flagged clauses`);
  
  for (const clause of flaggedClauses) {
    try {
      const result = await callLlmJson<CounterDraftOutput>({
        systemPrompt: `You are a legal drafting assistant helping freelancers, tenants, and small business owners negotiate fairer contract terms. 

Your task is to rewrite a problematic contract clause into a fairer version that:
1. Addresses the specific risk identified
2. Is still commercially reasonable for BOTH parties (not just one-sided in the other direction)
3. Uses clear, plain language wherever possible
4. Preserves the legitimate business purpose of the original clause`,
        userPrompt: `Rewrite this ${clause.clauseType} clause to make it fairer.

**Current clause (Risk: ${clause.riskLevel}):**
${clause.text.slice(0, 2000)}

**What makes it problematic:**
${clause.semanticDeltaExplanation}

Write a fairer counter-draft and explain what you changed and why it remains commercially reasonable for both parties.`,
        schema: COUNTER_DRAFT_SCHEMA,
      });
      
      // Save counter-draft to DB
      await query(
        `UPDATE clauses 
         SET counter_draft = $1, counter_draft_explanation = $2
         WHERE id = $3`,
        [result.data.counterDraft, result.data.explanation, clause.id]
      );
      
      clause.counterDraft = result.data.counterDraft;
      clause.counterDraftExplanation = result.data.explanation;
      
      console.log(`[CounterDraft] Generated for clause ${clause.clauseIndex} (${clause.clauseType})`);
      
      // Rate limit between calls
      await sleep(500);
      
    } catch (err) {
      console.warn(`[CounterDraft] Failed for clause ${clause.clauseIndex}: ${truncateForLog(String(err))}`);
    }
  }
}
