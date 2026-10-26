# Stage 3B — Manual publishing

Add `.github/workflows/publish-data.yml` to the repository. Leave the existing
`test-data.yml` in place. No website source files need replacing.

## Before running
- Confirm Stage 3A's test workflow passed using `sheets`.
- GitHub repository Settings → Actions → General → Workflow permissions:
  **Read and write permissions** must be allowed for the workflow's token.
  The workflow explicitly requests `contents: write`.
- If branch protection rules block direct pushes to `main`, this workflow will
  fail at the push step; the existing live JSON remains unchanged in GitHub.
- Check Google Sheets access and the four repository variables are configured.

## Run
Actions → Publish waste data (manual) → Run workflow → main.
Review the steps and the resulting bot commit (if data changed).
If no JSON content changed, the workflow succeeds without creating a commit.

## Safety boundaries
- Runs only when manually dispatched; no cron and no push trigger.
- Reads the private sheet using WIF; no long-lived credential file committed.
- Runs all tests and builds to `build/data` first.
- Publishes only four named JSON files under `data/`.
- No-op if they are byte-identical to the current published JSON.
- Never edits HTML, CSS, JS, or the source spreadsheet.
- GitHub Pages will redeploy when the bot commit is pushed, depending on Pages
  configuration.

## Caveats
- A passing build establishes structural and reconciliation checks, not that
  every new number or reporting-policy choice is analytically appropriate.
- The four files are committed together, but GitHub Pages may take time to
  redeploy and browser caches may retain earlier responses.
- If a GitHub Pages deployment is configured through Actions rather than
  branch publishing, confirm its trigger accepts this bot commit.
