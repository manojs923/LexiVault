-- FENCO 2.0 — Migration 002: Add Gotchas Table Persistence
-- Allows pre-calculated Gotchas to be stored and fetched instantly

BEGIN;

CREATE TABLE IF NOT EXISTS gotchas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  explanation TEXT NOT NULL,
  risk_level VARCHAR(20) NOT NULL,
  related_clause_index INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gotchas_document_id ON gotchas(document_id);

INSERT INTO schema_migrations (version) VALUES ('002_add_gotchas_persistence')
  ON CONFLICT (version) DO NOTHING;

COMMIT;
