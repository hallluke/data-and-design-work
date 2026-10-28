# Household waste — data and design

A static, interactive dashboard of household waste collections, with four visualisations covering monthly material weights, year-on-year comparisons, recycling rate, and daily collection patterns. The site uses plain HTML/CSS and JavaScript modules, with D3 and Observable Plot loaded from a CDN. Python generates and validates the published JSON datasets.

## Run and test locally

Serve the repository root with a local HTTP server (ES modules and JSON fetches should not be opened directly from `file://`):

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/`. To run the automated tests:

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
```

To generate a test dataset without modifying the published `data/` directory:

```sh
python3 scripts/build_data.py --csv reference/collections-source.csv --output build/data
```

See [PIPELINE.md](PIPELINE.md) for the live Google Sheets and GitHub Actions process.

## Project structure

- `index.html`, `css/styles.css`: page structure and responsive styling.
- `js/app.js`: application entry point and independent chart initialisation.
- `js/charts/`: one module per chart (`monthly-material-weights`, `yearly-material-comparison`, `overall-recycling-rate`, `daily-material-weights`).
- `js/chart-core.js`: chart setup, controls, lifecycle and status.
- `js/chart-display.js`: tooltips, number/date formatting, tables and disclosure content.
- `js/chart-interaction.js`: shared touch dismissal, Escape/focus handling, event cleanup and scrollable-table focus.
- `js/chart-style.js`: shared chart colours and responsive breakpoint.
- `js/materials.js`, `js/material-registry.js`: material lookup and generated material configuration.
- `js/data.js`, `js/freshness.js`, `js/disclosures.js`: data fetching/validation, refresh metadata and page disclosures.
- `js/slope-proximity.js`: separately tested slope-selection geometry for Chart 2.
- `config/materials.json`: canonical material definitions; `scripts/`: Python data pipeline; `tests/`: JavaScript and Python tests.
- `data/`: published JSON; `reference/`: historical regression fixtures.

## Maintenance and naming conventions

- Use **kebab-case** for JavaScript filenames, CSS classes, chart IDs and test filenames; use **camelCase** for JavaScript functions, variables and material IDs; use **UPPER_SNAKE_CASE** for constants where appropriate. Python uses **snake_case** for functions and modules.
- Chart IDs are stable integration identifiers: `monthly-material-weights`, `yearly-material-comparison`, `overall-recycling-rate`, `daily-material-weights`. Do not rename them merely to change visible headings.
- Keep chart geometry, selection calculations and rendering in the respective `js/charts/` module. Share lifecycle, event cleanup, tooltip positioning and formatting only where responsibilities really match. Use section comments within shared modules rather than creating a file for every small helper.
- Preserve keyboard focus indicators when Escape dismisses chart tooltips. Touch selection is dismissed by touching outside the chart or scrolling; preserve current per-chart behaviour.
- Use `config/materials.json` as the source of truth for materials. Run `python3 scripts/sync_materials.py` to regenerate `js/material-registry.js`; do not edit that generated file manually. Material IDs such as `residualWaste` and `mixedRecycling` are stable even if their display labels change.
- Imputation eligibility is defined per material, not inferred from group membership. The current monthly dataset retains display-label group keys for compatibility; a future schema migration may replace them with stable IDs.
- The chart modules use `setupChart()` for control creation and lifecycle, but retain ownership of their render and destroy functions. Maintain matching tests for changes to interactions, data contracts or selection logic.

## Verification limits

The automated suite checks data transformations and selected JavaScript behaviours. It does **not** provide pixel-level browser visual regression or full mouse, touch and keyboard end-to-end coverage. After chart changes, manually verify all controls, tooltips, Escape/focus handling, touch dismissal, disclosures and responsive layouts before publishing.
