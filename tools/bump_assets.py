#!/usr/bin/env python3
"""Stamp CSS/JS links in every page with a version (?v=...) so browsers never mix a new page with a cached old stylesheet.

Run after changing anything in assets/css or assets/js:  python3 tools/bump_assets.py
"""
import re
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
v = time.strftime('%Y%m%d%H%M')
pat = re.compile(r'((?:href|src)="assets/(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=[\w]+)?"')
for page in sorted(ROOT.glob('*.html')):
    s = page.read_text()
    new = pat.sub(rf'\1?v={v}"', s)
    if new != s:
        page.write_text(new)
        print(f'{page.name}: v={v}')
