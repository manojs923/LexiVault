// FENCO 2.0 — Environment Configuration
// Validates all required environment variables at startup using Zod.
// The application will fail fast if any required variable is missing.

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  DATABASE_URL: z.string().default('postgresql://fenco:fenco_password@localhost:5432/fenco_db'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  GEMINI_API_KEY: z.string().default(process.env.GEMINI_API_KEY || (process.env.NODE_ENV === 'test' ? 'test_key' : 'pending_key')),
  // Scoring thresholds
  SIMILARITY_THRESHOLD: z.string().default('0.65').transform(Number),
  COMPARISON_MATCH_THRESHOLD: z.string().default('0.70').transform(Number),
  // File upload
  MAX_FILE_SIZE_MB: z.string().default('10').transform(Number),
  UPLOAD_DIR: z.string().default('./uploads'),
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // LLM Config
  LLM_PROVIDER: z.enum(['auto', 'gemini', 'mistral']).default('auto'),
  MISTRAL_API_KEY: z.string().optional().default(process.env.MISTRAL_API_KEY || ''),
  LLM_PRIMARY_MODEL: z.string().default('gemini-3.8-flash'),
  LLM_FALLBACK_MODEL: z.string().default('gemini-3.5-flash-lite'),
  EMBEDDING_PRIMARY_MODEL: z.string().default('gemini-embedding-001'),
  EMBEDDING_DIMENSIONS: z.string().default('768').transform(Number),
  // Pipeline config
  MAX_COUNTER_DRAFTS: z.string().default('5').transform(Number),
});

type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment configuration:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  _env = result.data;
  return _env;
}

export default getEnv;
