#!/usr/bin/env python3
"""Refresh site data from Google Scholar.

- data/metrics.json        citations, h-index, i10-index (all-time and last 5 years)
- data/publications.json   per-paper citation counts; new papers appended and tagged;
                           preprints upgraded when their published version appears
- data/news.json           a "Paper" item for each newly found paper
- tools/last_run.json      what changed in this run (read by the scheduled job)

Run from the site root:  python3 tools/update_scholar.py
Scholar blocks datacenter IPs, so run this from a normal home/office connection.
Standard library only.
"""
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHOLAR_USER = 'shMjCasAAAAJ'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36'
TODAY = dt.date.today().isoformat()

PUBS = ROOT / 'data/publications.json'
NEWS = ROOT / 'data/news.json'
METRICS = ROOT / 'data/metrics.json'
IGNORE = ROOT / 'tools/scholar_ignore.json'
LAST = ROOT / 'tools/last_run.json'


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9'})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode('utf-8', 'replace')
        except Exception as e:  # network hiccup or throttling
            if i == tries - 1:
                raise
            time.sleep(5 * (i + 1))


def norm(s):
    return re.sub(r'[^a-z0-9]', '', html.unescape(s or '').lower())


def clean(x):
    return html.unescape(re.sub(r'<[^>]+>', '', x)).strip()


# ---------------------------------------------------------------- Scholar
def fetch_scholar():
    rows, metrics = [], None
    for start in range(0, 1000, 100):
        page = get(f'https://scholar.google.com/citations?user={SCHOLAR_USER}&hl=en&cstart={start}&pagesize=100&sortby=pubdate')
        if 'gsc_a_tr' not in page and start == 0:
            raise RuntimeError('Scholar returned no publication table (probably a CAPTCHA/bot check).')
        if metrics is None:
            nums = [int(n) for n in re.findall(r'class="gsc_rsb_std">(\d+)<', page)]
            if len(nums) >= 6:
                metrics = dict(citations=nums[0], citations5y=nums[1], hIndex=nums[2], hIndex5y=nums[3], i10=nums[4], i105y=nums[5])
        found = 0
        for tr in re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', page, re.S):
            t = re.search(r'class="gsc_a_at">(.*?)</a>', tr, re.S)
            if not t:
                continue
            grays = re.findall(r'<div class="gs_gray">(.*?)</div>', tr, re.S)
            cit = re.search(r'class="gsc_a_ac gs_ibl">(\d*)<', tr)
            yr = re.search(r'class="gsc_a_h gsc_a_hc gs_ibl">(\d*)<', tr)
            link = re.search(r'href="(/citations\?view_op=view_citation[^"]*)"', tr)
            rows.append(dict(
                title=clean(t.group(1)),
                authors=clean(grays[0]) if grays else '',
                venue=clean(grays[1]) if len(grays) > 1 else '',
                year=int(yr.group(1)) if yr and yr.group(1) else None,
                cites=int(cit.group(1)) if cit and cit.group(1) else 0,
                scholar='https://scholar.google.com' + html.unescape(link.group(1)) if link else None,
            ))
            found += 1
        if found < 100:
            break
        time.sleep(4)
    if metrics is None:
        raise RuntimeError('Could not read citation metrics from Scholar.')
    return rows, metrics


# ---------------------------------------------------------------- enrichment
def arxiv_meta(arxiv_id):
    try:
        x = get(f'https://export.arxiv.org/api/query?id_list={arxiv_id}')
        e = re.search(r'<entry>(.*?)</entry>', x, re.S).group(1)
        names = re.findall(r'<name>(.*?)</name>', e)
        summary = re.sub(r'\s+', ' ', re.search(r'<summary>(.*?)</summary>', e, re.S).group(1)).strip()
        return names, summary
    except Exception:
        return None, None


def openalex_meta(title):
    try:
        q = urllib.parse.quote(title)
        d = json.loads(get(f'https://api.openalex.org/works?search={q}&per-page=3&select=title,doi,abstract_inverted_index,open_access'))
        for w in d.get('results', []):
            if norm(w.get('title')) == norm(title):
                inv = w.get('abstract_inverted_index') or {}
                abstract = ' '.join(k for _, k in sorted((p, k) for k, v in inv.items() for p in v)) or None
                return w.get('doi'), abstract, (w.get('open_access') or {}).get('oa_url')
    except Exception:
        pass
    return None, None, None


def initials(full):
    """'Rudrajit Choudhuri' -> 'R. Choudhuri'; keeps 'A. Sarma' style for the site."""
    parts = full.replace('.', '').split()
    if len(parts) < 2:
        return full
    return ' '.join(p[0] + '.' for p in parts[:-1]) + ' ' + parts[-1]


