// FENCO 2.0 — LLM-Based Clause Splitter (fallback)
// Used when regex splitting finds fewer than 3 clauses.

import { callLlmJson } from '../../services/llmService';
import type { RawClause } from './clauseSplitter';
import { truncateForLog } from '../../utils/index';

interface LlmClauseOutput {
  clauses: Array<{
    text: string;
    headingHint: string;
  }>;
}

/**
 * Use LLM to split a document into logical clauses.
 * Called only when regex splitting produces fewer than 3 clauses.
 */
export async function llmSplitClauses(documentText: string): Promise<RawClause[]> {
  console.log(`[ClauseSplitter] Regex found <3 clauses, using LLM fallback. Doc length: ${documentText.length}`);
  
  // Truncate for very long documents (keep first 8000 chars for splitting)
  const textForSplitting = documentText.slice(0, 8000);
  
  const schema = {
    type: 'object',
    properties: {
      clauses: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            text: { type: 'string' },
            headingHint: { type: 'string' },
          },
          required: ['text', 'headingHint'],
        },
      },
    },
    required: ['clauses'],
  };
  
  try {
    const result = await callLlmJson<LlmClauseOutput>({
      systemPrompt: `You are a legal document parser. Your task is to split contract text into individual logical clauses or sections. Each clause should be a self-contained provision with a clear topic. Preserve the original text of each clause exactly.`,
      userPrompt: `Split the following contract text into individual clauses. Return each clause's full text and a brief heading hint (e.g., "Payment Terms", "Termination", "Indemnification"):\n\n${textForSplitting}`,
      schema,
    });
    
    if (!result.data.clauses || result.data.clauses.length === 0) {
      throw new Error('LLM returned no clauses');
    }
    
    return result.data.clauses.map((clause, i) => ({
      index: i,
      text: clause.text.trim(),
      headingHint: clause.headingHint,
    }));
  } catch (err) {
    console.warn(`[ClauseSplitter] LLM splitting failed: ${truncateForLog(String(err))}. Using whole document as one clause.`);
    // Final fallback: whole document as one clause
    return [{ index: 0, text: documentText.trim(), headingHint: 'Full Document' }];
  }
}
