// FENCO 2.0 — Attorney-Prep Checklist Service (§7C)
// Generates a structured "Prep for Your Lawyer" checklist.
// This is NOT just a view of the gotchas list — it's a distinct artifact
// with concrete questions and information-gathering guidance.
// Provider: Google Gemini (via @google/genai)
// Last verified: 2026-09-22

import { query } from '../../db/connection';
import { callLlmJson } from '../../services/llmService';
import { LEGAL_DISCLAIMER } from '../../types/index';
import type { AttorneyChecklist, AttorneyChecklistItem } from '../../types/index';

interface ChecklistItemOutput {
  clauseIndex: number;
  clauseType: string;
  riskLevel: string;
  whyItMatters: string;
  questionsToAsk: string[];
  documentsToGather: string[];
}

interface ChecklistOutput {
  summary: string;
  flaggedItems: ChecklistItemOutput[];
}

const CHECKLIST_SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'string',
      description: 'Brief 2-3 sentence plain-English summary of the document and its main concerns',
    },
    flaggedItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          clauseIndex: { type: 'number' },
          clauseType: { type: 'string' },
          riskLevel: { type: 'string' },
          whyItMatters: {
            type: 'string',
            description: 'One sentence explaining why this clause matters in practical terms',
          },
          questionsToAsk: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific, concrete questions to ask an attorney about this clause. NOT generic boilerplate. Must reference the specific clause content.',
          },
          documentsToGather: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific documents or information to gather before the attorney consultation related to this clause',
          },
        },
        required: ['clauseIndex', 'clauseType', 'riskLevel', 'whyItMatters', 'questionsToAsk', 'documentsToGather'],
      },
    },
  },
  required: ['summary', 'flaggedItems'],
};

/**
 * Generate an attorney-prep checklist for a single document analysis.
 */
export async function generateDocumentChecklist(documentId: string): Promise<AttorneyChecklist> {
  const docResult = await query<{ status: string; document_type: string; original_name: string }>(
    'SELECT status, document_type, original_name FROM documents WHERE id = $1',
    [documentId]
  );
  
  if (docResult.rows.length === 0) throw new Error('Document not found');
  if (docResult.rows[0].status !== 'analyzed') {
    throw new Error('Document analysis not complete. Run analysis first.');
  }
  
  const doc = docResult.rows[0];
  
  // Get all flagged clauses
  const clauseResult = await query<{
    id: string; clause_index: number; clause_type: string; text: string;
    risk_level: string; semantic_delta_explanation: string;
  }>(
    `SELECT id, clause_index, clause_type, text, risk_level, semantic_delta_explanation
     FROM clauses
     WHERE document_id = $1
       AND risk_level IN ('Caution', 'Unfavorable')
     ORDER BY
       CASE risk_level WHEN 'Unfavorable' THEN 0 WHEN 'Caution' THEN 1 END,
       clause_index`,
    [documentId]
  );
  
  const flaggedClauses = clauseResult.rows;
  
  if (flaggedClauses.length === 0) {
    return {
      summary: `This ${doc.document_type} contract appears to use mostly standard language. No significant clauses were flagged. You may still want a brief attorney review to confirm this applies in your jurisdiction.`,
      flaggedItems: [],
      disclaimer: LEGAL_DISCLAIMER,
    };
  }
  
  const clauseContext = flaggedClauses.map(c =>
    `[Clause ${c.clause_index}, ${c.clause_type}, Risk: ${c.risk_level}]\n` +
    `Text: ${c.text.slice(0, 800)}\n` +
    `Analysis: ${c.semantic_delta_explanation}`
  ).join('\n\n---\n\n');
  
  const result = await callLlmJson<ChecklistOutput>({
    systemPrompt: `You are preparing a "Prep for Your Lawyer" checklist to help someone make the most of a paid legal consultation.

Your goal: help the user arrive at the consultation with specific questions so the attorney can focus on what matters, not spend time re-reading the contract.

CRITICAL: Every question must be SPECIFIC to this contract's actual language. Never write generic questions like "Is this clause negotiable?" Instead write specific ones like "Is the unlimited indemnification in Clause 4 unusual for this type of contract in [state]?" or "Can we negotiate the 90-day payment window down to 30 days?"

Framing for the user: "Make your lawyer's time efficient."`,
    userPrompt: `Generate an attorney-prep checklist for this ${doc.document_type} contract.

Flagged clauses requiring attorney review:
${clauseContext}

For each clause:
1. Explain in ONE sentence why it matters practically
2. Write 2-3 SPECIFIC questions to ask the attorney (not generic)
3. List what documents/information to bring about this specific clause`,
    schema: CHECKLIST_SCHEMA,
  });
  
  const checklistItems: AttorneyChecklistItem[] = result.data.flaggedItems.map(item => ({
    clauseIndex: item.clauseIndex,
    clauseType: item.clauseType,
    riskLevel: item.riskLevel as any,
    whyItMatters: item.whyItMatters,
    questionsToAsk: item.questionsToAsk,
    documentsToGather: item.documentsToGather,
  }));
  
  return {
    summary: result.data.summary,
    flaggedItems: checklistItems,
    disclaimer: LEGAL_DISCLAIMER,
  };
}

