# Household waste data pipeline — GitHub Stage 1

**Safe test-only package.** Copy the contents into the root of the existing `data-and-design-work` repository. Do not replace its existing `index.html`, `css/`, `js/`, or `data/` files. This package does not contact Google Sheets and cannot publish changes to the website.

## Included

- `scripts/build_collections.py`: strict parsing and source validation (`Date`, `Material`, `Weight (kg)`; `DD/MM/YYYY` dates)
- `scripts/build_summaries.py`: recorded and collection-interval imputed aggregates
- `scripts/build_comparison.py`: provisional residual-waste estimate
- `scripts/build_data.py`: production-style entry point, output validation, and staged JSON generation
- `tests/`: historical regression tests and production-mode tests
- `reference/`: historical source CSV and four reference JSON files (test fixtures, not live input)
- `.github/workflows/test-data.yml`: manually runnable workflow; also tests when pipeline files are pushed
- `.gitignore`, `requirements.txt`: housekeeping

## Run locally

```sh
python3 -m unittest discover -s tests -v
python3 scripts/build_data.py --csv reference/collections-source.csv --output build/data
```

The first command checks historical regression **and** production-mode behavior. The second generates four JSON files in `build/data/`. The website's `data/` directory is untouched.

## Run on GitHub

Commit these files using GitHub Desktop and push. In the GitHub repository, open **Actions → Test waste data pipeline → Run workflow → Run workflow**. After success, click the run and download the `waste-json-test-build` artifact to inspect the four JSON files. No credentials, Google Cloud project, or special repository permissions are needed.

## Known limits / before publishing new data

1. The historical fixture verifies the October 2026 snapshot, but the build script does **not** require new data to match it.
2. The pipeline currently assumes all nine material categories have been collected; missing material data causes a validation error, not an invented zero.
3. The first imputation date remains 2025-01-01; this is intentional for the current dataset and should become a documented configuration if the source history changes.
4. The year-on-year website chart is still configured around 2025/2026. Future-year display rules need separate JS work before publishing 2027 data.
5. The provisional comparison cutoff advances based on collection coverage, but the projection's historical window and interpretation should be reviewed before unattended publication.
6. The current source CSV is a **historical test fixture** and is committed to this repository. The later Google Sheets workflow will fetch the live private sheet, and must not commit secrets or private sheet exports.
7. The pipeline does not yet enforce a future-date policy or all output-schema edge cases; those belong to the next comprehensive validation checkpoint.

## Safety

The workflow uses read-only repository permissions and only uploads an ephemeral build artifact. It does **not** commit generated JSON, write to `data/`, or trigger an update to the published site.
