#!/bin/bash
# Publish reviewed changes: commit the site data, CV and tools, then push to GitHub.
# Run only after Anita has approved the pending changes.
# Usage: tools/publish.sh "Short description of what changed"
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

git add data tools assets/Sarma_CV.pdf
if git diff --cached --quiet; then
  echo "Nothing to publish."
  exit 0
fi
git commit -q -m "${1:-Weekly update ($(date +%Y-%m-%d))}"
git push -q origin main
echo "PUSHED"
