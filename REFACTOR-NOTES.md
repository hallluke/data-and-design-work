# Chart architecture checkpoint

## Canonical chart identifiers

- `monthly-material-weights`
- `yearly-material-comparison`
- `overall-recycling-rate`
- `daily-material-weights`

These identify the chart, not its editorial heading or rendering library.

## Material configuration

Edit `config/materials.json`, then run `python scripts/sync_materials.py` to update the browser's generated `js/material-registry.js` module. Python reads the JSON directly; JS imports the generated module to avoid browser JSON-module compatibility issues. Do not edit the generated module by hand.

Individual material IDs are stable, e.g. `residualWaste`. `mixedRecycling` is the stable group ID; its current display label is `Dry recycling`. Imputation eligibility is a property of each material, **not** inferred from group membership.

The existing monthly JSON retains display-label group keys for compatibility. A future schema migration should use canonical IDs in generated datasets so that renaming a label does not require a rebuild. Changes to groups **do** require rebuilding all generated JSON datasets, as Python computes monthly group aggregates.

## Shared chart setup

Each chart calls `setupChart({root,id,number,title,unit,state,controls,onChange})`. It updates the existing `.num`, `h2` and `.unit` independently, creates button/select controls, and returns `sync()` and `destroy()` methods. Chart-specific rendering and calculations remain within each module. HTML provides static numbers, titles, and chart-loading/error placeholders.

Control definitions are instantiated when each chart factory is built. `disabled` is a predicate evaluated against state on `sync()`; dropdown dependency rules have not been added speculatively.

## Tests

`node --test tests/*.test.mjs`

`python -m unittest discover -s tests -p 'test_*.py'`

`python scripts/build_data.py --csv reference/collections-source.csv --output /tmp/atlas-check`

No browser-based visual regression has been performed. Test all controls, disclosures and chart layouts in a browser before deploying.
