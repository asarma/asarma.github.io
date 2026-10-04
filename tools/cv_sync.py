#!/usr/bin/env python3
"""Add new papers, awards, talks and media from the site data into the Word CV.

Reads data/publications.json and data/news.json, compares with tools/cv_state.json
(what is already in the CV), and inserts anything new into the CV .docx in the
matching section, numbered and formatted like the existing entries:

  Journal            -> REFEREED JOURNAL PUBLICATIONS        (J.n)
  Conference/Workshop-> REFEREED CONFERENCE & WORKSHOP ...   (C. n)
  Book Chapter       -> BOOK CHAPTERS                        (BC.n)
  Preprint           -> MANUSCRIPTS UNDER REVIEW AND PREPRINTS (U.n)
  Award              -> NOTABLE AWARDS
  Keynote/Talk/Panel -> INVITED PRESENTATIONS                (P. n)
  Press/TV/Radio/... -> MEDIA COVERAGE                       (M.n)

A preprint that later gets published is moved from U.n to J.n / C. n.

Usage:  python3 tools/cv_sync.py [path/to/cv.docx]   (default: newest sarma_CV_*.docx in the site root)
        python3 tools/cv_sync.py --seed               mark everything currently in the data as already in the CV
"""
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path
from xml.dom import minidom
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / 'tools/cv_state.json'
PUB_TYPES = {'Journal': 'J', 'Conference': 'C', 'Workshop': 'C', 'Book Chapter': 'BC', 'Preprint': 'U'}
TALKS = {'Keynote', 'Talk', 'Panel'}
MEDIA = {'Press', 'TV', 'Radio', 'Podcast', 'Newsletter'}
MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']

RPR = '<w:rPr><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'
RPR_I = '<w:rPr><w:i/><w:iCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'


def norm(s):
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def news_key(n):
    return n['date'] + '|' + norm(n['title'])[:60]


def load(p):
    return json.loads((ROOT / p).read_text())


# ---------------------------------------------------------------- paragraph builders (same layout as the CV)
def run(t, italic=False):
    return f'<w:r>{RPR_I if italic else RPR}<w:t xml:space="preserve">{escape(t)}</w:t></w:r>'


def pub_para(label, authors, title, rest, before=True):
    sp = '<w:spacing w:before="120"/>' if before else '<w:spacing w:after="120"/>'
    return ('<w:p><w:pPr><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/><w:adjustRightInd w:val="0"/>'
            f'{sp}<w:ind w:left="720" w:hanging="720"/>{RPR}</w:pPr>'
            f'<w:r>{RPR}<w:t xml:space="preserve">{escape(label)}</w:t><w:tab/><w:t xml:space="preserve">{escape(authors)}</w:t></w:r>'
            + run(title, True) + run(rest) + '</w:p>')


def line_para(label, text):
    return ('<w:p><w:pPr><w:autoSpaceDE w:val="0"/><w:autoSpaceDN w:val="0"/><w:adjustRightInd w:val="0"/>'
            f'<w:spacing w:after="120"/><w:ind w:left="720" w:hanging="720"/>{RPR}</w:pPr>'
            f'<w:r>{RPR}<w:t xml:space="preserve">{escape(label)}</w:t><w:tab/><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>')


def award_para(year, text):
    return ('<w:p><w:pPr><w:pStyle w:val="pageonedata"/><w:tabs><w:tab w:val="clear" w:pos="4500"/></w:tabs>'
            '<w:ind w:left="1080" w:hanging="1080"/></w:pPr>'
            f'<w:r><w:t>{escape(str(year))}</w:t><w:tab/><w:t xml:space="preserve">{escape(text)}</w:t></w:r></w:p>')


def cv_authors(a):
    """'R Choudhuri, C Bird, A Sarma' -> 'R. Choudhuri, C. Bird, and A. Sarma'"""
    a = re.sub(r'\b([A-Z])(?=[A-Z]*\s)', r'\1.', a)              # initials -> initials with periods
    a = re.sub(r'\b([A-Z])\.([A-Z])\.?\s', r'\1. \2. ', a)
    parts = [p.strip() for p in re.split(r',\s*(?:and\s+)?|\s+and\s+', a) if p.strip() and p.strip() != '...']
    if not parts:
        return a
    return parts[0] if len(parts) == 1 else ', '.join(parts[:-1]) + ', and ' + parts[-1]


def month_year(iso):
    y, m, _ = iso.split('-')
    return f'{MONTHS[int(m) - 1]} {y}'


# ---------------------------------------------------------------- document helpers
class Doc:
    def __init__(self, xml):
        self.xml = xml

    def paras(self):
        return [(m.start(), m.end(), m.group(0)) for m in re.finditer(r'<w:p[ >].*?</w:p>', self.xml, re.S)]

    @staticmethod
    def text(p):
        p = p.replace('<w:tab/>', '<w:t>\t</w:t>')   # keep tabs so 'M.1<tab>2018' isn't read as M.12018
        return ''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p)).replace('&amp;', '&')

    def top_label(self, prefix):
        """(start offset, number) of the highest-numbered entry with this prefix, e.g. 'J' -> J.39."""
        best = None
        for s, _, p in self.paras():
            m = re.match(rf'^{prefix}\.\s?(\d+)(?!\d)', self.text(p).strip())
            if m and (best is None or int(m.group(1)) > best[1]):
                best = (s, int(m.group(1)))
        return best

    def heading_end(self, title):
        for _, e, p in self.paras():
            if self.text(p).strip().upper().startswith(title):
                return e
        return None

    def insert_at(self, offset, xml):
        self.xml = self.xml[:offset] + xml + self.xml[offset:]

    def remove_para_containing(self, title):
        n = norm(title)
        for s, e, p in self.paras():
            if n and n[:50] in norm(self.text(p)):
                self.xml = self.xml[:s] + self.xml[e:]
                return True
        return False


