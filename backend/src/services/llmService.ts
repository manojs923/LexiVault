// FENCO 2.0 / LexiVault — Multi-Provider LLM Service
// Providers: Google Gemini (via @google/genai) and Mistral AI (via REST API)
// Automatically cascades to Mistral if Gemini hits 429 RESOURCE_EXHAUSTED quota limits.
//
// IMPORTANT: Every system prompt MUST open with the legal disclaimer.
// This is enforced by the LEGAL_DISCLAIMER_PREFIX constant below.

import { GoogleGenAI } from '@google/genai';
import { getEnv } from '../config/env';
import { withRetry, truncateForLog, safeJsonParse } from '../utils/index';
import type { LlmCallResult } from '../types/index';

export const LEGAL_DISCLAIMER_PREFIX = `IMPORTANT: You are an AI assistant analyzing legal documents. Your outputs are informational only and do not constitute legal advice. Users must consult a licensed attorney before making any decisions based on this analysis. Never present your outputs as definitive legal conclusions.`;

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const env = getEnv();
    genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genAI;
}

export interface LlmCallOptions {
  systemPrompt: string;
  userPrompt: string;
  schema?: Record<string, unknown>; // JSON schema for structured output
  maxTokens?: number;
}

/**
 * Call Mistral AI via OpenAI-compatible REST API (Zero external npm dependency)
 */
async function callMistral(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  schema?: Record<string, unknown>,
  maxTokens: number = 4096
): Promise<string> {
  return withRetry(async () => {
    // When requesting JSON mode, Mistral API strictly requires 'json' to appear in the prompt
    const enhancedSystemPrompt = schema
      ? `${systemPrompt}\n\nIMPORTANT: You must respond in valid JSON format matching the schema.`
      : systemPrompt;
    
    const enhancedUserPrompt = schema
      ? `${userPrompt}\n\nProvide the response strictly as valid JSON.`
      : userPrompt;

    const body: Record<string, unknown> = {
      model: 'mistral-small-latest',
      temperature: 0.1,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: enhancedSystemPrompt },
        { role: 'user', content: enhancedUserPrompt },
      ],
    };

    if (schema) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[Mistral] HTTP ${res.status} error:`, errText);
      throw new Error(`Mistral API error (${res.status}): ${errText}`);
    }

    const json: any = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    if (!text.trim()) throw new Error('Empty response from Mistral API');
    return text;
  }, 2, 1000);
}

/**
 * Call the LLM with a cascade: primary model → fallback model → Mistral.
 * Automatically prepends the legal disclaimer to every system prompt.
 */
export async function callLlm(options: LlmCallOptions): Promise<LlmCallResult> {
  const env = getEnv();
  
  // Enforce legal disclaimer prefix on every system prompt
  const systemPrompt = `${LEGAL_DISCLAIMER_PREFIX}\n\n${options.systemPrompt}`;
  
  // If Mistral is explicitly selected or if Gemini key is missing/exhausted
  if (env.LLM_PROVIDER === 'mistral' && env.MISTRAL_API_KEY) {
    try {
      const content = await callMistral(env.MISTRAL_API_KEY, systemPrompt, options.userPrompt, options.schema, options.maxTokens);
      console.log(`[LLM] Called Mistral (mistral-small-latest), response length: ${truncateForLog(content, 50)}`);
      return { content, model: 'mistral-small-latest', usedFallback: false };
    } catch (err) {
      console.error(`❌ Mistral call failed: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  const ai = getGenAI();
  const attemptGeminiCall = async (model: string): Promise<string> => {
    return withRetry(async () => {
      const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
        temperature: 0.1,
        maxOutputTokens: options.maxTokens || 4096,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: 0.1,
        },
      };
      
      if (options.schema) {
        config.responseMimeType = 'application/json';
        config.responseSchema = options.schema;
        (config.generationConfig as Record<string, unknown>).responseMimeType = 'application/json';
        (config.generationConfig as Record<string, unknown>).responseSchema = options.schema;
      }
      
      const response = await ai.models.generateContent({
        model,
        contents: options.userPrompt,
        config,
      });
      
      const text = response.text ?? '';
      if (!text.trim()) throw new Error('Empty LLM response');
      
      console.log(`[LLM] Called ${model}, response length: ${truncateForLog(text, 50)}`);
      return text;
    }, 2, 1000);
  };
  
  // Try primary Gemini model
  try {
    const content = await attemptGeminiCall(env.LLM_PRIMARY_MODEL);
    return { content, model: env.LLM_PRIMARY_MODEL, usedFallback: false };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`⚠️  Primary LLM (${env.LLM_PRIMARY_MODEL}) failed: ${errMsg}`);
    
    // If quota exhausted (429) and Mistral key is present, immediately cascade to Mistral
    if (env.MISTRAL_API_KEY && (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota'))) {
      console.log('🔄 Gemini quota exhausted. Cascading to Mistral AI...');
      try {
        const content = await callMistral(env.MISTRAL_API_KEY, systemPrompt, options.userPrompt, options.schema, options.maxTokens);
        return { content, model: 'mistral-small-latest', usedFallback: true };
      } catch (mistralErr) {
        console.warn(`⚠️  Mistral cascade also failed: ${mistralErr instanceof Error ? mistralErr.message : String(mistralErr)}`);
      }
    }
  }
  
  // Try fallback Gemini model
  try {
    const content = await attemptGeminiCall(env.LLM_FALLBACK_MODEL);
    console.warn(`⚠️  Used fallback LLM model: ${env.LLM_FALLBACK_MODEL}`);
    return { content, model: env.LLM_FALLBACK_MODEL, usedFallback: true };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.warn(`⚠️  Fallback LLM (${env.LLM_FALLBACK_MODEL}) failed: ${errMsg}`);
    
    // Final attempt: Mistral fallback if configured
    if (env.MISTRAL_API_KEY) {
      console.log('🔄 Cascading to Mistral AI as final fallback...');
      const content = await callMistral(env.MISTRAL_API_KEY, systemPrompt, options.userPrompt, options.schema, options.maxTokens);
      return { content, model: 'mistral-small-latest', usedFallback: true };
    }
    
    throw new Error(`All LLM models failed. Last error: ${errMsg}`);
  }
}

