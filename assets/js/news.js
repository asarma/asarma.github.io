(async function () {
  const { esc, url, fmtDate, getJSON, ICONS, setupReveal } = window.Site;
  const $ = id => document.getElementById(id);

  const KIND_COLOR = {
    Press: '#e2557b', TV: '#f97316', Radio: '#f59e0b', Podcast: '#a855f7', Newsletter: '#06b6d4',
    Keynote: '#6d5efc', Talk: '#3b82f6', Panel: '#0ea5e9', Award: '#d4a017', Paper: '#10b981', Service: '#64748b',
  };
  const GROUPS = [
    ['all', 'All', null],
    ['media', 'Media', ['Press', 'TV', 'Radio', 'Podcast', 'Newsletter']],
    ['talks', 'Keynotes & talks', ['Keynote', 'Talk', 'Panel']],
    ['awards', 'Awards', ['Award']],
    ['milestones', 'Papers & milestones', ['Paper', 'Service']],
  ];

  let NEWS = [];
  try { NEWS = (await getJSON('data/news.json')).filter(n => !n.draft); }
  catch (e) { $('timeline').innerHTML = '<div class="empty glass"><h3>Couldn’t load news</h3><p>Serve the folder with a local web server (see README).</p></div>'; return; }

  // ---------- featured ----------
  // Press leads the featured grid (the first card is the large one)
  const feat = NEWS.filter(n => n.featured)
    .sort((a, b) => (b.type === 'Press') - (a.type === 'Press') || b.date.localeCompare(a.date))
    .slice(0, 6);
  $('featured').innerHTML = feat.map(n => {
    const nyt = /New York Times/.test(n.outlet || '');
    const tag = n.url ? 'a' : 'div';
    const href = n.url ? ` href="${url(n.url)}" target="_blank" rel="noopener"` : '';
    return `<${tag} class="fcard glass lift reveal" style="--c:${KIND_COLOR[n.type]}"${href}>
      <div class="top"><span class="kind" style="--c:${KIND_COLOR[n.type]}">${esc(n.type)}</span><span class="d">${fmtDate(n.date, true)}</span></div>
      <div class="outlet${nyt ? ' nyt' : ''}">${esc(n.outlet || '')}</div>
      <h3>${esc(n.title)}</h3>
      ${n.summary ? `<p>${esc(n.summary)}</p>` : ''}
      ${n.url ? `<span class="go">${/Press|TV|Radio|Podcast|Newsletter/.test(n.type) ? 'Read / watch' : 'Details'} →</span>` : ''}
    </${tag}>`;
  }).join('');

  // ---------- tabs ----------
  const state = { group: 'all', q: '' };
  const initial = (location.hash || '').slice(1);
  if (GROUPS.some(g => g[0] === initial)) state.group = initial;

  function renderTabs() {
    $('tabs').innerHTML = GROUPS.map(([id, label, kinds]) => {
      const n = kinds ? NEWS.filter(x => kinds.includes(x.type)).length : NEWS.length;
      return `<button role="tab" type="button" data-g="${id}" aria-selected="${state.group === id}">${label}<span class="count">${n}</span></button>`;
    }).join('');
  }
  $('tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-g]'); if (!b) return;
    state.group = b.dataset.g;
    history.replaceState(null, '', state.group === 'all' ? location.pathname : '#' + state.group);
    renderTabs(); renderTimeline();
  });
  $('nq').addEventListener('input', e => { state.q = e.target.value.trim().toLowerCase(); renderTimeline(); });

  // ---------- timeline ----------
  function itemHTML(n) {
    const tag = n.url ? 'a' : 'div';
    const href = n.url ? ` href="${url(n.url)}" target="_blank" rel="noopener"` : '';
    const generic = n.title === 'Invited talk';
    return `<${tag} class="tl-item"${href}>
      <span class="d">${fmtDate(n.date).split(' ')[0]}</span>
      <div>
        <div class="t">${generic ? esc(n.outlet) : esc(n.title)}</div>
        ${!generic && n.outlet ? `<div class="o">${esc(n.outlet)}</div>` : ''}
        ${n.summary ? `<div class="s">${esc(n.summary)}</div>` : ''}
      </div>
      <span style="display:flex;gap:10px;align-items:center"><span class="kind" style="--c:${KIND_COLOR[n.type]}">${esc(n.type)}</span>${n.url ? `<span class="ext">${ICONS.ext}</span>` : ''}</span>
    </${tag}>`;
  }
  function renderTimeline() {
    const kinds = GROUPS.find(g => g[0] === state.group)[2];
    const list = NEWS.filter(n => (!kinds || kinds.includes(n.type)) &&
      (!state.q || [n.title, n.outlet, n.summary, n.type].join(' ').toLowerCase().includes(state.q)));
    if (!list.length) { $('timeline').innerHTML = '<div class="empty glass"><h3>Nothing here yet</h3><p>Try another filter.</p></div>'; return; }
    const by = new Map();
    list.forEach(n => { const y = n.date.slice(0, 4); if (!by.has(y)) by.set(y, []); by.get(y).push(n); });
    $('timeline').innerHTML = [...by].map(([y, items]) => `
      <div class="tl-year">
        <h3>${y}</h3>
        <div class="tl-items glass">${items.map(itemHTML).join('')}</div>
      </div>`).join('');
  }

  renderTabs(); renderTimeline(); setupReveal();
})();
