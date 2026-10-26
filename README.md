# Data & Design — Household Waste & Recycling

A static interactive data visualisation built with Observable Plot and D3.

## Files
- `index.html` — page markup and external library references
- `css/styles.css` — styling, including responsive layout
- `js/app.js` — application startup and chart initialisation
- `js/data.js` — JSON loading
- `js/shared.js` — shared formatting, palette, validation and event utilities
- `js/disclosures.js` — data/methodology disclosure behaviour
- `js/charts/*.js` — one module per figure
- `data/*.json` — unchanged data extracted from the v43 embedded constants
- `.nojekyll` — tells GitHub Pages to serve static files directly

## Preview locally
Run `python3 -m http.server 8000` from this directory, then open `http://localhost:8000/`.
Do not open `index.html` via `file://`: the browser may block JSON `fetch()` calls.

## Deploy to GitHub Pages
Copy the **contents** of this folder into the repository root, commit and push.
On GitHub, choose Settings → Pages → Deploy from a branch → `main` → `/(root)` → Save.
For repository `data-and-design-work`, the project site URL will normally be
`https://YOUR-USERNAME.github.io/data-and-design-work/`.

## Data handling
The JSON data is the same as the v43 embedded dataset. Strict JSON validation
and the Python/Sheets data pipeline are planned for the next stage, not included here.
All data in `data/` is public once this project is published.
