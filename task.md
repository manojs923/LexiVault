# FENCO 2.0 — Build Tasks

## Phase 0 — Scaffolding
- [x] Repo structure + package.json files
- [x] TypeScript config (strict mode)
- [x] Zod env schema (config/env.ts)
- [x] Docker Compose (pgvector/pgvector:pg17, Redis)
- [x] Multi-stage Dockerfile
- [x] server.ts with health endpoint
- [x] Middleware: helmet, CORS, rateLimiter, errorHandler
- [x] bootstrap script (npm run setup & bootstrap.ps1)
- [x] Checkpoint: docker compose up + GET /api/health → 200

## Phase 1 — Data Layer
- [x] migrations/001_init.sql (all tables + HNSW indexes)
- [x] db/connection.ts
- [x] db/migrate.ts
- [x] db/seed.ts (35+ benchmark clauses, idempotent)
- [x] Checkpoint: seeder runs twice, zero duplication

## Phase 2 — Ingestion Pipeline
- [x] services/embeddingService.ts (gemini-embedding-001, fallback)
- [x] services/cacheService.ts (Redis + in-memory fallback)
- [x] modules/ingestion/textExtractor.ts
- [x] modules/ingestion/clauseSplitter.ts
- [x] modules/ingestion/llmClauseSplitter.ts
- [x] modules/ingestion/ingestionPipeline.ts
- [x] routes/upload.ts
- [x] Checkpoint: upload sample → clauses persisted with embeddings

## Phase 3 — Scoring Pipeline
- [x] services/llmService.ts (gemini-3.8-flash cascade)
- [x] modules/scoring/retrievalScorer.ts
- [x] modules/scoring/semanticDeltaScorer.ts
- [x] modules/scoring/scoringPipeline.ts
- [x] modules/confidence/confidenceEngine.ts
- [x] routes/analysis.ts (analyze + status)
- [x] Checkpoint: analyze → risk-tiered clauses with confidenceScore

## Phase 4 — Counter-Drafts & Gotchas
- [x] modules/counterdraft/counterDraftGenerator.ts
- [x] modules/gotchas/gotchasGenerator.ts
- [x] Checkpoint: /analysis payload matches documented shape

## Phase 5 — Document Q&A (§7B)
- [x] modules/qa/qaService.ts
- [x] routes: POST /ask, GET /qa-sessions/:id
- [x] Checkpoint: in-scope → cited answer; out-of-scope → honest denial

## Phase 6 — Document Comparison (§7A)
- [x] modules/comparison/comparisonService.ts
- [x] routes: POST /comparisons, GET /comparisons/:id
- [x] Checkpoint: one-sided clause correctly surfaced

## Phase 7 — Attorney-Prep Checklist (§7C)
- [x] modules/checklist/checklistService.ts
- [x] routes: GET /attorney-checklist (doc + comparison)
- [x] Checkpoint: specific clause-grounded questions

## Phase 8 — Frontend
- [x] Vite + React + TypeScript setup
- [x] Design tokens (CSS variables)
- [x] UploadPage
- [x] AnalysisPage
- [x] ComparisonPage
- [x] AttorneyPrepPage
- [x] Components: ClauseCard, RiskBadge, GotchasSummary
- [x] Components: DocumentChatPanel, ComparisonClauseRow, AttorneyChecklist
- [x] Components: ReducedAccuracyBanner, DisclaimerBanner
- [x] Checkpoint: full click-through demo works

## Phase 9 — Security & Testing
- [x] check-naming-contract.sh
- [x] SQL interpolation CI check
- [x] Unit tests (textExtractor, clauseSplitter, confidenceEngine)
- [x] Integration tests (upload, qaGrounding, comparison)
- [x] E2E forced-fallback test (fallbackResilience)
- [x] Checkpoint: test suite green

## Phase 10 — Corpus & Provenance
- [x] BENCHMARK_PROVENANCE.md
- [x] PROVIDERS.md (final)
- [x] Checkpoint: every benchmark row has truthful source_type

## Phase 11 — Demo Assets
- [x] demo-contracts/ (4 sample contracts)
- [x] DEMO_SCRIPT.md
- [x] DIFFERENTIATION.md
- [x] README.md (one-command bootstrap front and center)
- [x] MODELS_TO_VERIFY.md (empty = done)
