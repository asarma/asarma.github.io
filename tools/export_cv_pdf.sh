#!/bin/bash
# Export the newest sarma_CV_*.docx in the site root to assets/Sarma_CV.pdf using Microsoft Word.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DOCX="$(ls -t "$ROOT"/sarma_CV_*.docx | head -1)"
osascript <<OSA
with timeout of 180 seconds
  tell application "Microsoft Word"
    set d to open file name (POSIX file "$DOCX" as text)
    delay 2
    save as d file name (POSIX file "$ROOT/assets/Sarma_CV.pdf" as text) file format format PDF
    try
      close d saving no
    on error
      try
        close (first document whose name is "$(basename "$DOCX")") saving no
      end try
    end try
  end tell
end timeout
OSA
echo "Exported $(basename "$DOCX") -> assets/Sarma_CV.pdf"
