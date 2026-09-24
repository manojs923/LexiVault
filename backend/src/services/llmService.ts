// FENCO 2.0 — LLM Service
// Provider: Google Gemini (via @google/genai)
// Primary model: gemini-3.8-flash
// Fallback model: gemini-3.5-flash-lite
// Last verified: 2026-09-22
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
 * Call the LLM with a cascade: primary model → fallback model.
 * Automatically prepends the legal disclaimer to every system prompt.
 */
export async function callLlm(options: LlmCallOptions): Promise<LlmCallResult> {
  const env = getEnv();
  const ai = getGenAI();
  
  // Enforce legal disclaimer prefix on every system prompt
  const systemPrompt = `${LEGAL_DISCLAIMER_PREFIX}\n\n${options.systemPrompt}`;
  
  const attemptCall = async (model: string): Promise<string> => {
    return withRetry(async () => {
      const config: Record<string, unknown> = {
        systemInstruction: systemPrompt,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: 0.1, // low temperature for consistent legal analysis
        },
      };
      
      if (options.schema) {
        config.generationConfig = {
          ...config.generationConfig as Record<string, unknown>,
          responseMimeType: 'application/json',
          responseSchema: options.schema,
        };
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
    }, 3, 1000);
  };
  
  // Try primary model
  try {
    const content = await attemptCall(env.LLM_PRIMARY_MODEL);
    return { content, model: env.LLM_PRIMARY_MODEL, usedFallback: false };
  } catch (err) {
    console.warn(`⚠️  Primary LLM (${env.LLM_PRIMARY_MODEL}) failed: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Try fallback model
  try {
    const content = await attemptCall(env.LLM_FALLBACK_MODEL);
    console.warn(`⚠️  Used fallback LLM model: ${env.LLM_FALLBACK_MODEL}`);
    return { content, model: env.LLM_FALLBACK_MODEL, usedFallback: true };
  } catch (err) {
    throw new Error(`All LLM models failed. Last error: ${err instanceof Error ? err.message : String(err)}`);
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
