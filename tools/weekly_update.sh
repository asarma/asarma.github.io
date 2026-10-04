#!/bin/bash
# Weekly refresh: Scholar metrics + new papers -> site data -> CV -> PDF.
# Changes stay on this Mac for Anita to review; nothing is published until tools/publish.sh runs.
# Usage: tools/weekly_update.sh            (run from anywhere)
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Scholar"
if ! python3 tools/update_scholar.py; then
  echo "SCHOLAR_FAILED"   # usually a temporary bot check; keep last week's numbers
fi

echo "== CV"
CV_OUT="$(python3 tools/cv_sync.py)"; echo "$CV_OUT"
if ! grep -q "already up to date" <<<"$CV_OUT"; then
  tools/export_cv_pdf.sh || echo "PDF_EXPORT_FAILED"
fi

echo "== Waiting for review (not published)"
git status --short data tools assets/Sarma_CV.pdf
