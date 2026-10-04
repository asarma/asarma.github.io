/* Shared site chrome: nav, footer, theme, reveal-on-scroll, helpers. */
(function () {
  const PAGES = [
    ['index.html', 'Home'],
    ['research.html', 'Research'],
    ['publications.html', 'Publications'],
    ['news.html', 'News, Talks & Media'],
    ['people.html', 'People'],
    ['teaching.html', 'Teaching'],
    ['service.html', 'Service'],
    ['assets/Sarma_CV.pdf', 'CV'],
  ];

  const ICONS = {
    sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    ext: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    trophy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    doc: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    quote: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v4c0 3-2 5-4 6M13 7h4v4c0 3-2 5-4 6"/></svg>',
    copy: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  };

  // Research-field palette (shared by publications, research, home)
  const FIELDS = {
    'Human–AI Collaboration': '#6d28d9',
    'Developer Productivity & Trust': '#9333ea',
    'Learning & CS Education': '#4338ca',
    'Inclusive Design & GenderMag': '#c026d3',
    'Open Source Communities': '#15803d',
    'Mentoring & Onboarding': '#4d7c0f',
    'Developer Well-being & Belonging': '#db2777',
    'Coordination & Collaboration': '#1d4ed8',
    'Developer Cognition & Tools': '#7e22ce',
    'End-User Programming': '#a16207',
    'Software Analytics & Visualization': '#475569',
    'Privacy & Security': '#334155',
  };

  // Paste the full LinkedIn profile URL here to show LinkedIn links across the site.
  const LINKEDIN = 'https://www.linkedin.com/in/anita-sarma/';

  // Email is assembled only when clicked, so it never appears whole in the page source.
  const EMAIL = ['anita.sarma', 'oregonstate.edu'];

  const here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function renderNav() {
    const el = document.getElementById('site-nav');
    if (!el) return;
    const links = PAGES.map(([href, label]) => {
      const cur = href === here || (here === '' && href === 'index.html');
      return `<li><a href="${href}"${cur ? ' aria-current="page"' : ''}>${label}</a></li>`;
    }).join('');
    el.className = 'nav';
    el.innerHTML = `
      <div class="wrap">
        <div class="nav-inner glass glass-strong">
          <a class="brand" href="index.html" aria-label="Anita Sarma — home"><svg class="brand-mark" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="bm-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4c1d95"/><stop offset="1" stop-color="#a21caf"/></linearGradient></defs><circle cx="32" cy="32" r="31" fill="url(#bm-g)"/><circle cx="32" cy="32" r="25" fill="none" stroke="#fff" stroke-opacity=".92" stroke-width="2.4"/><circle cx="32" cy="32" r="20.5" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="1"/><text x="32" y="43.5" text-anchor="middle" font-family="Instrument Serif, Georgia, serif" font-size="33" fill="#fff">A</text></svg><span>Anita Sarma</span></a>
          <ul class="nav-links" id="nav-links">${links}</ul>
          <button class="icon-btn" id="theme-btn" type="button" aria-label="Toggle dark mode"></button>
          <button class="icon-btn menu-btn" id="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="nav-links">${ICONS.menu}</button>
        </div>
      </div>`;
    const menu = el.querySelector('#menu-btn');
    menu.addEventListener('click', () => {
      const open = el.classList.toggle('open');
      menu.setAttribute('aria-expanded', String(open));
      menu.innerHTML = open ? ICONS.close : ICONS.menu;
    });
    el.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => el.classList.remove('open')));
    setupTheme(el.querySelector('#theme-btn'));
  }

  function currentTheme() {
    const set = document.documentElement.getAttribute('data-theme');
    if (set) return set;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setupTheme(btn) {
    const paint = () => { btn.innerHTML = currentTheme() === 'dark' ? ICONS.sun : ICONS.moon; };
    paint();
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      paint();
    });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', paint);
  }

  function renderFooter() {
    const el = document.getElementById('site-footer');
    if (!el) return;
    // Slim sign-off line; full contact details live in the home page's contact section
    const onHome = here === 'index.html' || here === '';
    el.innerHTML = `
      <div class="wrap">
        <div class="foot">
          <span>© ${new Date().getFullYear()} Anita Sarma · Oregon State University</span>
          ${onHome ? '' : '<a href="index.html#contact">Contact</a>'}
        </div>
      </div>`;
  }

  function setupReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) { els.forEach(e => e.classList.add('in')); return; }
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    els.forEach(e => io.observe(e));
  }

  // ---- helpers exposed to page scripts ----
  // Data-driven links (some come from Scholar/OpenAlex) may only be web, mail, or same-site links.
  const url = u => (/^(https?:|mailto:)/i.test(u) || !/^[^/?#]*:/.test(u ?? '')) ? esc(u) : '#';
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function fmtDate(iso, withDay) {
    const [y, m, d] = iso.split('-').map(Number);
    return withDay && d > 1 ? `${MONTHS[m - 1]} ${d}, ${y}` : `${MONTHS[m - 1]} ${y}`;
  }
  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }
  function boldMe(authors) {
    return esc(authors).replace(/(A\.\s?Sarma|Anita Sarma|A Sarma)/g, '<b>$1</b>');
  }
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
  }

  window.Site = { ICONS, FIELDS, esc, url, fmtDate, getJSON, boldMe, toast, setupReveal };

  function wireLinkedIn() {
    if (!LINKEDIN) return;
    document.querySelectorAll('[data-linkedin]').forEach(el => {
      el.hidden = false;
      (el.tagName === 'A' ? el : el.querySelector('a')).href = LINKEDIN;
    });
  }

  function wireEmail() {
    document.querySelectorAll('[data-email]').forEach(a => {
      a.setAttribute('aria-label', 'Email Anita Sarma');
      // The address is only assembled on click, so it never appears in the page for scrapers.
      // Also copy it, for visitors whose browser has no mail app set up.
      a.addEventListener('click', e => {
        e.preventDefault();
        const addr = EMAIL.join('@');
        try { navigator.clipboard?.writeText(addr).then(() => toast('Email address copied'), () => {}); } catch (_) {}
        location.href = 'mailto:' + addr;
      });
    });
  }

  renderNav();
  renderFooter();
  wireLinkedIn();
  wireEmail();
  setupReveal();
})();
