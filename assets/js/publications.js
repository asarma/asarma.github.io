(async function () {
  const { esc, getJSON, boldMe, ICONS, FIELDS, toast } = window.Site;
  const $ = id => document.getElementById(id);
  const TYPES = ['Journal', 'Conference', 'Workshop', 'Book Chapter', 'Preprint', 'Tech Report'];

  let PUBS = [];
  try { PUBS = await getJSON('data/publications.json'); }
  catch (e) {
    $('results').innerHTML = '<div class="empty glass"><h3>Couldn’t load publications</h3><p>If you opened this file directly, serve the folder with a local web server (see README).</p></div>';
    return;
  }

  PUBS.forEach(p => {
    p._hay = [p.title, p.authors, p.venue, p.venueShort, (p.tags || []).join(' '), p.abstract || '', p.year].join(' ').toLowerCase();
    p._cites = p.cites || 0;
  });
  const years = PUBS.map(p => p.year).filter(Boolean);
  const YMIN = Math.min(...years), YMAX = Math.max(...years);

  // ---------- state ----------
  const S = { q: '', fields: new Set(), types: new Set(), from: YMIN, to: YMAX, venue: '', award: false, archival: false, sort: 'new', open: new Set() };

  function readURL() {
    const u = new URLSearchParams(location.search);
    S.q = u.get('q') || '';
    S.fields = new Set((u.get('field') || u.get('tag') || '').split('|').filter(f => FIELDS[f]));
    S.types = new Set((u.get('type') || '').split('|').filter(t => TYPES.includes(t)));
    S.from = +u.get('from') || YMIN; S.to = +u.get('to') || YMAX;
    S.venue = u.get('venue') || '';
    S.award = u.get('award') === '1';
    S.archival = u.get('archival') === '1';
    S.sort = ['new', 'old', 'cites'].includes(u.get('sort')) ? u.get('sort') : 'new';
  }
  function writeURL() {
    const u = new URLSearchParams();
    if (S.q) u.set('q', S.q);
    if (S.fields.size) u.set('field', [...S.fields].join('|'));
    if (S.types.size) u.set('type', [...S.types].join('|'));
    if (S.from !== YMIN) u.set('from', S.from);
    if (S.to !== YMAX) u.set('to', S.to);
    if (S.venue) u.set('venue', S.venue);
    if (S.award) u.set('award', '1');
    if (S.archival) u.set('archival', '1');
    if (S.sort !== 'new') u.set('sort', S.sort);
    const qs = u.toString();
    history.replaceState(null, '', qs ? '?' + qs : location.pathname);
  }

  // ---------- filtering ----------
  const terms = () => S.q.toLowerCase().split(/\s+/).filter(Boolean);
  function matches(p, skip) {
    const t = terms();
    if (t.length && !t.every(w => p._hay.includes(w))) return false;
    if (skip !== 'fields' && S.fields.size && !(p.tags || []).some(f => S.fields.has(f))) return false;
    if (skip !== 'types' && S.types.size && !S.types.has(p.type)) return false;
    if (skip !== 'years' && (p.year < S.from || p.year > S.to)) return false;
    if (skip !== 'venue' && S.venue && p.venueShort !== S.venue) return false;
    if (S.award && !p.award) return false;
    if (S.archival && (p.type === 'Tech Report' || p.type === 'Preprint')) return false;
    return true;
  }

  // ---------- controls ----------
  function buildControls() {
    for (let y = YMIN; y <= YMAX; y++) {
      $('from').insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
      $('to').insertAdjacentHTML('beforeend', `<option value="${y}">${y}</option>`);
    }
    $('hmin').textContent = YMIN; $('hmax').textContent = YMAX;
    const vc = {};
    PUBS.forEach(p => { if (p.venueShort) vc[p.venueShort] = (vc[p.venueShort] || 0) + 1; });
    Object.entries(vc).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).forEach(([v, n]) => {
      if (n >= 2 && !/Tech Report|Workshop$|arXiv/.test(v)) $('venue').insertAdjacentHTML('beforeend', `<option value="${esc(v)}">${esc(v)} (${n})</option>`);
    });

    $('q').value = S.q;
    $('q').addEventListener('input', debounce(e => { S.q = e.target.value.trim(); update(); }, 120));
    $('from').addEventListener('change', e => { S.from = +e.target.value; if (S.from > S.to) S.to = S.from; update(); });
    $('to').addEventListener('change', e => { S.to = +e.target.value; if (S.to < S.from) S.from = S.to; update(); });
    $('venue').addEventListener('change', e => { S.venue = e.target.value; update(); });
    $('award').addEventListener('change', e => { S.award = e.target.checked; update(); });
    $('archival').addEventListener('change', e => { S.archival = e.target.checked; update(); });
    $('sort').addEventListener('change', e => { S.sort = e.target.value; update(); });
    document.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => { S[b.dataset.clear].clear(); update(); }));
    $('export').addEventListener('click', exportBib);
    $('filter-toggle').addEventListener('click', () => {
      const c = $('filters').classList.toggle('collapsed');
      $('filter-toggle').setAttribute('aria-expanded', String(!c));
    });
    if (matchMedia('(max-width: 980px)').matches) { $('filters').classList.add('collapsed'); $('filter-toggle').setAttribute('aria-expanded', 'false'); }

    document.addEventListener('keydown', e => {
      if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); $('q').focus(); }
      if (e.key === 'Escape' && document.activeElement === $('q')) { $('q').value = ''; S.q = ''; update(); }
    });

    $('f-fields').addEventListener('click', e => {
      const b = e.target.closest('[data-field]'); if (!b) return;
      toggle(S.fields, b.dataset.field); update();
    });
    $('f-types').addEventListener('click', e => {
      const b = e.target.closest('[data-type]'); if (!b) return;
      toggle(S.types, b.dataset.type); update();
    });
    $('hist').addEventListener('click', e => {
      const b = e.target.closest('[data-year]'); if (!b) return;
      const y = +b.dataset.year;
      if (S.from === y && S.to === y) { S.from = YMIN; S.to = YMAX; } else { S.from = S.to = y; }
      update();
    });
    $('active').addEventListener('click', e => {
      const b = e.target.closest('[data-rm]'); if (!b) return;
      const [k, v] = b.dataset.rm.split('::');
      if (k === 'field') S.fields.delete(v);
      if (k === 'type') S.types.delete(v);
      if (k === 'years') { S.from = YMIN; S.to = YMAX; }
      if (k === 'venue') S.venue = '';
      if (k === 'award') S.award = false;
      if (k === 'archival') S.archival = false;
      if (k === 'q') { S.q = ''; $('q').value = ''; }
      update();
    });
    $('results').addEventListener('click', e => {
      const tag = e.target.closest('[data-tagfilter]');
      if (tag) { S.fields = new Set([tag.dataset.tagfilter]); update(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
      const ab = e.target.closest('[data-abs]');
      if (ab) { const id = ab.dataset.abs; S.open.has(id) ? S.open.delete(id) : S.open.add(id); renderResults(); return; }
      const cite = e.target.closest('[data-cite]');
      if (cite) { copy(bibtex(PUBS.find(p => p.id === cite.dataset.cite))); }
    });
  }

  function syncControls() {
    $('from').value = S.from; $('to').value = S.to;
    $('venue').value = S.venue; $('award').checked = S.award; $('archival').checked = S.archival; $('sort').value = S.sort;

    // field chips with live counts
    const base = PUBS.filter(p => matches(p, 'fields'));
    $('f-fields').innerHTML = Object.entries(FIELDS).map(([f, c]) => {
      const n = base.filter(p => (p.tags || []).includes(f)).length;
      return `<button class="chip" type="button" data-field="${esc(f)}" aria-pressed="${S.fields.has(f)}" style="--c:${c}"><span class="dot"></span>${esc(f)}<span class="count">${n}</span></button>`;
    }).join('');
    const tbase = PUBS.filter(p => matches(p, 'types'));
    $('f-types').innerHTML = TYPES.map(t => {
      const n = tbase.filter(p => p.type === t).length;
      return `<button class="chip" type="button" data-type="${t}" aria-pressed="${S.types.has(t)}">${t}<span class="count">${n}</span></button>`;
    }).join('');

    // histogram
    const hbase = PUBS.filter(p => matches(p, 'years'));
    const counts = {}; hbase.forEach(p => counts[p.year] = (counts[p.year] || 0) + 1);
    const max = Math.max(1, ...Object.values(counts));
    let h = '';
    for (let y = YMIN; y <= YMAX; y++) {
      const n = counts[y] || 0;
      const off = y < S.from || y > S.to;
      h += `<button type="button" data-year="${y}" class="${off ? 'off' : ''}" style="height:${Math.max(3, (n / max) * 100)}%" title="${y}: ${n} paper${n === 1 ? '' : 's'}" aria-label="${y}, ${n} papers"></button>`;
    }
    $('hist').innerHTML = h;

    // active filter pills
    const pills = [];
    if (S.q) pills.push(['q', `“${S.q}”`]);
    S.fields.forEach(f => pills.push(['field::' + f, f]));
    S.types.forEach(t => pills.push(['type::' + t, t]));
    if (S.from !== YMIN || S.to !== YMAX) pills.push(['years', S.from === S.to ? S.from : `${S.from}–${S.to}`]);
    if (S.venue) pills.push(['venue', S.venue]);
    if (S.award) pills.push(['award', 'Award-winning']);
    if (S.archival) pills.push(['archival', 'Archival only']);
    $('active').innerHTML = pills.map(([k, l]) => `<button class="chip" type="button" data-rm="${esc(k)}" aria-label="Remove filter ${esc(l)}">${esc(l)}</button>`).join('');
  }

  // ---------- rendering ----------
  function hl(text) {
    let s = esc(text);
    const t = terms().filter(w => w.length > 1).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!t.length) return s;
    return s.replace(new RegExp(`(${t.join('|')})`, 'gi'), '<mark>$1</mark>');
  }
  function pubHTML(p) {
    const link = p.doi || (p.arxiv ? `https://arxiv.org/abs/${p.arxiv}` : '') || p.oa || p.scholar || `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`;
    const au = terms().length ? hl(p.authors).replace(/(A\.\s?Sarma|A Sarma)/, '<b>$1</b>') : boldMe(p.authors);
    const acts = [];
    if (p.doi) acts.push(`<a href="${esc(p.doi)}" target="_blank" rel="noopener">${ICONS.ext}DOI</a>`);
    if (p.oa) acts.push(`<a href="${esc(p.oa)}" target="_blank" rel="noopener">${ICONS.doc}PDF</a>`);
    if (p.arxiv) acts.push(`<a href="https://arxiv.org/abs/${esc(p.arxiv)}" target="_blank" rel="noopener">${ICONS.doc}arXiv</a>`);
    if (!p.doi && !p.arxiv) acts.push(`<a href="${esc(p.scholar || `https://scholar.google.com/scholar?q=${encodeURIComponent(p.title)}`)}" target="_blank" rel="noopener">${ICONS.search}Scholar</a>`);
    if (p.abstract) acts.push(`<button type="button" data-abs="${p.id}" aria-expanded="${S.open.has(p.id)}">${ICONS.chevron}${S.open.has(p.id) ? 'Hide abstract' : 'Abstract'}</button>`);
    acts.push(`<button type="button" data-cite="${p.id}">${ICONS.quote}Cite</button>`);
    const tags = (p.tags || []).map(t => `<span class="tag" role="button" tabindex="0" data-tagfilter="${esc(t)}" style="--c:${FIELDS[t]}">${esc(t)}</span>`).join('');
    return `<article class="pub glass">
      <div class="venue"><span class="badge" title="${esc(p.venueShort || p.type)}">${esc(p.venueShort || p.type)}</span><span class="type">${esc(p.type)}${p.status ? ` · <span class="status">${esc(p.status)}</span>` : ''}</span></div>
      <div>
        <h3><a href="${esc(link)}" target="_blank" rel="noopener">${hl(p.title)}</a></h3>
        <div class="au">${au}</div>
        <div class="vf">${hl(p.venue)}${p._cites ? ` · ${p._cites} citation${p._cites === 1 ? '' : 's'}` : ''}</div>
        <div class="row">${p.award ? `<span class="award">${ICONS.trophy}${esc(p.award)}</span>` : ''}${tags}</div>
        <div class="actions">${acts.join('')}</div>
        ${S.open.has(p.id) && p.abstract ? `<div class="abstract">${hl(p.abstract)}</div>` : ''}
      </div>
    </article>`;
  }

  let current = [];
  function renderResults() {
    const list = current;
    const n = list.length;
    $('count').innerHTML = `<b>${n}</b> of ${PUBS.length} publications`;
    if (!n) {
      $('results').innerHTML = `<div class="empty glass"><h3>No papers match</h3><p>Try removing a filter or searching a broader term.</p></div>`;
      return;
    }
    if (S.sort === 'cites') { $('results').innerHTML = list.map(pubHTML).join(''); return; }
    const groups = new Map();
    list.forEach(p => { if (!groups.has(p.year)) groups.set(p.year, []); groups.get(p.year).push(p); });
    $('results').innerHTML = [...groups].map(([y, ps]) =>
      `<section class="year-group" style="margin-bottom:30px"><div class="year-label">${y}<small>${ps.length} paper${ps.length === 1 ? '' : 's'}</small></div>${ps.map(pubHTML).join('')}</section>`).join('');
  }

  const TYPE_ORDER = Object.fromEntries(TYPES.map((t, i) => [t, i]));
  function update() {
    current = PUBS.filter(p => matches(p));
    if (S.sort === 'old') current.sort((a, b) => a.year - b.year || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
    else if (S.sort === 'cites') current.sort((a, b) => b._cites - a._cites);
    else current.sort((a, b) => b.year - a.year || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
    syncControls(); renderResults(); writeURL();
  }

  // ---------- BibTeX ----------
  function bibtex(p) {
    const first = (p.authors.split(/,| and /)[0] || 'sarma').trim().split(/\s+/).pop().replace(/[^A-Za-z]/g, '').toLowerCase();
    const word = (p.title.match(/[A-Za-z]{4,}/) || ['paper'])[0].toLowerCase();
    const key = `${first}${p.year}${word}`;
    const authors = p.authors.replace(/,?\s+and\s+/g, ', ').split(/\s*,\s*/).filter(Boolean).join(' and ');
    const kind = { Journal: 'article', Conference: 'inproceedings', Workshop: 'inproceedings', 'Book Chapter': 'incollection', 'Tech Report': 'techreport', Preprint: 'misc' }[p.type];
    const venueField = { article: 'journal', inproceedings: 'booktitle', incollection: 'booktitle', techreport: 'institution', misc: 'howpublished' }[kind];
    const lines = [`@${kind}{${key},`, `  title = {${p.title}},`, `  author = {${authors}},`, `  ${venueField} = {${p.type === 'Preprint' && p.arxiv ? 'arXiv:' + p.arxiv : p.venue.replace(/,\s*(pages?|\d{4}).*$/i, '')}},`, `  year = {${p.year}},`];
    if (p.doi) lines.push(`  doi = {${p.doi.replace(/^https?:\/\/(dx\.)?doi\.org\//, '')}},`);
    if (p.award) lines.push(`  note = {${p.award}},`);
    lines[lines.length - 1] = lines[lines.length - 1].replace(/,$/, '');
    return lines.join('\n') + '\n}';
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast('BibTeX copied to clipboard'); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); toast('BibTeX copied to clipboard'); } catch (_) { toast('Copy failed'); }
      ta.remove();
    }
  }
  function exportBib() {
    const blob = new Blob([current.map(bibtex).join('\n\n')], { type: 'text/plain' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sarma-publications.bib';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast(`Exported ${current.length} entries`);
  }

  function toggle(set, v) { set.has(v) ? set.delete(v) : set.add(v); }
  function debounce(fn, ms) { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; }

  readURL();
  buildControls();
  update();
  window.Site.setupReveal();
})();