/**
 * Generate an attorney-prep checklist for a document comparison.
 */
export async function generateComparisonChecklist(comparisonId: string): Promise<AttorneyChecklist> {
  const compResult = await query<{
    id: string; document_a_id: string; document_b_id: string; summary: string;
  }>(
    'SELECT id, document_a_id, document_b_id, summary FROM comparisons WHERE id = $1',
    [comparisonId]
  );
  
  if (compResult.rows.length === 0) throw new Error('Comparison not found');
  const comp = compResult.rows[0];
  
  const pairsResult = await query<{
    clause_type: string; difference_explanation: string | null;
    more_favorable: string | null; only_in_document: string | null;
    clause_a_index: number | null; clause_b_index: number | null;
  }>(
    `SELECT ccp.clause_type, ccp.difference_explanation, ccp.more_favorable, ccp.only_in_document,
            ca.clause_index as clause_a_index, cb.clause_index as clause_b_index
     FROM comparison_clause_pairs ccp
     LEFT JOIN clauses ca ON ccp.clause_a_id = ca.id
     LEFT JOIN clauses cb ON ccp.clause_b_id = cb.id
     WHERE ccp.comparison_id = $1`,
    [comparisonId]
  );
  
  const concerningPairs = pairsResult.rows.filter(
    r => r.more_favorable === 'document_b' || r.only_in_document !== null
  );
  
  if (concerningPairs.length === 0) {
    return {
      summary: `The comparison shows both documents are broadly similar with no major one-sided differences detected. You may still want attorney review for jurisdiction-specific issues.`,
      flaggedItems: [],
      disclaimer: LEGAL_DISCLAIMER,
    };
  }
  
  const context = [
    `Overall: ${comp.summary}`,
    ...concerningPairs.map(p =>
      p.only_in_document
        ? `Clause only in ${p.only_in_document === 'document_a' ? 'Document A' : 'Document B'}: ${p.clause_type}`
        : `${p.clause_type}: ${p.difference_explanation} (Document ${p.more_favorable === 'document_b' ? 'B is more favorable' : 'A is more favorable'})`
    )
  ].join('\n');
  
  const result = await callLlmJson<ChecklistOutput>({
    systemPrompt: `You are preparing a "Prep for Your Lawyer" checklist for a contract comparison.
Generate specific, clause-grounded questions for each area of concern.`,
    userPrompt: `Generate a checklist for attorney consultation based on this contract comparison:\n\n${context}`,
    schema: CHECKLIST_SCHEMA,
  });
  
  const checklistItems: AttorneyChecklistItem[] = result.data.flaggedItems.map(item => ({
    clauseIndex: item.clauseIndex,
    clauseType: item.clauseType,
    riskLevel: item.riskLevel as any,
    whyItMatters: item.whyItMatters,
    questionsToAsk: item.questionsToAsk,
    documentsToGather: item.documentsToGather,
  }));
  
  return {
    summary: result.data.summary,
    flaggedItems: checklistItems,
    disclaimer: LEGAL_DISCLAIMER,
  };
}
