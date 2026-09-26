# LexiVault — Repo Size & Submission Pre-Flight Checker
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  LexiVault Hackathon Repo Size Pre-Flight Check" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 1. Check if git is initialized
if (!(Test-Path ".git")) {
    Write-Host "❌ Git is not initialized in this folder." -ForegroundColor Red
    exit 1
}

# 2. Check tracked files in Git
Write-Host "`n🔍 Checking files tracked by Git..." -ForegroundColor Yellow
$trackedFiles = git ls-files

# Check for accidental inclusions
$badFiles = $trackedFiles | Where-Object { 
    $_ -match "node_modules" -or 
    $_ -match "\.env$" -or 
    $_ -match "dist/" -or 
    $_ -match "build/" -or
    $_ -match "uploads/"
}

if ($badFiles) {
    Write-Host "⚠️  WARNING: Found files that should not be tracked in Git:" -ForegroundColor Red
    $badFiles | ForEach-Object { Write-Host "   - $_" -ForegroundColor Red }
    Write-Host "`nTo untrack them run:" -ForegroundColor Yellow
    Write-Host "   git rm -r --cached node_modules dist uploads .env" -ForegroundColor White
} else {
    Write-Host "✅ No node_modules, dist, uploads, or .env files are tracked!" -ForegroundColor Green
}

# 3. Calculate source code files size (excluding git, node_modules, dist)
$srcFiles = Get-ChildItem -Recurse -File \vert{} Where-Object {$_.FullName -notmatch "\\(\.git|node_modules|dist|build|uploads)\\"
}
$srcSizeMB = ($srcFiles | Measure-Object -Property Length -Sum).Sum / 1MB

# 4. Calculate .git directory size
$gitSizeMB = 0
if (Test-Path ".git") {
    $gitFiles = Get-ChildItem -Path ".git" -Recurse -File -Force -ErrorAction SilentlyContinue
    $gitSizeMB = ($gitFiles | Measure-Object -Property Length -Sum).Sum / 1MB
}

Write-Host "`n📊 Repository Size Summary:" -ForegroundColor White
Write-Host "   Source Code Size : $([math]::Round($srcSizeMB, 2)) MB" -ForegroundColor Green
Write-Host "   .git Folder Size : $([math]::Round($gitSizeMB, 2)) MB" -ForegroundColor $(if ($gitSizeMB -gt 9) { "Red" } else { "Green" })
Write-Host "   Total Local Size : $([math]::Round($srcSizeMB + $gitSizeMB, 2)) MB" -ForegroundColor White

Write-Host "-------------------------------------------------"
if ($srcSizeMB -lt 5 -and $gitSizeMB -lt 9 -and !$badFiles) {
    Write-Host "🎉 PASS: Your repository is SAFELY UNDER 10 MB!" -ForegroundColor Green
    Write-Host "   GitHub repo size on remote will be approximately $([math]::Round($gitSizeMB, 2)) MB." -ForegroundColor Green
    Write-Host "   Ready for submission!" -ForegroundColor Green
} else {
    Write-Host "⚠️  ATTENTION NEEDED:" -ForegroundColor Yellow
    if ($badFiles -or $gitSizeMB -ge 9) {
        Write-Host "   Run the reset commands provided in the prompt to prune git history." -ForegroundColor Yellow
    }
}
Write-Host "=================================================`n"