// FENCO 2.0 — Embedding Service
// Provider: Google Gemini (via @google/genai)
// Primary model: gemini-embedding-001 (3072 dims, MRL-capable)
// Fallback: gemini-embedding-001 at 768 dims (reduced accuracy)
// Final fallback: deterministic hash vector (marks used_fallback_embedding=true)
// Last verified: 2026-09-22

import { GoogleGenAI } from '@google/genai';
import { getEnv } from '../config/env';
import { generateFallbackEmbedding, hashText, withRetry } from '../utils/index';
import { getCacheService } from './cacheService';
import type { EmbeddingResult } from '../types/index';

let genAI: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAI) {
    const env = getEnv();
    genAI = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return genAI;
}

/**
 * Embed a single text string.
 * Implements a cascade: primary model → fallback dims → deterministic hash vector.
 */
export async function embedText(text: string): Promise<EmbeddingResult> {
  const env = getEnv();
  const cache = getCacheService();
  const cacheKey = `embed:${hashText(text)}`;
  
  // Check cache first
  const cached = await cache.get<EmbeddingResult>(cacheKey);
  if (cached) return cached;
  
  const ai = getGenAI();
  
  // Attempt 1: Primary model at full dimensions
  try {
    const result = await withRetry(async () => {
      const response = await ai.models.embedContent({
        model: env.EMBEDDING_PRIMARY_MODEL,
        contents: text,
        config: { outputDimensionality: env.EMBEDDING_DIMENSIONS },
      });
      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) throw new Error('Empty embedding response');
      return values;
    }, 3, 1000);
    
    const embeddingResult: EmbeddingResult = {
      embedding: result,
      usedFallback: false,
      model: env.EMBEDDING_PRIMARY_MODEL,
    };
    await cache.set(cacheKey, embeddingResult);
    return embeddingResult;
  } catch (err) {
    console.warn(`⚠️  Primary embedding failed, trying reduced dims: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Attempt 2: Same model, reduced dimensions (768)
  try {
    const result = await withRetry(async () => {
      const response = await ai.models.embedContent({
        model: env.EMBEDDING_PRIMARY_MODEL,
        contents: text,
        config: { outputDimensionality: 768 },
      });
      const values = response.embeddings?.[0]?.values;
      if (!values || values.length === 0) throw new Error('Empty embedding response');
      // Pad to full dimensions with zeros
      const padded = [...values, ...new Array(env.EMBEDDING_DIMENSIONS - values.length).fill(0)];
      return padded;
    }, 2, 2000);
    
    const embeddingResult: EmbeddingResult = {
      embedding: result,
      usedFallback: true,
      model: `${env.EMBEDDING_PRIMARY_MODEL}:reduced768`,
    };
    await cache.set(cacheKey, embeddingResult, 3600); // shorter TTL for fallback
    return embeddingResult;
  } catch (err) {
    console.warn(`⚠️  Reduced-dim embedding failed, using deterministic fallback: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  // Final fallback: deterministic hash vector
  const embeddingResult: EmbeddingResult = {
    embedding: generateFallbackEmbedding(text, env.EMBEDDING_DIMENSIONS),
    usedFallback: true,
    model: 'deterministic-hash-fallback',
  };
  // Don't cache fallback — retry real embedding next time
  return embeddingResult;
}

/**
 * Embed multiple texts in batches.
 */
export async function embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
  const results: EmbeddingResult[] = [];
  
  // Process in batches of 5 to respect rate limits
  for (let i = 0; i < texts.length; i += 5) {
    const batch = texts.slice(i, i + 5);
    const batchResults = await Promise.all(batch.map(t => embedText(t)));
    results.push(...batchResults);
    
    if (i + 5 < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  return results;
}