def join_authors(names):
    names = [initials(n) for n in names]
    return names[0] if len(names) == 1 else ', '.join(names[:-1]) + ', and ' + names[-1]


# ---------------------------------------------------------------- classification (mirrors the original tagging)
VEN = [
    (r'Software Engineering in Society|SEIS', 'ICSE-SEIS'), (r'Software Engineering in Practice|SEIP', 'ICSE-SEIP'),
    (r'Software Engineering Education and Training|CSEE&T', 'CSEE&T'),
    (r'Transactions on Software Engineering and Methodology|TOSEM', 'TOSEM'),
    (r'Transactions on Software Engineering|\bTSE\b', 'TSE'), (r'Communications of the ACM', 'CACM'),
    (r'IEEE Software', 'IEEE Software'), (r'Empirical Software Engineering and Measurement|ESEM', 'ESEM'),
    (r'Empirical Software Engineering', 'EMSE'), (r'Information and Software Technology', 'IST'),
    (r'Computer[- ]Supported Cooperative Work|CSCW|Human-Computer Interaction \d', 'CSCW'),
    (r'Human Factors in Computing|\bCHI\b', 'CHI'), (r'Foundations of Software Engineering|\bFSE\b', 'FSE'),
    (r'Software Maintenance and Evolution|ICSME', 'ICSME'), (r'Mining Software Repositories|\bMSR\b', 'MSR'),
    (r'Automated Software Engineering', 'ASE'), (r'Visual Languages|VL/HCC', 'VL/HCC'),
    (r'Cooperative and Human Aspects|CHASE', 'CHASE'), (r'Computing Education Research|ICER', 'ICER'),
    (r'Computer-Supported Collaborative Learning|CSCL', 'CSCL'), (r'Program Comprehension|ICPC', 'ICPC'),
    (r'International Conference on Software Engineering|ICSE', 'ICSE'), (r'arXiv', 'arXiv'),
]
TAGS = {
    'Human–AI Collaboration': r'\bai\b|genai|generative|llm|chatgpt|copilot|conversational|chatbot|machine learning|\bml\b|automat(ed|ion)|agent|ai-native|human subjects',
    'Learning & CS Education': r'student|learning|education|courseware|teaching|novice|tutor|training|classes|cognitive habits',
    'Inclusive Design & GenderMag': r'gender|inclusiv|diversity|diverse|\bses\b|intersectional|women|mosip|mag\b|cognitive diversity|gender.biased',
    'Open Source Communities': r'open.?source|\boss\b|apache|linux|contributor|github|maintainer|community|communities|ecosystem',
    'Mentoring & Onboarding': r'mentor|newcomer|onboard|barriers to entry|welcome',
    'Developer Well-being & Belonging': r'burnout|belong|welcome|success|motivation|well-being|wellbeing|interpersonal',
    'Coordination & Collaboration': r'coordinat|conflict|merge|awareness|workspace|distributed|collaborat|congruence|team|interdependent',
    'Developer Cognition & Tools': r'cogniti|bias|comprehension|context|foraging|sensemak|notebook|debug|readab|difficult|code review',
    'End-User Programming': r'end.user|mashup|end users|trigger.action',
    'Software Analytics & Visualization': r'visuali|repositor|dataset|dashboard|expertise|issue tracking|\bapis?\b',
    'Privacy & Security': r'privacy|security|violation detection|trigger.action',
    'Developer Productivity & Trust': r'productivity|trust|adoption|autonomy|developers want|co-worker|spurious',
}
NOISE = re.compile(r'NSF Award|Award Number|magazine archive', re.I)


def classify(title, venue):
    if re.search(r'arxiv', venue, re.I):
        kind = 'Preprint'
    elif re.search(r'Transactions|Journal|Empirical Software Engineering \d|IEEE Software|Communications of the ACM|Information and Software Technology|Proc\. ACM', venue):
        kind = 'Journal'
    elif re.search(r'Workshop', venue, re.I):
        kind = 'Workshop'
    else:
        kind = 'Conference'
    short = next((s for p, s in VEN if re.search(p, venue)), '')
    hay = (title + ' ' + short).lower()
    tags = [t for t, p in TAGS.items() if re.search(p, hay)] or ['Human–AI Collaboration' if re.search(r'\bai\b', hay) else 'Coordination & Collaboration']
    return kind, short, tags


