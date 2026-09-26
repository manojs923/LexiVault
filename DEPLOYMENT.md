# LexiVault — Production Deployment Guide

LexiVault is designed for containerized production deployment with PostgreSQL 17 + pgvector, Redis caching, an Express TypeScript backend, and an Nginx-served Vite React frontend.

---

## 🚀 Option 1: Docker Compose Production (Fastest & Recommended)

This builds and launches the complete production stack (Postgres + pgvector, Redis, Backend, and Nginx Frontend) in one command.

### Prerequisites
- [Docker & Docker Compose](https://www.docker.com/) installed and running.

### Steps

1. **Configure Environment:**
   Ensure `backend/.env` has your API keys set:
   ```env
   MISTRAL_API_KEY=your_mistral_api_key
   LLM_PROVIDER=mistral
   # Optional: GEMINI_API_KEY=your_gemini_key
   ```

2. **Launch Production Containers:**
   From the repository root (`D:\Prompt_WAR`):
   ```bash
   docker compose -f docker-compose.prod.yml up --build -d
   ```

3. **Run Database Migrations & Seed Benchmark Knowledge Base:**
   Once the containers are up, execute the migrations and seeder inside the backend container:
   ```bash
   # Run migrations
   docker exec -it fenco_backend_prod npm run migrate

   # Seed 33 market-standard benchmark clauses
   docker exec -it fenco_backend_prod npm run seed
   ```

4. **Access the App:**
   - **Frontend (Nginx on Port 80):** Open `http://localhost` (or `http://<your-server-ip>`)
   - **Backend API (Port 3001):** `http://localhost:3001/api/health`

---

## 🌐 Option 2: Free Cloud Hosting (Render / Railway)

If you need a 24/7 public live URL for judges to test:

### A. Railway (Easiest Full Stack)
1. Fork or push this repository to your GitHub.
2. Sign in to [Railway.app](https://railway.app/).
3. Click **"New Project"** → **"Deploy from GitHub repo"**.
4. Add a **PostgreSQL Database** plugin in Railway, and enable the `pgvector` extension:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
5. Deploy the backend from `backend/Dockerfile` and set environment variables:
   - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}`
   - `MISTRAL_API_KEY`: your API key
   - `LLM_PROVIDER`: `mistral`
   - `CORS_ORIGIN`: your frontend URL
6. Deploy the frontend from `frontend/Dockerfile` (or as a static Vite site).

---

### B. Render
1. Create a **PostgreSQL Database** on [Render.com](https://render.com/).
2. Create a **Web Service** pointing to `./backend`:
   - Runtime: `Docker`
   - Environment Variables:
     - `DATABASE_URL`: (from Render Postgres)
     - `MISTRAL_API_KEY`: (your key)
     - `LLM_PROVIDER`: `mistral`
3. Create a **Static Site** pointing to `./frontend`:
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Rewrite rule: `/*` → `/index.html` (for React client routing)

---

## 🛡️ Health Check Verification

Verify the deployment status:
```bash
curl http://localhost:3001/api/health
```

Expected JSON response:
```json
{
  "status": "ok",
  "service": "lexivault-api",
  "version": "2.0.0",
  "timestamp": "2026-09-26T...",
  "providers": {
    "llm": "gemini-3.8-flash",
    "embedding": "gemini-embedding-001"
  }
}
```
