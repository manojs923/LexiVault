# FENCO 2.0 — AI Contract Risk Auditing & Negotiation Platform

> **Build Category:** Legal Information & Basic Legal Assistance  
> **Challenge Goal:** Help users **understand**, **compare**, and **navigate** legal documents and information.

---

### 🏆 Hackathon Evaluation Quick Links
- 📋 [**12-Minute Judge Evaluation Walkthrough**](JUDGE_CHECKLIST.md): Step-by-step feature testing guide covering all 7 use cases with zero setup friction.
- ⚡ [**Empirical Performance & Benchmark Report**](PERFORMANCE.md): Real measurements (3.8s average latency, 62.5% Stage 1 fast-path token savings).
- 🎤 [**3-Minute Pitch & Demo Script**](DEMO_SCRIPT.md): Timed presentation cues covering Understand, Compare, and Navigate.
- 🔍 [**Benchmark Corpus Provenance**](BENCHMARK_PROVENANCE.md): 100% transparent provenance audit for all 35+ benchmark clauses.

---

## ⚡ Quick Start (One-Command Bootstrap)

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) (running)
- [Node.js](https://nodejs.org/) (v20+ LTS recommended)
- A Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Configure
```bash
# Clone the repository
git clone https://github.com/your-repo/fenco.git
cd fenco

# Setup environment
cp backend/.env.example backend/.env
```
Open `backend/.env` and add your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=AIzaSy...
```

### 2. Run Bootstrap Script
```bash
# Runs migrations, seeds 35+ benchmark clauses with pgvector embeddings, and installs all dependencies
npm run setup
```

### 3. Launch Development Servers
```bash
# Starts both Backend (port 3001) and Frontend (port 5173) concurrently:
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🎯 What FENCO 2.0 Does

Predatory clauses—such as unlimited indemnification, perpetual non-competes, subjective payment withholding, and sudden eviction waivers—routinely disadvantage freelancers, gig workers, and tenants who cannot afford legal counsel.

FENCO empowers everyday users through 4 foundational capabilities:

1. **Understand (Single Contract Audit):**  
   Upload any freelance agreement or residential lease (`.pdf` or `.txt`). FENCO breaks it down into individual clauses, compares each against market-standard fair language, and highlights high-risk terms in plain English with instant **counter-draft clauses** ready to copy and send in negotiation.

2. **Navigate (Document-Grounded Q&A §7B):**  
   Ask free-form questions about your uploaded agreement (e.g., *"What happens if I terminate early?"*). FENCO performs RAG strictly over the document's own clause embeddings, returning answers with **clickable citations** and refusing to hallucinate if the document doesn't address the topic.

3. **Compare (Document-to-Document Comparison §7A):**  
   Upload two contrasting agreements (e.g., vendor proposal A vs. vendor proposal B, or an existing lease vs. a renewal offer). FENCO aligns matched clauses side-by-side and surfaces **one-sided clauses** that appear in only one document.

4. **Prepare ("Prep for Your Lawyer" Checklist §7C):**  
   Generates a structured, printable consultation brief with clause-grounded questions and required evidence to make limited paid time with an attorney as cost-effective as possible.

---

## 🏗️ Technical Architecture & Key Differentiators

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────────┐
│  React 18 UI    │ ────▶ │  Express API    │ ────▶ │  PostgreSQL 17      │
│  (Vite + TS)    │ ◀──── │  (TypeScript)   │ ◀──── │  + pgvector HNSW    │
└─────────────────┘       └────────┬────────┘       └─────────────────────┘
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                   ┌───────────┐       ┌───────────┐
                   │  Redis /  │       │  Google   │
                   │ In-Memory │       │  Gemini   │
                   │   Cache   │       │  Cascade  │
                   └───────────┘       └───────────┘
```

### Two-Stage Risk Scoring Architecture
Unlike conventional tools that dump entire contracts into costly LLM prompts:
- **Stage 1 (pgvector Cosine Retrieval):** Clauses with high cosine similarity (≥0.65) to market-standard benchmarks resolve immediately as `Standard`. In empirical tests, **62.5% of clauses skip the LLM entirely**.
- **Stage 2 (Gemini 3.8 Flash Semantic Analysis):** Only suspicious, anomalous, or heavily modified clauses escalate to deep LLM analysis.
- **Composite Confidence Engine (§7.4):** Every output computes a confidence score (0.0–1.0) combining model confidence, similarity margins, and fallback penalties. If fallback vectors or secondary models are engaged, a prominent, non-dismissible `ReducedAccuracyBanner` informs the user.

---

## 🤖 Verified AI Models (as of September 2026)

Verified in accordance with §0.1 and §2 of the build specification:

| Role | Provider | Package | Model Identifier | Purpose |
|---|---|---|---|---|
| **Primary LLM** | Google Gemini | `@google/genai` | `gemini-3.8-flash` | Semantic risk analysis, counter-drafting, Q&A, comparison |
| **Fallback LLM** | Google Gemini | `@google/genai` | `gemini-3.5-flash-lite` | Automatic fallback cascade on rate limit |
| **Embeddings** | Google Gemini | `@google/genai` | `gemini-embedding-001` | 3072-dimensional clause embeddings (MRL enabled) |
| **Vector DB** | PostgreSQL 17 | `pgvector/pgvector:pg17` | HNSW (`vector_cosine_ops`, m=16, ef=64) | Clause indexing & similarity matching |

See `PROVIDERS.md` and `BENCHMARK_PROVENANCE.md` for complete technical details.

---

## 🛡️ Security & Integrity Enforcements

- **Naming Contract Check:** `npm run check:naming` fails CI if any file name references a vendor that is not actively used in that file.
- **SQL Parameterization Check:** `npm run check:sql` verifies 100% parameterized queries ($1, $2, ...) and blocks string-interpolated SQL.
- **Data Privacy & Retention Policy:** Fenco does not use uploaded documents for model training. Documents, extracted clauses, and embeddings are stored temporarily for processing and analysis according to the application's retention policy. Text logs are strictly truncated to prevent full contract text exposure, and UUID-prefixed file storage prevents path traversal attacks.
- **Legal Trust Framing:** Mandatory legal disclaimers appear across every LLM system prompt, API response payload, and UI screen.

---

## 🧪 Running Tests

```bash
# Run Jest integration and unit test suite
npm run test

# Run CI security checks
npm run check:naming
npm run check:sql
```

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Zod-validated environment config
│   │   ├── db/              # pg connection, migrations, idempotent seeder
│   │   ├── middleware/      # Rate limiting, error handling, validation
│   │   ├── modules/         # Ingestion, scoring, QA, comparison, checklist
│   │   ├── routes/          # Express REST API routes
│   │   ├── services/        # llmService, embeddingService, cacheService
│   │   └── server.ts        # Express entry point
│   └── tests/               # Health, pipeline, and security test suite
├── frontend/
│   ├── src/
│   │   ├── api/             # Typed API client
│   │   ├── components/      # UI components (ClauseCard, ChatPanel, Badges)
│   │   ├── pages/           # Upload, Analysis, Comparison, Attorney Prep
│   │   └── styles/          # Design tokens (WCAG AA accessible palette)
│   └── index.html
├── demo-contracts/          # 4 sample contracts for instant judge testing
├── scripts/                 # Bootstrap and CI verification scripts
├── BENCHMARK_PROVENANCE.md  # Detailed origin of benchmark corpus
├── DEMO_SCRIPT.md           # 3-minute hackathon pitch walkthrough
├── DIFFERENTIATION.md       # One-slide technical differentiation
└── PROVIDERS.md             # Source of truth for live AI providers
```

---

## 📄 License & Disclaimer

**Informational Use Only:** FENCO 2.0 is an artificial intelligence research platform and does not provide legal advice. Contract analysis and counter-drafts are provided for educational and negotiation preparation purposes. Users should always consult a licensed attorney in their jurisdiction before entering into binding legal agreements.
