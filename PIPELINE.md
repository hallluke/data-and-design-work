# Household waste data pipeline

The dashboard reads JSON from the repository's `data/` directory. Python builds and validates the data; GitHub Actions can test a build without publishing or fetch a private Google Sheet and publish validated outputs.

## Source and generated files

- Private Google Sheets worksheet: **Collections**, columns exactly `Date`, `Material`, `Weight (kg)` (dates in `DD/MM/YYYY`).
- `scripts/fetch_sheet.py`: uses Google Application Default Credentials and the read-only Sheets scope to fetch the `Collections` worksheet. It rejects malformed headers and incomplete rows and writes a temporary CSV.
- `scripts/build_collections.py`: parses and validates source records.
- `scripts/build_summaries.py`: produces recorded and collection-interval imputed monthly aggregates.
- `scripts/build_comparison.py`: generates the provisional residual-waste comparison estimate.
- `scripts/validate_data.py`: validates the combined dataset.
- `scripts/build_data.py`: builds and validates four JSON files in a staging directory before replacing files in its **specified output directory**.
- `data/collections.json`, `data/monthly.json`, `data/detail.json`, `data/comparison.json`: published datasets; `data/refresh.json`: last successful publication timestamp.
- `reference/collections-source.csv`: historical test fixture, **not** the live sheet.

Material definitions are maintained in `config/materials.json`. Run `python3 scripts/sync_materials.py` to update the browser's generated `js/material-registry.js`. Python reads the configuration directly.

## Local verification (does not publish)

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 scripts/build_data.py --csv reference/collections-source.csv --output build/data
```

The last command generates test JSON under `build/data`; it does not modify the site's `data/` directory.

## GitHub Actions workflows

### `test-data.yml` — Test waste data pipeline

Runs on manual dispatch and on pushes affecting pipeline scripts, tests, reference files, the workflow or requirements. By default it uses the historical CSV fixture. Manual dispatch also offers `sheets`, which authenticates to Google Cloud and reads the private Collections worksheet. The workflow runs Python tests, builds JSON and uploads a `waste-json-test-build` artifact for inspection (seven-day retention). **It does not commit or publish data.**

### `publish-data.yml` — Publish waste data (manual)

Runs on manual dispatch and is configured with a daily scheduled trigger at **03:30 Europe/London**. GitHub Actions scheduled jobs can start later than their configured time. The workflow:

1. Checks out the repository and installs Python 3.12 dependencies.
2. Runs Python tests.
3. Authenticates through Google Cloud Workload Identity Federation; fetches the private Collections sheet into `build/source/collections.csv`.
4. Builds and validates JSON in `build/data/`, checking that exactly four expected JSON files exist and parse successfully.
5. Copies only those four validated files into `data/` and writes `data/refresh.json` with a UTC timestamp.
6. Stages only the four JSON files and `refresh.json`; commits and pushes them to the triggering branch if changes exist. If no staged changes exist, no commit is created.

The workflow has job-level `contents: write` permission to publish. It uses the repository's short-lived GitHub token for pushing, not a stored GitHub personal access token. The test workflow has read-only repository permission.

**Required GitHub Actions variables:** `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, and `GOOGLE_SHEET_ID`. The Google Cloud service account needs read access to the relevant spreadsheet. The workflow obtains temporary credentials using OIDC; no service-account key file should be committed.

## Safety and maintenance notes

- Do not commit the private sheet export, cloud credentials or tokens. The fixture under `reference/` is a separate historical test dataset.
- The pipeline expects the configured material categories and rejects missing or malformed source data rather than treating absence as zero.
- The initial imputation date is currently 2025-01-01. Review this if the collection history changes.
- The year-on-year chart currently compares 2025 with 2026; plan a display update before publishing a new comparison year.
- Review the provisional comparison methodology and source coverage before relying on unattended future-year publication.
- The monthly JSON currently uses display-label group keys for compatibility. Changes to material groups require rebuilding the derived datasets.
- Tests and schema checks are not substitutes for browser checks of the published charts and interaction states.
