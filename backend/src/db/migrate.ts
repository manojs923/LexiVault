// LexiVault — Database Migration Runner

import fs from 'fs';
import path from 'path';
import { getPool, closePool } from './connection';
import { getEnv } from '../config/env';

function resolveMigrationsDir(): string {
  // When compiled, __dirname = dist/db/
  // tsc does NOT copy .sql files, so fall back to src/db/migrations
  const distDir = path.join(__dirname, 'migrations');
  if (fs.existsSync(distDir) && fs.readdirSync(distDir).some(f => f.endsWith('.sql'))) {
    return distDir;
  }
  // Fallback: walk up from __dirname to find src/db/migrations
  // Works both locally (ts-node) and in Railway (node dist/db/migrate.js)
  const srcDir = path.resolve(__dirname, '..', '..', 'src', 'db', 'migrations');
  if (fs.existsSync(srcDir)) {
    return srcDir;
  }
  // Last resort: relative to project root
  const rootDir = path.resolve(__dirname, '..', '..', '..', 'backend', 'src', 'db', 'migrations');
  if (fs.existsSync(rootDir)) {
    return rootDir;
  }
  throw new Error(`Cannot locate migrations directory. Tried:\n  ${distDir}\n  ${srcDir}\n  ${rootDir}`);
}

async function runMigrations(): Promise<void> {
  getEnv(); // validate env first

  const pool = getPool();
  const migrationsDir = resolveMigrationsDir();

  console.log(`🗄️  Running database migrations from: ${migrationsDir}`);

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('⚠️  No .sql migration files found.');
    return;
  }

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
