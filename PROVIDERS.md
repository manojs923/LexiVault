# FENCO 2.0 — AI Providers & Models

**Source of truth for all AI provider and model information.**
Every service file in `backend/src/services/` must match what is listed here.

## Current Providers (verified 2026-09-22)

| Role | Provider | SDK Package | Model ID | Notes |
|---|---|---|---|---|
| Primary LLM | Google Gemini | `@google/genai` | `gemini-3.8-flash` | GA Sep 2, 2026 |
| Fallback LLM | Google Gemini | `@google/genai` | `gemini-3.5-flash-lite` | Cost-optimized fallback |
| Primary Embedding | Google Gemini | `@google/genai` | `gemini-embedding-001` | 3072 dims default, MRL |
| Embedding Fallback | Google Gemini | `@google/genai` | `gemini-embedding-001` | 768 dims reduced |
| Final Embedding Fallback | N/A (deterministic) | N/A | `deterministic-hash-fallback` | Sets reduced_accuracy_mode=true |

## Verification Notes
- `gemini-3.8-flash`: Verified at https://ai.google.dev/gemini-api/docs/models on 2026-09-22
- `gemini-3.5-flash-lite`: Verified as current Gemini 3.x lite variant on 2026-09-22  
- `gemini-embedding-001`: Verified at https://ai.google.dev/gemini-api/docs/models on 2026-09-22. Supports MRL dimensions 128–3072, default 3072.
- `@google/genai` replaces deprecated `@google/generative-ai` (deprecated Aug 31, 2025)
- pgvector Docker image: `pgvector/pgvector:pg17` (official; `ankane/pgvector` abandoned 2023)

## What Each Model Does
- **gemini-3.8-flash**: Stage 2 risk classification, counter-draft generation, gotchas summary, document Q&A, comparison analysis, attorney checklist generation
- **gemini-3.5-flash-lite**: Fallback for all LLM tasks if primary fails
- **gemini-embedding-001**: Clause embedding for pgvector similarity search (both benchmark matching and document Q&A retrieval)
