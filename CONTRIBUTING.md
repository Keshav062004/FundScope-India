# Contributing

FundScope India is an educational historical-analytics project, not investment
advice. Contributions should preserve the distinction between observed data,
synthetic fixtures, and interpretation.

## Before changing code

- Read [README.md](./README.md) and [METHODOLOGY.md](./METHODOLOGY.md).
- Keep financial formulas unchanged unless fixing a demonstrated bug. A formula
  change must include a hand-calculated expected-value test and explain the
  correction.
- Do not invent fund names, performance figures, or news. Mark all test or demo
  records as synthetic in both fixtures and rendered UI.
- Never add credentials. `secrets.toml` and `.env` files are local-only; use the
  tracked example files as templates.

## Local checks

From the project root:

```bash
python -m ruff check src backend
python -m mypy src backend
python -m pytest -q tests
```

From `frontend/`:

```bash
npx tsc --noEmit -p tsconfig.app.json
npx vitest run
npm run build
npx playwright install chromium
npm run test:e2e
```

The Playwright suite uses synthetic API fixtures and refreshes the screenshots
in `assets/screenshots/`. Do not replace these with fabricated real-market
claims.

## Pull requests

- Keep changes focused and explain user-visible behavior changes.
- Add regression tests for bug fixes and tests for new interaction states.
- Update directly affected documentation and the verified project status.
- Include the checks you ran and call out any checks you could not run.
- Do not commit generated secrets, local databases, dependency directories, or
  Playwright test-result artifacts.
