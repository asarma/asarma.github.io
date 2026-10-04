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
