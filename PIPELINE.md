# Household waste data pipeline

This document explains how the household waste records are turned into the datasets used by the website, how updates are published, and what needs attention when maintaining the process.

## From spreadsheet to website

The original measurements are kept in a private Google Sheet, in a worksheet named `Collections`. Each record contains a date, material and weight in kilograms.

A series of Python scripts retrieves and checks the records, calculates the figures used by the charts, and produces four JSON files in the repository's `data/` directory. The website reads these files rather than connecting directly to Google Sheets.

The processing includes:

- **Validation:** Checking dates, weights, materials and the structure of the source data.
- **Aggregation:** Calculating monthly totals from recorded collection weights.
- **Imputation:** Distributing collected weights across the days since the previous measurement to estimate when waste accumulated.
- **Comparison:** Producing year-on-year figures, including a clearly identified provisional estimate for residual waste where necessary.

Material definitions are maintained in `config/materials.json`, which also supplies the browser's material registry through a synchronisation script.

## Testing and publishing

Two GitHub Actions workflows handle the automated process:

| Workflow | Purpose |
|---|---|
| `test-data.yml` | Runs tests and builds sample JSON, normally using a historical CSV dataset. It can also test against the live Google Sheet when started manually. **It doesn't publish anything.** |
| `publish-data.yml` | Runs manually or on a daily schedule, reads the live spreadsheet, tests and validates the generated data, and publishes the updated JSON files. |

The publishing workflow is scheduled for **03:30 UK time**, although GitHub may run scheduled jobs later.

Before publishing, the workflow checks that the four expected JSON files have been generated successfully. It then updates `collections.json`, `monthly.json`, `detail.json` and `comparison.json` in `data/`, along with `refresh.json`, which records the latest successful publication time. Changes are committed automatically; if nothing has changed, no new commit is made.

The historical dataset at `reference/collections-source.csv` is used for testing, not as the live source.

## Access to Google Sheets

GitHub Actions uses **Google Cloud Workload Identity Federation** to access the private spreadsheet. This allows the workflow to obtain temporary credentials without storing a Google service-account key in the repository.

Three GitHub Actions variables identify the connection:

- `GOOGLE_SHEET_ID` — the source spreadsheet.
- `GCP_SERVICE_ACCOUNT` — the Google Cloud service account used to read it.
- `GCP_WORKLOAD_IDENTITY_PROVIDER` — the Google Cloud identity configuration that allows GitHub Actions to authenticate.

The service account must have read access to the spreadsheet. The source data and authentication credentials should remain private; only the processed JSON is published.

## Maintenance

- **Adding or changing materials:** Update `config/materials.json`, run `python3 scripts/sync_materials.py`, and rebuild the derived data.
- **Changing the source spreadsheet:** Keep the `Collections` worksheet and its expected columns (`Date`, `Material`, `Weight (kg)`), with dates in `DD/MM/YYYY` format.
- **Changing the time period:** Review the initial imputation date (currently `2025-01-01`), the year-on-year comparison (currently 2025–2026), and the provisional estimation method.
- **If updates stop:** Check the `Publish waste data` run in GitHub Actions. Failures may relate to source-data validation, spreadsheet access, Google authentication or the build itself. The separate test workflow can help investigate without publishing changes.

The individual Python scripts are in `scripts/`, and the GitHub Actions workflow definitions are in `.github/workflows/`.
