(async function () {
  const { esc, fmtDate, getJSON, boldMe, ICONS, setupReveal } = window.Site;

  // Theme cards
  const themesEl = document.getElementById('themes');
  themesEl.innerHTML = window.THEMES.map(t => `
    <a class="theme-card glass lift reveal" style="--c:${t.color}" href="research.html#${t.id}">
      <span class="ic">${t.icon}</span>
      <h3>${esc(t.title)}</h3>
      <p>${esc(t.short)}</p>
      <span class="more">Learn more →</span>
    </a>`).join('') + `
    <a class="theme-card glass lift reveal" style="--c:#f59e0b" href="publications.html">
      <span class="ic">${ICONS.search}</span>
      <h3>Browse research articles by field</h3>
      <p>Search and filter every publication by topic, venue, year, and award.</p>
      <span class="more">Open the library →</span>
    </a>`;

  try {
    const [news, pubs] = await Promise.all([getJSON('data/news.json'), getJSON('data/publications.json')]);
    document.getElementById('stat-pubs').textContent = Math.floor(pubs.filter(p => p.type !== 'Tech Report').length / 10) * 10 + '+';

    const latest = news.filter(n => !n.draft).slice(0, 6);
    document.getElementById('latest').innerHTML = latest.map(n => {
      const attrs = n.url ? ` href="${esc(n.url)}" target="_blank" rel="noopener"` : ' href="news.html"';
      return `<a${attrs}>
        <span class="d">${fmtDate(n.date)}</span>
        <span class="t">${esc(n.title)}<span class="o">${esc(n.outlet || '')}</span></span>
        <span class="badge soft">${esc(n.type)}</span>
      </a>`;
    }).join('');

    const ids = ['S.7', 'S.8', 'C.96', 'C.93'];
    const sel = ids.map(id => pubs.find(p => p.id === id)).filter(Boolean);
    document.getElementById('selected').innerHTML = sel.map(p => {
      const href = p.doi || (p.arxiv ? `https://arxiv.org/abs/${p.arxiv}` : p.scholar || 'publications.html');
      return `<a class="paper-card glass lift reveal" href="${esc(href)}" target="_blank" rel="noopener">
        <div class="meta"><span class="badge">${esc(p.venueShort || p.type)}</span><span class="muted" style="font-size:13px">${p.year}</span>
          ${p.award ? `<span class="award">${ICONS.trophy}${esc(p.award)}</span>` : ''}</div>
        <h3>${esc(p.title)}</h3>
        <div class="au">${boldMe(p.authors)}</div>
      </a>`;
    }).join('');
  } catch (e) {
    document.getElementById('latest').innerHTML = '<div style="padding:22px" class="muted">News could not be loaded. If you opened this file directly, run it from a local web server.</div>';
  }
  setupReveal();
})();
