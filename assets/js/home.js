(async function () {
  const { esc, url, fmtDate, getJSON, boldMe, ICONS, setupReveal } = window.Site;

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

  // Citation metrics: refreshed daily from Google Scholar into data/metrics.json, read fresh on every visit
  try {
    const m = await getJSON('data/metrics.json');
    const fmt = n => Number(n).toLocaleString('en-US');
    // Rounded down so the number reads as a stable milestone (e.g. 6,563 → 6,500+)
    document.getElementById('stat-cites').textContent = fmt(Math.floor(m.citations / 500) * 500) + '+';
    document.getElementById('stat-h').textContent = m.hIndex;
    document.getElementById('stat-i10').textContent = m.i10;
    if (m.updated) document.getElementById('stats-src').innerHTML =
      `<a href="${url(m.profile)}" target="_blank" rel="noopener">Google Scholar</a> metrics · updated ${fmtDate(m.updated, true)}`;
  } catch (e) { /* keep the numbers baked into the page */ }

  try {
    const [news, pubs] = await Promise.all([getJSON('data/news.json'), getJSON('data/publications.json')]);
    renderHighlights(news, pubs);
    renderPressTicker(news);
    document.getElementById('stat-pubs').textContent = Math.floor(pubs.filter(p => p.type !== 'Tech Report').length / 10) * 10 + '+';

    const latest = news.filter(n => !n.draft).slice(0, 6);
    document.getElementById('latest').innerHTML = latest.map(n => {
      const attrs = n.url ? ` href="${url(n.url)}" target="_blank" rel="noopener"` : ' href="news.html"';
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
      return `<a class="paper-card glass lift reveal" href="${url(href)}" target="_blank" rel="noopener">
        <div class="meta"><span class="badge">${esc(p.venueShort || p.type)}</span><span class="muted" style="font-size:13px">${p.year}</span>
          ${p.award ? `<span class="award">${ICONS.trophy}${esc(p.award)}</span>` : ''}</div>
        <h3>${esc(p.title)}</h3>
        <div class="au">${boldMe(p.authors)}</div>
      </a>`;
    }).join('');
  } catch (e) {
    document.getElementById('latest').innerHTML = '<div style="padding:22px" class="muted">News could not be loaded. If you opened this file directly, run it from a local web server.</div>';
  }
  // Copy the bio as plain text (for organizers and press)
  // Portrait flip: tap / Enter / Space toggles (hover handles mouse users in CSS)
  const flip = document.getElementById('flip');
  const setFlip = on => { flip.classList.toggle('is-flipped', on); flip.setAttribute('aria-pressed', String(on)); };
  const small = matchMedia('(max-width: 900px)');   // photo is too small for text: open the full bio instead
  flip?.addEventListener('click', e => {
    if (e.target.closest('button')) return;
    if (small.matches) { openBio(e); return; }
    setFlip(!flip.classList.contains('is-flipped'));
  });
  flip?.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target === flip) { e.preventDefault(); setFlip(!flip.classList.contains('is-flipped')); } });
  document.getElementById('copy-short-bio')?.addEventListener('click', async e => {
    const btn = e.currentTarget, text = document.getElementById('short-bio').textContent.trim();
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (err) {
      const ta = Object.assign(document.createElement('textarea'), { value: text }); ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy'); } catch (_) {} ta.remove();
    }
    const old = btn.textContent; btn.textContent = ok ? 'Copied ✓' : 'Select text to copy';
    setTimeout(() => { btn.textContent = old; }, 2000);
  });

  // Bio dialog: opened from the "Bio" pill; Copy puts the plain text on the clipboard
  const bioDlg = document.getElementById('bio');
  const openBio = e => { e?.preventDefault(); bioDlg.showModal ? bioDlg.showModal() : bioDlg.setAttribute('open', ''); };
  document.getElementById('bio-pill')?.addEventListener('click', openBio);
  document.querySelectorAll('[data-open-bio]').forEach(b => b.addEventListener('click', openBio));
  bioDlg?.querySelector('[data-close]')?.addEventListener('click', () => bioDlg.close());
  bioDlg?.addEventListener('click', e => { if (e.target === bioDlg) bioDlg.close(); });   // click outside the panel
  if (location.hash === '#bio') openBio();
  const copyBtn = document.getElementById('copy-bio');
  const flash = label => {   // feedback on the button itself (a toast would sit behind the open dialog)
    const html = copyBtn.innerHTML; copyBtn.textContent = label;
    setTimeout(() => { copyBtn.innerHTML = html; }, 2200);
  };
  copyBtn?.addEventListener('click', async () => {
    const text = [...document.querySelectorAll('#bio-text p')].map(p => p.textContent.trim()).join('\n\n');
    try { await navigator.clipboard.writeText(text); flash('Copied ✓'); return; } catch (err) {}
    const sel = getSelection(); const range = document.createRange();
    range.selectNodeContents(document.getElementById('bio-text')); sel.removeAllRanges(); sel.addRange(range);
    let ok = false; try { ok = document.execCommand('copy'); } catch (err) {}
    flash(ok ? 'Copied ✓' : 'Selected: press ⌘C');
  });

  setupReveal();

  // ---- Cumulative highlights around the portrait (computed from the data, so they never go stale) ----
  function renderHighlights(news, pubs) {
    const el = document.getElementById('float-labels');
    if (!el) return;
    const yy = y => `’${String(y).slice(-2)}`;
    const shortName = o => {
      const paren = (o.match(/\(([A-Z][A-Za-z&/-]{1,10})\)/) || [])[1];
      let n = paren || o.split(/ — |,|\(/)[0];
      n = n.replace(/\s*\b(19|20)\d\d\b/, '').trim();
      return n.length > 14 ? n.split(' ')[0] : n;
    };
    const SHORT = { 'The New York Times': 'NYT', 'Jefferson Public Radio': 'JPR', 'KGW TV News': 'KGW', 'KATU News': 'KATU', 'KOIN 6 News': 'KOIN 6' };
    const items = [];

    // Best / distinguished papers and honorable mentions (not nominations)
    const awards = pubs.filter(p => p.award && /best|distinguished|honou?rable/i.test(p.award) && !/nomin/i.test(p.award))
      .sort((a, b) => b.year - a.year);
    const roundDown = n => n >= 10 ? `${Math.floor(n / 10) * 10}+` : `${n}`;
    if (awards.length) items.push({ c: '#6d28d9', href: 'publications.html?award=1', icon: ICONS.trophy,
      t: `${roundDown(awards.length)} paper awards`,
      s: [...new Set(awards.filter(p => !/honou?rable/i.test(p.award)).map(p => p.venueShort || shortName(p.venue)))].slice(0, 3).join(' · ') });

    const press = news.filter(n => ['Press', 'TV', 'Radio'].includes(n.type) && n.outlet);
    if (press.length) {
      const FIRST = ['NYT', 'KGW', 'KATU', 'KOIN 6', 'JPR'];   // best-known outlets first
      const rank = o => (FIRST.indexOf(o) + 1) || 99;
      const outlets = [...new Set(press.map(n => SHORT[n.outlet.split(/ — | \(/)[0]] || shortName(n.outlet)))].sort((a, b) => rank(a) - rank(b));
      items.push({ c: '#a21caf', href: 'news.html#media', t: 'In the news', s: outlets.slice(0, 3).join(' · '),
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M8 21h8M12 18v3"/></svg>' });
    }

    const keynotes = news.filter(n => n.type === 'Keynote' && !n.draft && n.outlet);
    if (keynotes.length) items.push({ c: '#4c1d95', href: 'news.html#talks', t: `${keynotes.length} keynotes`,
      s: [...new Set(keynotes.map(n => shortName(n.outlet)))].slice(0, 2).join(' · '),
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>' });

    items.push({ c: '#7e22ce', href: 'https://gendermag.org', ext: true, t: 'GenderMag', s: 'Co-Director',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M14 20c0-2.2 1.3-4 3-4s3 1.8 3 4"/></svg>' });

    el.innerHTML = items.slice(0, 4).map((it, i) => `
      <a class="float-label p${i + 1}" style="--c:${it.c}" href="${url(it.href)}"${it.ext ? ' target="_blank" rel="noopener"' : ''}>
        <span class="ic">${it.icon}</span>
        <span><b>${esc(it.t)}</b><small>${esc(it.s)}</small></span>
      </a>`).join('');
  }

  // ---- "Featured in" ticker: every media outlet in the news data, scrolling slowly ----
  function renderPressTicker(news) {
    const box = document.getElementById('press-marquee');
    if (!box) return;
    const clean = o => o.replace(/\s*\((?:RDEL )?#?\d+\)$/, '').split(/ — |, Episode|,| \(Portland\)/)[0].replace(/ TV News$| News$/, '').trim();
    const outlets = [...new Set(news.filter(n => ['Press', 'TV', 'Radio', 'Podcast', 'Newsletter'].includes(n.type) && n.outlet)
      .map(n => clean(n.outlet)))];
    if (outlets.length < 4) return;   // keep the static list
    const links = outlets.map(o => `<a class="outlet" href="news.html#media">${esc(o)}</a>`).join('');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      box.innerHTML = `<div class="marquee-track">${links}</div>`;   // static, wrapped list
      return;
    }
    // Two copies side by side make the loop seamless; the copy is hidden from screen readers and the tab order.
    const copy = links.replace(/<a /g, '<a tabindex="-1" ');
    box.innerHTML = `<div class="marquee-track">${links}<span aria-hidden="true" style="display:contents">${copy}</span></div>`;
    box.style.setProperty('--ticker-dur', `${Math.max(30, outlets.length * 5)}s`);
    box.classList.add('is-running');
  }
})();
