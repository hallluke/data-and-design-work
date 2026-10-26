# Stage 3A — Validation-only checkpoint

This update adds strict validation before the existing four JSON outputs are written. **It does not publish to `data/` or change the website.**

## Install

Copy `scripts/build_data.py`, `scripts/validate_data.py`, and `tests/test_validation.py` into the corresponding locations in your existing repository. The ZIP contains **only these three changed/new files and this guide**. Keep your existing Stage 2 workflow unchanged.

## Test

Run the existing **Test waste data pipeline** GitHub Action manually with `source=sheets`. The workflow already executes `python -m unittest discover -s tests -v`, so it will pick up the new tests automatically. It will also generate `waste-json-test-build` as before.

Local command: `python -m unittest discover -s tests -v` and `python scripts/build_data.py --csv reference/collections-source.csv --output build/data`.

## What is checked

Source record shape, ISO dates and start date, valid material, positive finite weights, unique date/material; complete ordered month/group/material matrices; finite nonnegative summary values; recorded source/group reconciliation; imputed total reconciliation (batteries excluded); dry-recycling detail reconciliation; independently calculated monthly and comparison completeness cutoffs; valid residual projection metadata and ordered scenarios.

## Known limits before publishing

- The transformation still uses a fixed imputation start of 2025-01-01. If the source history changes, review this policy.
- The existing year-on-year website chart may require adjustments as 2027 arrives; this checkpoint does not alter the website.
- No publication, scheduling, or Git write permissions are enabled. Those belong in Stage 3B after review.
- JSON promotion into an output folder is per-file, not a single atomic transaction across all four files. Publication will need a separate guarded commit stage.
