#!/usr/bin/env bash
# FENCO 2.0 — One-command local bootstrap
# Usage: npm run setup (from repo root)

set -e

echo "🚀 FENCO 2.0 Bootstrap"
echo "====================="

# Check prerequisites
command -v docker &>/dev/null || { echo '❌ Docker is required. Install from https://docker.com'; exit 1; }
command -v node &>/dev/null || { echo '❌ Node.js is required. Install from https://nodejs.org'; exit 1; }

# Step 1: Copy env if not exists
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  echo "⚠️  Created backend/.env from template."
  echo "   Edit GEMINI_API_KEY in backend/.env before starting."
fi

# Step 2: Start Docker services
echo "📦 Starting Docker services (PostgreSQL + Redis)..."
docker compose up -d
echo "   Waiting for services to be healthy..."
for i in {1..30}; do
  if docker compose ps | grep -q 'healthy'; then
    echo "   ✅ Services healthy"
    break
  fi
  sleep 2
done

# Step 3: Install backend deps
echo "📦 Installing backend dependencies..."
(cd backend && npm install)

# Step 4: Run migrations
echo "🗄️  Running database migrations..."
(cd backend && npm run migrate)

# Step 5: Run seeder
echo "🌱 Seeding benchmark corpus..."
(cd backend && npm run seed) || echo "⚠️  Seeder skipped (check GEMINI_API_KEY)"

# Step 6: Install frontend deps
echo "📦 Installing frontend dependencies..."
(cd frontend && npm install)

echo ""
echo "✅ Bootstrap complete!"
echo ""
echo "To start the dev servers:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Or run: npm run dev (from repo root, if using concurrently)"
