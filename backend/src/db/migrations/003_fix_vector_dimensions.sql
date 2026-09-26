-- LexiVault — Migration 003: Standardize Vector Dimensions to 768
-- Ensures benchmark_clauses and clauses columns match 768 dims for HNSW index compatibility

BEGIN;

-- Drop existing indexes if present so column type can be altered safely
DROP INDEX IF EXISTS benchmark_clauses_embedding_idx;
DROP INDEX IF EXISTS clauses_embedding_idx;

-- Alter column types to vector(768) if tables exist
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'benchmark_clauses' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE benchmark_clauses ALTER COLUMN embedding TYPE vector(768);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'clauses' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE clauses ALTER COLUMN embedding TYPE vector(768);
  END IF;
END $$;

-- Recreate native HNSW indexes on 768-dimensional embeddings (<2000 pgvector limit)
CREATE INDEX IF NOT EXISTS benchmark_clauses_embedding_idx
  ON benchmark_clauses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS clauses_embedding_idx
  ON clauses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

INSERT INTO schema_migrations (version) VALUES ('003_fix_vector_dimensions')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
