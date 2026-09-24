#!/usr/bin/env bash
# FENCO 2.0 — CI: Naming Contract Check (§2)
# Fails if a vendor name appears in a filename but doesn't match the vendor imported.

set -e
FAILED=0

VENDORS=("anthropic" "openai" "voyage" "cohere" "azure" "bedrock")

for vendor in "${VENDORS[@]}"; do
  files=$(find backend/src -name "*${vendor}*" -type f 2>/dev/null || true)
  if [ -n "$files" ]; then
    for file in $files; do
      if ! grep -qi "${vendor}" "$file"; then
        echo "❌ NAMING VIOLATION: ${file} contains '${vendor}' in its name but doesn't import/use ${vendor}"
        FAILED=1
      fi
    done
  fi
done

if [ $FAILED -eq 1 ]; then
  echo "❌ Naming contract check FAILED. See violations above."
  exit 1
else
  echo "✅ Naming contract check passed. No vendor naming violations found."
fi
