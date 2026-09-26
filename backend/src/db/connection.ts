// FENCO 2.0 — Database Connection
// Uses pg (node-postgres) with connection pooling.
// pgvector extension is loaded via the migration.

import { Pool, PoolClient } from 'pg';
import { getEnv } from '../config/env';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (pool) return pool;
  
  const env = getEnv();
  
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err.message);
  });
  
  return pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const client = getPool();
  const result = await client.query(text, params);
  return { rows: result.rows as T[], rowCount: result.rowCount };
}

export const db = {
  query,
};

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