def label(prefix, num):
    return {'J': f'J.{num}', 'C': f'C. {num}', 'BC': f'BC.{num}', 'U': f'U.{num}', 'P': f'P. {num}', 'M': f'M.{num}'}[prefix]


def pub_rest(p):
    venue = p.get('venue', '')
    if p['type'] == 'Preprint':
        rest = f", arXiv:{p['arxiv']}, {p['year']} (under review)." if p.get('arxiv') else f", {venue}, {p['year']} (under review)."
    else:
        rest = f', {venue}' + ('' if str(p['year']) in venue else f', {p["year"]}') + '.'
    if p.get('award'):
        rest += f" [{p['award']}]"
    return rest


# ---------------------------------------------------------------- main
def main():
    args = sys.argv[1:]
    pubs, news = load('data/publications.json'), load('data/news.json')

    if args and args[0] == '--seed':
        state = {'pubs': {p['id']: p['type'] for p in pubs},
                 'news': sorted(news_key(n) for n in news if not n.get('draft'))}
        STATE.write_text(json.dumps(state, indent=1, ensure_ascii=False))
        print(f"Seeded: {len(state['pubs'])} papers, {len(state['news'])} news items marked as already in the CV.")
        return

    docx = Path(args[0]) if args else max(ROOT.glob('sarma_CV_*.docx'), key=lambda p: p.stat().st_mtime)
    state = json.loads(STATE.read_text())
    seen_news = set(state['news'])

    work = Path(tempfile.mkdtemp())
    with zipfile.ZipFile(docx) as z:
        z.extractall(work)
    docxml = work / 'word/document.xml'
    doc = Doc(docxml.read_text(encoding='utf-8'))
    changes = []

    # Papers: new ones, and preprints that were published since the last sync
    for p in sorted(pubs, key=lambda d: (d.get('year') or 0, d.get('added', ''))):
        prev = state['pubs'].get(p['id'])
        if prev == p['type'] or p['type'] not in PUB_TYPES:
            continue
        if prev == 'Preprint' and p['type'] != 'Preprint':
            doc.remove_para_containing(p['title'])
            changes.append(f"moved to published: {p['title']}")
        prefix = PUB_TYPES[p['type']]
        top = doc.top_label(prefix)
        if not top:
            print(f"WARNING: no {prefix}.n entries found in the CV; skipped {p['title']}")
            continue
        para = pub_para(label(prefix, top[1] + 1), cv_authors(p['authors']) + ', ', p['title'], pub_rest(p))
        doc.insert_at(top[0], para)
        state['pubs'][p['id']] = p['type']
        changes.append(f"{label(prefix, top[1] + 1)} {p['title']}")

    # Awards, talks, media from the news data (oldest first so numbering stays chronological)
    for n in sorted((n for n in news if not n.get('draft')), key=lambda d: d['date']):
        key = news_key(n)
        if key in seen_news:
            continue
        if n['type'] == 'Award':
            end = doc.heading_end('NOTABLE AWARDS')
            if end:
                doc.insert_at(end, award_para(n['date'][:4], n['title']))
                changes.append(f"Award: {n['title']}")
        elif n['type'] in TALKS:
            top = doc.top_label('P')
            kind = {'Keynote': 'Keynote', 'Panel': 'Invited Panel'}.get(n['type'], 'Invited Talk')
            text = f"{month_year(n['date'])}, {kind}, {n['title']}" + (f", {n['outlet']}" if n.get('outlet') else '')
            doc.insert_at(top[0], line_para(label('P', top[1] + 1), text))
            changes.append(f"{label('P', top[1] + 1)} {n['title']}")
        elif n['type'] in MEDIA:
            top = doc.top_label('M')
            text = f"{month_year(n['date'])}, {n.get('outlet', '')}, “{n['title']}”"
            doc.insert_at(top[0], line_para(label('M', top[1] + 1), text))
            changes.append(f"{label('M', top[1] + 1)} {n.get('outlet', '')}: {n['title']}")
        seen_news.add(key)

    if not changes:
        print('CV already up to date.')
        shutil.rmtree(work)
        return

    minidom.parseString(doc.xml.encode('utf-8'))   # refuse to write a broken document
    docxml.write_text(doc.xml, encoding='utf-8')
    tmp = docx.with_suffix('.tmp.docx')
    with zipfile.ZipFile(docx) as src, zipfile.ZipFile(tmp, 'w', zipfile.ZIP_DEFLATED) as out:
        for item in src.infolist():
            out.writestr(item, (work / item.filename).read_bytes() if not item.is_dir() else b'')
    tmp.replace(docx)
    shutil.rmtree(work)

    state['news'] = sorted(seen_news)
    STATE.write_text(json.dumps(state, indent=1, ensure_ascii=False))
    print(f'Updated {docx.name}:')
    for c in changes:
        print('  +', c)


if __name__ == '__main__':
    main()
