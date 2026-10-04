#!/bin/bash
# Daily refresh: Scholar metrics + new papers -> site data -> CV -> PDF -> GitHub.
# Usage: tools/daily_update.sh            (run from anywhere)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Scholar"
if ! python3 tools/update_scholar.py; then
  echo "SCHOLAR_FAILED"   # usually a temporary bot check; keep yesterday's numbers
fi

echo "== CV"
CV_OUT="$(python3 tools/cv_sync.py)"; echo "$CV_OUT"
if ! grep -q "already up to date" <<<"$CV_OUT"; then
  tools/export_cv_pdf.sh || echo "PDF_EXPORT_FAILED"
fi

echo "== Publish"
git add data tools assets/Sarma_CV.pdf
if git diff --cached --quiet; then
  echo "Nothing changed."
else
  git commit -q -m "Daily update: Scholar metrics and new items ($(date +%Y-%m-%d))" && git push -q origin main && echo "PUSHED"
fi
