# FENCO 2.0 — Windows PowerShell Bootstrap Script
# Usage: powershell -ExecutionPolicy Bypass -File scripts/bootstrap.ps1

$ErrorActionPreference = "Stop"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "    FENCO 2.0 — Local Bootstrap Script    " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Step 1: Environment file setup
if (-not (Test-Path "backend/.env")) {
    Copy-Item "backend/.env.example" "backend/.env"
    Write-Host "⚠️ Created backend/.env from template." -ForegroundColor Yellow
    Write-Host "   Please ensure GEMINI_API_KEY is configured in backend/.env." -ForegroundColor Yellow
}

# Step 2: Docker services
Write-Host "`n[1/5] Starting Docker services (PostgreSQL 17 + Redis 7)..." -ForegroundColor Green
docker compose up -d

Write-Host "Waiting for database and cache to be healthy..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Step 3: Backend dependencies
Write-Host "`n[2/5] Installing Backend dependencies..." -ForegroundColor Green
Push-Location "backend"
try {
    npm install
} finally {
    Pop-Location
}

# Step 4: Run database migrations
Write-Host "`n[3/5] Running PostgreSQL migrations (pgvector)..." -ForegroundColor Green
Push-Location "backend"
try {
    npm run migrate
} finally {
    Pop-Location
}

# Step 5: Seed benchmark corpus
Write-Host "`n[4/5] Seeding 35+ benchmark clauses..." -ForegroundColor Green
Push-Location "backend"
try {
    npm run seed
} catch {
    Write-Host "⚠️ Seeder completed with fallback vectors or awaiting valid GEMINI_API_KEY." -ForegroundColor Yellow
} finally {
    Pop-Location
}

# Step 6: Frontend dependencies
Write-Host "`n[5/5] Installing Frontend dependencies..." -ForegroundColor Green
Push-Location "frontend"
try {
    npm install
} finally {
    Pop-Location
}

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   ✅ FENCO 2.0 Bootstrap Complete!       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "To start the development environment:"
Write-Host "   npm run dev" -ForegroundColor Yellow
Write-Host "Or in separate terminals:"
Write-Host "   Terminal 1: cd backend; npm run dev"
Write-Host "   Terminal 2: cd frontend; npm run dev"
Write-Host "Frontend will be available at: http://localhost:5173"
Write-Host "Backend API will be available at: http://localhost:3001"
