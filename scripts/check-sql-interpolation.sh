#!/usr/bin/env bash
# FENCO 2.0 — CI: SQL String Interpolation Check (§12)
# Fails if any TypeScript file contains string-interpolated SQL queries.
# Parameterized SQL only: query($1, $2) not query(`SELECT ${var}`)

set -e
FAILED=0

# Look for backtick template literals containing SQL keywords
if grep -rn 'query(`.*\$\{' backend/src/ 2>/dev/null; then
  echo "❌ SQL INTERPOLATION DETECTED: Use parameterized queries (\$1, \$2, ...) instead."
  FAILED=1
fi

if [ $FAILED -eq 1 ]; then
  exit 1
else
  echo "✅ SQL interpolation check passed. No string-interpolated queries found."
fi