/**
 * Call LLM and parse the result as JSON.
 */
export async function callLlmJson<T>(options: LlmCallOptions): Promise<{ data: T; model: string; usedFallback: boolean }> {
  const result = await callLlm(options);
  const parsed = safeJsonParse<T>(result.content);
  
  if (!parsed) {
    throw new Error(`Failed to parse LLM response as JSON: ${truncateForLog(result.content)}`);
  }
  
  return { data: parsed, model: result.model, usedFallback: result.usedFallback };
}

/**
 * Convenience helpers for compatibility with tutorial and scripts
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string,
  options?: { schema?: Record<string, unknown>; maxTokens?: number }
): Promise<string> {
  const result = await callLlm({
    systemPrompt,
    userPrompt,
    schema: options?.schema,
    maxTokens: options?.maxTokens,
  });
  return result.content;
}

export async function generateJSON<T = Record<string, unknown>>(
  systemPrompt: string,
  userPrompt: string
): Promise<T> {
  const result = await callLlmJson<T>({
    systemPrompt,
    userPrompt,
  });
  return result.data;
}

// ============================================
// DOMAIN HELPER EXPORTS (Tutorial & Script Compatibility)
// ============================================

export async function analyzeSemanticDelta(
  clauseType: string,
  uploadedClauseText: string,
  benchmarkText: string
): Promise<{
  riskLevel: string;
  explanation: string;
  confidence: number;
}> {
  const systemPrompt = `You are a legal contract analyzer. Evaluate the directional variance between an uploaded clause and a fair-market benchmark clause.
Respond ONLY with valid JSON:
{"riskLevel": "Standard" | "Caution" | "Unfavorable", "explanation": "1-2 sentence plain English explanation", "confidence": 0.85}`;

  const userPrompt = `Compare this ${clauseType} clause:
UPLOADED:\n${uploadedClauseText}
BENCHMARK:\n${benchmarkText}`;

  try {
    return await generateJSON(systemPrompt, userPrompt);
  } catch (error) {
    return {
      riskLevel: 'Caution',
      explanation: 'Could not fully analyze clause. Please review manually.',
      confidence: 0.5,
    };
  }
}

// Alias with spelling tolerance from tutorial
export const analyzeSemanticicDelta = analyzeSemanticDelta;

export async function generateCounterDraft(
  clauseType: string,
  unfairClauseText: string,
  benchmarkText: string,
  riskExplanation: string
): Promise<{ counterDraft: string; explanation: string }> {
  const systemPrompt = `You are a contract negotiator. Generate a fair, commercially reasonable alternative clause that addresses identified risks.
Respond ONLY with valid JSON:
{"counterDraft": "Alternative clause text", "explanation": "Why this addresses the risks"}`;

  const userPrompt = `Generate a balanced ${clauseType} clause:
CURRENT: ${unfairClauseText}
BENCHMARK: ${benchmarkText}
RISK: ${riskExplanation}`;

  try {
    return await generateJSON(systemPrompt, userPrompt);
  } catch {
    return {
      counterDraft: 'Consider negotiating this clause with legal counsel.',
      explanation: 'Counter-draft could not be generated.',
    };
  }
}

export async function generateGotchas(
  flaggedClausesSummary: string
): Promise<Array<{ title: string; explanation: string; riskLevel: string }>> {
  const systemPrompt = `You are a contract advisor. Create plain-English "Before You Sign" warnings.
Respond ONLY with valid JSON array:
[{"title": "Headline", "explanation": "1-2 sentence impact", "riskLevel": "Caution" | "Unfavorable"}]`;

  try {
    const parsed = await generateJSON<any>(systemPrompt, `Flagged clauses:\n${flaggedClausesSummary}`);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [{ title: 'Contract Contains Flagged Terms', explanation: 'This contract has clauses that may not be in your favor.', riskLevel: 'Caution' }];
  }
}

export async function answerQuestion(
  question: string,
  retrievedClauses: Array<{ clauseType: string; text: string }>
): Promise<{ answer: string; relatedClauseIndices: number[] }> {
  const systemPrompt = 'You are a contract analyst. Answer questions ONLY using the provided clauses. If the document does not address the question, say so explicitly.';
  const clauseContext = retrievedClauses.map((c, i) => `[Clause ${i}] ${c.clauseType}:\n${c.text}`).join('\n\n');
  const userPrompt = `QUESTION: ${question}\n\nRELEVANT CLAUSES:\n${clauseContext}`;

  try {
    const answer = await generateText(systemPrompt, userPrompt);
    return { answer, relatedClauseIndices: [0] };
  } catch {
    return { answer: 'Could not answer question based on this document.', relatedClauseIndices: [] };
  }
}

export async function explainClauseDifference(
  clauseType: string,
  clauseA: string,
  clauseB: string
): Promise<{ differenceExplanation: string; moreFavorable: string }> {
  const systemPrompt = `You are a contract comparison expert.
Respond ONLY with valid JSON:
{"differenceExplanation": "Plain English explanation of differences", "moreFavorable": "document_a" | "document_b" | "neither" | "depends"}`;
  const userPrompt = `Compare these ${clauseType} clauses:\nDOC A:\n${clauseA}\n\nDOC B:\n${clauseB}`;

  try {
    return await generateJSON(systemPrompt, userPrompt);
  } catch {
    return { differenceExplanation: 'Could not compare clauses.', moreFavorable: 'depends' };
  }
}

export async function generateAttorneyChecklist(
  documentSummary: string,
  flaggedItems: string[]
): Promise<{ summary: string; questionsToAsk: string[]; documentsToGather: string[] }> {
  const systemPrompt = `You are a legal consultant preparing someone for an attorney meeting.
Respond ONLY with valid JSON:
{"summary": "Brief document summary", "questionsToAsk": ["q1", "q2"], "documentsToGather": ["doc1", "doc2"]}`;
  const userPrompt = `DOCUMENT: ${documentSummary}\nFLAGGED ISSUES:\n${flaggedItems.join('\n')}`;

  try {
    return await generateJSON(systemPrompt, userPrompt);
  } catch {
    return {
      summary: documentSummary,
      questionsToAsk: ['Are there any predatory clauses I should be concerned about?', 'What should I negotiate on?'],
      documentsToGather: ['Original contract', 'Any written communication'],
    };
  }
}
