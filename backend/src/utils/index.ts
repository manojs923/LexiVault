// FENCO 2.0 — Utility Functions

import crypto from 'crypto';

/**
 * Generates a SHA-256 hash of the given text.
 * Used for cache keys and idempotency checks.
 */
export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text.trim()).digest('hex');
}

/**
 * Generates a deterministic fallback embedding vector from text.
 * IMPORTANT: This produces essentially random vectors based on the text hash.
 * It is used ONLY when all real embedding providers fail.
 * Any clause analyzed with this vector will have used_fallback_embedding=true
 * and will carry a heavily penalized confidence score.
 */
export function generateFallbackEmbedding(text: string, dimensions: number): number[] {
  const hash = crypto.createHash('sha256').update(text).digest();
  const vector: number[] = [];
  
  for (let i = 0; i < dimensions; i++) {
    // Use hash bytes cyclically, normalize to [-1, 1]
    const byteVal = hash[i % hash.length];
    vector.push((byteVal / 127.5) - 1.0);
  }
  
  // L2-normalize the vector
  const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return vector.map(v => v / (magnitude || 1));
}

/**
 * Truncates text for safe logging (never log full contract text).
 */
export function truncateForLog(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...[truncated]';
}

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

/**
 * Compute cosine similarity between two vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vector dimension mismatch');
  
  let dot = 0;
  let magA = 0;
  let magB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  
  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

/**
 * Batch an array into chunks of a given size.
 */
export function batchArray<T>(arr: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += batchSize) {
    batches.push(arr.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Parse JSON safely, returning null on failure.
 */
export function safeJsonParse<T>(text: string): T | null {
  try {
    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/m, '')
      .replace(/\s*```\s*$/m, '')
      .trim();
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
