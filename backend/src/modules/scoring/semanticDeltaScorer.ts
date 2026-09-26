// FENCO 2.0 — Stage 2 Semantic Delta Scorer
// LLM-based risk classification for clauses that didn't resolve at Stage 1.
// Only called for clauses where similarity < SIMILARITY_THRESHOLD.

import { callLlmJson } from '../../services/llmService';
import type { RiskLevel } from '../../types/index';
import { truncateForLog } from '../../utils/index';

export interface SemanticDeltaResult {
  riskLevel: RiskLevel;
  explanation: string;
  selfReportedConfidence: number; // 0.0-1.0
  modelUsed: string;
  usedFallback: boolean;
}

const RISK_SCHEMA = {
  type: 'object',
  properties: {
    riskLevel: {
      type: 'string',
      enum: ['Standard', 'Caution', 'Unfavorable'],
    },
    explanation: {
      type: 'string',
      description: 'Plain-English explanation (2-3 sentences, written for a non-lawyer)',
    },
    confidence: {
      type: 'number',
      description: 'Your confidence in this classification (0.0-1.0)',
    },
  },
  required: ['riskLevel', 'explanation', 'confidence'],
};

/**
 * Stage 2: LLM-based semantic risk classification.
 * Compares the uploaded clause against the most similar benchmark clause.
 */
export async function classifySemanticRisk(
  uploadedClauseText: string,
  benchmarkClauseText: string,
  clauseType: string
): Promise<SemanticDeltaResult> {
  
  const systemPrompt = `You are a legal risk analysis assistant helping freelancers, tenants, and small business owners understand contract risks. 

Your task is to compare a contract clause from an uploaded document against a market-standard benchmark clause and classify the risk level.

Risk levels:
- Standard: The clause is fair, balanced, and typical for this type of contract. No significant concerns.
- Caution: The clause has some one-sided elements or unusual provisions worth noting, but is not severely unfair.
- Unfavorable: The clause is significantly one-sided, potentially exploitative, or contains provisions that could seriously disadvantage the signing party (e.g., unlimited indemnification, perpetual non-compete, unilateral modification rights).

Write your explanation in plain English for a non-lawyer. Be specific about what is problematic and why.`;
  
  const userPrompt = `Compare these two clauses:

**Clause Type:** ${clauseType}

**Uploaded Contract Clause:**
${uploadedClauseText.slice(0, 2000)}

**Market-Standard Benchmark Clause:**
${benchmarkClauseText.slice(0, 2000)}

Classify the risk level of the uploaded clause and explain what makes it risky or acceptable. Also report your confidence (0.0-1.0) in this classification, considering the clause length, ambiguity, and how clear the risk is.

Respond strictly with a valid JSON object matching the schema: {"riskLevel": "Standard" | "Caution" | "Unfavorable", "explanation": "string", "confidence": number}.`;
  
  try {
    const result = await callLlmJson<{
      riskLevel: RiskLevel;
      explanation: string;
      confidence: number;
    }>({
      systemPrompt,
      userPrompt,
      schema: RISK_SCHEMA,
    });
    
    return {
      riskLevel: result.data.riskLevel,
      explanation: result.data.explanation,
      selfReportedConfidence: Math.max(0, Math.min(1, result.data.confidence)),
      modelUsed: result.model,
      usedFallback: result.usedFallback,
    };
  } catch (err) {
    console.warn(`[SemanticScorer] Failed: ${truncateForLog(String(err))}. Defaulting to Caution.`);
    return {
      riskLevel: 'Caution',
      explanation: 'This clause could not be fully analyzed due to a temporary AI service issue. Treat this as a starting point and review manually.',
      selfReportedConfidence: 0.2,
      modelUsed: 'error-fallback',
      usedFallback: true,
    };
  }
}
