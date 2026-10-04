# Anita Sarma — personal website

A static site (plain HTML/CSS/JS, no build step) designed for GitHub Pages.

```
index.html           Home
research.html        Research themes, funding, honors
publications.html    Searchable / filterable publication library
news.html            News, Talks & Media
people.html          Students & alumni
teaching.html        Courses
service.html         Leadership & service
assets/css/style.css Design system (glass UI, light + dark)
assets/js/           site.js (nav, footer, theme), themes.js (research areas), page scripts
data/publications.json   All papers (edit here)
data/news.json           All news, talks, media, awards (edit here)
assets/Sarma_CV.pdf      ← drop your current CV here (the nav "CV" link points to it)
```

## Preview locally

The pages load `data/*.json` with `fetch`, so open them through a local server, not by double-clicking:

```bash
python3 -m http.server 8765
```

Then visit http://localhost:8765.

## Adding a news item, talk, or media mention

Add an object to `data/news.json` (order doesn't matter; it's sorted by date):

```json
{
  "date": "2026-11-05",
  "type": "Keynote",
  "title": "Talk title",
  "outlet": "Venue or outlet, City",
  "url": "https://…",
  "summary": "One sentence.",
  "featured": true
}
```

`type` is one of: `Press`, `TV`, `Radio`, `Podcast`, `Newsletter`, `Keynote`, `Talk`, `Panel`, `Award`, `Paper`, `Service`.
`featured: true` puts it in the Highlights grid. `draft: true` hides it (used for the Microsoft keynote until the title is known).

## Adding a paper

Add an object to `data/publications.json`:

```json
{
  "id": "C.101",
  "type": "Conference",
  "title": "Paper title",
  "authors": "A. Author, B. Author, and A. Sarma",
  "venue": "IEEE/ACM International Conference on Software Engineering (ICSE), 2027",
  "venueShort": "ICSE",
  "year": 2027,
  "award": "ACM SIGSOFT Distinguished Paper Award",
  "doi": "https://doi.org/…",
  "arxiv": "2701.01234",
  "tags": ["Human–AI Collaboration", "Developer Productivity & Trust"]
}
```

`type`: `Journal`, `Conference`, `Workshop`, `Book Chapter`, `Preprint`, `Tech Report`.
`tags` must match the field names in `assets/js/site.js` (`FIELDS`), which also sets each field's color.
Optional: `abstract` (searchable, shown on expand), `oa` (open-access PDF link), `cites`, `status` (e.g. "Under review").

## Publishing on GitHub Pages

1. Create a repository (e.g. `anitasarma.github.io` for a root URL, or any name for `/<repo>/`).
2. Push this folder to it.
3. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch → `main` / root**.

`_archive/` (the saved copy of the old WordPress home page) is git-ignored.

## Automatic updates

A scheduled task in the Claude app (“Website & CV daily update”, 7:05 AM daily) runs `tools/daily_update.sh`:

1. `tools/update_scholar.py` — pulls citations, h-index, i10 and per-paper citation counts from Google Scholar into `data/metrics.json` / `data/publications.json`, adds new papers (tagged by field) and a news item for each, and upgrades preprints when the published version appears. Titles listed in `tools/scholar_ignore.json` are never added.
2. `tools/cv_sync.py` — inserts anything new (papers, awards, talks, media from `data/news.json`) into the newest `sarma_CV_*.docx`, in your CV's own format. `tools/cv_state.json` records what is already in the CV.
3. `tools/export_cv_pdf.sh` — re-exports `assets/Sarma_CV.pdf` with Microsoft Word.
4. Commits and pushes to GitHub, which republishes the site.

On Mondays the task also searches the web for new awards, keynotes and media coverage and adds verified items.
Google Scholar has to be read from your own computer (it blocks cloud servers), so the task runs on this Mac while the Claude app is open; if the Mac is asleep at 7:05 it runs at the next launch.
The home page reads `data/metrics.json` on every visit, so the numbers shown are always the latest pulled.
