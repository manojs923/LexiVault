// FENCO 2.0 — Database Migration Runner

import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection';
import { getEnv } from '../config/env';

async function runMigrations(): Promise<void> {
  getEnv(); // validate env first
  
  const pool = getPool();
  const migrationsDir = path.join(__dirname, 'migrations');
  
  console.log('🗄️  Running database migrations...');
  
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();
  
  for (const file of migrationFiles) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    console.log(`  Running migration: ${file}`);
    await pool.query(sql);
    console.log(`  ✅ ${file} applied`);
  }
  
  console.log('✅ All migrations complete');
}

runMigrations()
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => closePool());