# ---------------------------------------------------------------- main
def main():
    pubs = json.loads(PUBS.read_text())
    news = json.loads(NEWS.read_text())
    old_metrics = json.loads(METRICS.read_text()) if METRICS.exists() else {}
    rows, metrics = fetch_scholar()

    by_norm = {norm(p['title']): p for p in pubs}
    ignore = set(json.loads(IGNORE.read_text())) if IGNORE.exists() else None
    report = {'date': TODAY, 'metrics_before': {k: old_metrics.get(k) for k in ('citations', 'hIndex', 'i10')},
              'metrics_after': {k: metrics[k] for k in ('citations', 'hIndex', 'i10')},
              'new_papers': [], 'upgraded': [], 'cites_updated': 0}

    # First run: everything on Scholar today is either already on the site or deliberately left out.
    if ignore is None:
        def listed(n):
            return n in by_norm or any(len(n) > 30 and len(k) > 30 and (n in k or k in n) for k in by_norm)
        ignore = {norm(r['title']) for r in rows if not listed(norm(r['title']))}
        IGNORE.write_text(json.dumps(sorted(ignore), indent=0))

    best_cites = {}
    next_id = 1 + max([int(p['id'][2:]) for p in pubs if p['id'].startswith('S.')] or [0])
    for r in rows:
        n = norm(r['title'])
        if not n:
            continue
        p = by_norm.get(n) or next((v for k, v in by_norm.items() if len(n) > 30 and len(k) > 30 and (n in k or k in n)), None)
        if p:
            # A paper can appear twice on Scholar (preprint + published); keep the higher count.
            best_cites[p['id']] = max(best_cites.get(p['id'], 0), r['cites'] or 0)
            # A preprint we list has now appeared at a venue: upgrade it in place.
            if p['type'] == 'Preprint' and r['venue'] and not re.search(r'arxiv', r['venue'], re.I):
                kind, short, _ = classify(r['title'], r['venue'])
                p.update(type=kind, venue=re.sub(r',?\s*\d{4}$', '', r['venue']), venueShort=short or p.get('venueShort'), year=r['year'] or p['year'])
                p.pop('status', None)
                report['upgraded'].append({'id': p['id'], 'title': p['title'], 'venue': p['venue'], 'type': kind})
            continue
        if n in ignore or NOISE.search(r['title'] + ' ' + r['venue']) or not r['year']:
            continue
        kind, short, tags = classify(r['title'], r['venue'])
        arx = re.search(r'arXiv:(\d{4}\.\d{4,5})', r['venue'])
        authors, abstract = r['authors'], None
        if arx:
            names, abstract = arxiv_meta(arx.group(1))
            if names:
                authors = join_authors(names)
        doi, oa_abs, oa = openalex_meta(r['title'])
        entry = {
            'id': f'S.{next_id}', 'type': kind, 'title': r['title'], 'authors': authors,
            'venue': 'arXiv preprint' if kind == 'Preprint' else re.sub(r',?\s*\d{4}$', '', r['venue']),
            'venueShort': short or ('arXiv' if kind == 'Preprint' else ''), 'year': r['year'], 'tags': tags,
            'cites': r['cites'], 'scholar': r['scholar'], 'added': TODAY,
        }
        if kind == 'Preprint':
            entry['status'] = 'Preprint'
        if arx:
            entry['arxiv'] = arx.group(1)
        if doi:
            entry['doi'] = doi
        if oa:
            entry['oa'] = oa
        if abstract or oa_abs:
            entry['abstract'] = abstract or oa_abs
        pubs.append(entry)
        by_norm[n] = entry
        next_id += 1
        report['new_papers'].append({k: entry.get(k) for k in ('id', 'type', 'title', 'authors', 'venue', 'year', 'arxiv', 'doi', 'tags')})
        news.append({'date': TODAY, 'type': 'Paper',
                     'title': f'New {"preprint" if kind == "Preprint" else "paper"}: “{r["title"]}”',
                     'outlet': entry['venueShort'] or entry['venue'],
                     'url': entry.get('doi') or (f'https://arxiv.org/abs/{entry["arxiv"]}' if arx else r['scholar'])})

    for p in pubs:
        c = best_cites.get(p['id'])
        if c and c != p.get('cites'):
            p['cites'] = c
            report['cites_updated'] += 1

    order = {'Journal': 0, 'Conference': 1, 'Book Chapter': 2, 'Workshop': 3, 'Preprint': 4, 'Tech Report': 5}
    pubs.sort(key=lambda d: (-(d.get('year') or 0), order.get(d['type'], 9)))
    news.sort(key=lambda d: d['date'], reverse=True)

    metrics.update(source='Google Scholar', profile=f'https://scholar.google.com/citations?user={SCHOLAR_USER}', updated=TODAY)
    PUBS.write_text(json.dumps(pubs, ensure_ascii=False, separators=(',', ':')))
    NEWS.write_text(json.dumps(news, ensure_ascii=False, indent=1))
    METRICS.write_text(json.dumps(metrics, indent=1))
    IGNORE.write_text(json.dumps(sorted(ignore), indent=0))
    LAST.write_text(json.dumps(report, ensure_ascii=False, indent=1))
    print(json.dumps(report, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'ERROR: {e}', file=sys.stderr)
        sys.exit(1)
