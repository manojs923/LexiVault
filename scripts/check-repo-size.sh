#!/bin/bash
echo "================================================="
echo "  LexiVault Hackathon Repo Size Pre-Flight Check"
echo "================================================="

if [ ! -d ".git" ]; then
    echo "❌ Git is not initialized."
    exit 1
fi

echo "🔍 Checking tracked files in Git..."
badFiles=$(git ls-files | grep -E "node_modules|\.env$|dist/|build/|uploads/" || true)

if [ -n "$badFiles" ]; then
    echo "⚠️  WARNING: Files that shouldn't be tracked found in Git:"
    echo "$badFiles"
    echo "To untrack: git rm -r --cached node_modules dist uploads .env"
else
    echo "✅ Clean: No node_modules, dist, uploads, or .env files tracked."
fi

gitSize=$(du -sh .git 2>/dev/null | cut -f1)
echo "📊 Git folder size: $gitSize"
echo "================================================="
