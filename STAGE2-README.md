# Stage 2: Private Google Sheets test build

This is an **incremental update** to the existing `data-and-design-work` repository. Copy only `scripts/fetch_sheet.py`, `tests/test_fetch_sheet.py`, `requirements.txt`, and `.github/workflows/test-data.yml` into your repository. Existing site files and `data/*.json` must not be changed.

## GitHub configuration

Repository variables must exist: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`, `GOOGLE_SHEET_ID`. `GCP_PROJECT_ID` can remain but is not needed by this workflow.

The Google Cloud service account must have **Viewer** access to the spreadsheet, and the repository's Workload Identity principal must have **Workload Identity User** permission on that service account. The Google Sheets API must be enabled for the project.

## Test

1. Commit and push the four files above.
2. On GitHub: Actions > Test waste data pipeline > Run workflow.
3. Choose `sheets` in the source dropdown, then run.
4. Inspect the `Fetch private Collections tab` and `Build validated JSON` steps. Download `waste-json-test-build` to inspect the four JSON files.
5. If this fails, the site remains unchanged. Check errors without posting access tokens or private sheet contents.

A normal push or manual `csv` run still uses the historical fixture. The workflow never commits or publishes generated JSON.

## Formatting

`Collections!A:C` must have exactly `Date`, `Material`, `Weight (kg)` headers. Dates must display as `DD/MM/YYYY` (e.g. `07/01/2025`), and numeric weights must be formatted as simple decimals with a dot (e.g. `0.125`), not units or thousands separators. Sheet rows are converted to CSV and passed through the existing strict parser. The first Google Sheets run can fail validation if date or number formatting differs; that is intentional and safe.

## Security

Google OIDC uses temporary credentials. The generated credential file is temporary and must not be committed. No sheet rows are uploaded as an artifact; only the four generated JSON outputs are uploaded (these outputs contain the collection data, as they already do on the public site).
