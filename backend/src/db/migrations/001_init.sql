-- FENCO 2.0 — Initial Database Migration
-- Verified pgvector extension via pgvector/pgvector:pg17 Docker image
-- Embedding dimensions: 768 (gemini-embedding-001 MRL standard, pgvector HNSW compatible)

BEGIN;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Schema migrations table for idempotency
CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Check if this migration has already been applied
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE version = '001_init') THEN
    RAISE NOTICE 'Migration 001_init already applied, skipping.';
    RETURN;
  END IF;
END $$;

-- Source type enum for benchmark provenance
DO $$ BEGIN
  CREATE TYPE source_type_enum AS ENUM (
    'public_legal_aid',
    'bar_association_template',
    'synthetic_llm_generated',
    'public_domain_form',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Document type enum
DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('freelance', 'residential_lease', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Document status enum
DO $$ BEGIN
  CREATE TYPE document_status_enum AS ENUM (
    'uploaded', 'ingesting', 'ingested', 'analyzing', 'analyzed', 'error'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Risk level enum
DO $$ BEGIN
  CREATE TYPE risk_level_enum AS ENUM ('Standard', 'Caution', 'Unfavorable');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Message role enum
DO $$ BEGIN
  CREATE TYPE message_role_enum AS ENUM ('user', 'assistant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- More favorable enum
DO $$ BEGIN
  CREATE TYPE more_favorable_enum AS ENUM ('document_a', 'document_b', 'neither', 'depends');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- BENCHMARK CLAUSES (the knowledge base)
-- ============================================================
CREATE TABLE IF NOT EXISTS benchmark_clauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clause_type VARCHAR(100) NOT NULL,
  document_type document_type_enum NOT NULL,
  text TEXT NOT NULL,
  text_hash VARCHAR(64) UNIQUE NOT NULL, -- SHA-256 for idempotency
  embedding vector(768),                -- gemini-embedding-001 MRL standard (<2000 for HNSW)
  source_attribution VARCHAR(255) NOT NULL,
  source_type source_type_enum NOT NULL, -- must be truthfully populated
  source_url_or_note TEXT NOT NULL,      -- where this actually came from
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW index on 768-dimensional embeddings (<2000 pgvector limit)
CREATE INDEX IF NOT EXISTS benchmark_clauses_embedding_idx
  ON benchmark_clauses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS benchmark_clauses_type_idx ON benchmark_clauses (clause_type, document_type);

-- ============================================================
-- DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,           -- UUID-prefixed safe filename
  original_name VARCHAR(255) NOT NULL,       -- original user-supplied name
  document_type document_type_enum NOT NULL DEFAULT 'other',
  status document_status_enum NOT NULL DEFAULT 'uploaded',
  error_message TEXT,
  reduced_accuracy_mode BOOLEAN NOT NULL DEFAULT FALSE, -- true if any clause used fallback
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS documents_status_idx ON documents (status);

-- ============================================================
-- CLAUSES (extracted and scored)
-- ============================================================
CREATE TABLE IF NOT EXISTS clauses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  clause_index INTEGER NOT NULL,
  clause_type VARCHAR(100) NOT NULL DEFAULT 'Unknown',
  text TEXT NOT NULL,
  text_hash VARCHAR(64) NOT NULL,
  embedding vector(768),
  risk_level risk_level_enum,
  similarity_score REAL,
  confidence_score REAL,                   -- 0.0-1.0, see §7.4
  used_fallback_embedding BOOLEAN NOT NULL DEFAULT FALSE,
  used_fallback_llm_model VARCHAR(100),    -- which model actually served this
  semantic_delta_explanation TEXT,
  counter_draft TEXT,
  counter_draft_explanation TEXT,
  top_benchmark_match_id UUID REFERENCES benchmark_clauses(id),
  stage1_only BOOLEAN NOT NULL DEFAULT FALSE, -- true = never hit LLM
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HNSW index for document Q&A retrieval (§7B)
CREATE INDEX IF NOT EXISTS clauses_embedding_idx
  ON clauses
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS clauses_document_id_idx ON clauses (document_id);
CREATE INDEX IF NOT EXISTS clauses_risk_level_idx ON clauses (document_id, risk_level);

-- ============================================================
-- Q&A SESSIONS (§7B)
-- ============================================================
CREATE TABLE IF NOT EXISTS qa_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qa_sessions_document_id_idx ON qa_sessions (document_id);

-- ============================================================
-- Q&A MESSAGES (§7B)
-- ============================================================
CREATE TABLE IF NOT EXISTS qa_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
  role message_role_enum NOT NULL,
  content TEXT NOT NULL,
  related_clause_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS qa_messages_session_id_idx ON qa_messages (session_id);

-- ============================================================
-- COMPARISONS (§7A)
-- ============================================================
CREATE TABLE IF NOT EXISTS comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_a_id UUID NOT NULL REFERENCES documents(id),
  document_b_id UUID NOT NULL REFERENCES documents(id),
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comparisons_docs_idx ON comparisons (document_a_id, document_b_id);

-- ============================================================
-- COMPARISON CLAUSE PAIRS (§7A)
-- ============================================================
CREATE TABLE IF NOT EXISTS comparison_clause_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  comparison_id UUID NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
  clause_a_id UUID REFERENCES clauses(id),   -- null if only in Doc B
  clause_b_id UUID REFERENCES clauses(id),   -- null if only in Doc A
  clause_type VARCHAR(100) NOT NULL,
  difference_explanation TEXT,               -- null for one-sided rows
  more_favorable more_favorable_enum,        -- null for one-sided rows
  only_in_document VARCHAR(20),              -- 'document_a' or 'document_b'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS comparison_pairs_comparison_id_idx ON comparison_clause_pairs (comparison_id);

-- Mark migration as applied
INSERT INTO schema_migrations (version) VALUES ('001_init')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
