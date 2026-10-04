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
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/></svg>',
    quote: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h4v4c0 3-2 5-4 6M13 7h4v4c0 3-2 5-4 6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
  };

  // Research-field palette (shared by publications, research, home)
  const FIELDS = {
    'Human–AI Collaboration': '#6d5efc',
    'Developer Productivity & Trust': '#8b5cf6',
    'Learning & CS Education': '#0ea5e9',
    'Inclusive Design & GenderMag': '#e2557b',
    'Open Source Communities': '#10b981',
    'Mentoring & Onboarding': '#14b8a6',
    'Developer Well-being & Belonging': '#f59e0b',
    'Coordination & Collaboration': '#3b82f6',
    'Developer Cognition & Tools': '#a855f7',
    'End-User Programming': '#f97316',
    'Software Analytics & Visualization': '#06b6d4',
    'Privacy & Security': '#64748b',
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
          <a class="brand" href="index.html" aria-label="Anita Sarma — home"><span class="brand-mark">A</span><span>Anita Sarma</span></a>
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
    el.innerHTML = `
      <div class="wrap">
        <div class="foot glass">
          <div>© ${new Date().getFullYear()} Anita Sarma · Oregon State University</div>
          <nav aria-label="Elsewhere">
            <a href="https://scholar.google.com/citations?user=shMjCasAAAAJ&hl=en" target="_blank" rel="noopener">Google Scholar</a>
            <a href="https://dblp.org/pid/26/6565.html" target="_blank" rel="noopener">DBLP</a>
            <a href="https://epiclab.github.io/" target="_blank" rel="noopener">EPIC Lab</a>
            <a href="#" target="_blank" rel="noopener" data-linkedin hidden>LinkedIn</a>
            <a href="https://gendermag.org" target="_blank" rel="noopener">GenderMag</a>
            <a href="#" data-email>Email</a>
          </nav>
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
      a.addEventListener('click', e => { e.preventDefault(); location.href = 'mailto:' + EMAIL.join('@'); });
    });
  }

  renderNav();
  renderFooter();
  wireLinkedIn();
  wireEmail();
  setupReveal();
})();
