# Changes and verification

This report distinguishes completed checks from items that could not be
verified. Test and screenshot fixtures are synthetic and are labelled in the
UI; financial formulas were not changed.

## Phase 1 — Errors, documentation, and setup

**Changes:** Replaced the CI badge slug placeholder with instructions; removed
hard-coded test totals; moved the detailed roadmap to `docs/roadmap.md`; updated
Python setup to install development requirements; checked the `secrets.toml`
ignore rule.

**Files:** [`README.md`](./README.md), [`docs/roadmap.md`](./docs/roadmap.md);
deleted the root `PROJECT_ROADMAP.md`.

**Checks:** The phase baseline passed 139 Python tests, Ruff, mypy, frontend
TypeScript, 5 Vitest tests, and the frontend production build. A fresh temporary
Python environment also passed install, tests, Ruff, and mypy. Frontend
dependencies/build were verified in an isolated clean copy. An in-place
`npm ci` failed on Windows with `EPERM` while a pre-existing Vite process held
the Rolldown binary; that process was not stopped.

## Phase 2 — Scope, findings, and benchmarks

**Changes:** Reduced application routes/navigation to Overview, Fund Explorer,
Calculators, and Portfolio; rewrote landing copy to describe supported
capabilities and limitations; generated sourced key findings from processed
data; added exact-common-date fund/index comparisons to the API and Explorer;
added dataset-refresh-only “What’s new” content. No news or performance figures
were invented.

**Files:** [`src/key_findings.py`](./src/key_findings.py),
[`tests/test_key_findings.py`](./tests/test_key_findings.py),
[`reports/key_findings.json`](./reports/key_findings.json),
[`backend/main.py`](./backend/main.py),
[`frontend/src/api.ts`](./frontend/src/api.ts),
[`frontend/src/App.tsx`](./frontend/src/App.tsx),
[`frontend/src/navigation.ts`](./frontend/src/navigation.ts),
[`frontend/src/pages/Landing.tsx`](./frontend/src/pages/Landing.tsx),
[`frontend/src/pages/Overview.tsx`](./frontend/src/pages/Overview.tsx),
[`frontend/src/pages/ExploreFunds.tsx`](./frontend/src/pages/ExploreFunds.tsx),
[`frontend/src/components/Layout.tsx`](./frontend/src/components/Layout.tsx),
[`frontend/src/components/TopNav.tsx`](./frontend/src/components/TopNav.tsx),
[`README.md`](./README.md), and [`docs/roadmap.md`](./docs/roadmap.md).

**Checks:** 141 Python tests passed; `ruff check src backend` and
`mypy src backend` passed. Frontend TypeScript, the then-current 5 Vitest tests,
and production build passed in the isolated frontend copy.

## Phase 3 — UI consistency and accessibility

**Changes:** Consolidated shared navy/emerald, text, chart, status, spacing, and
type tokens; added shared loading, empty, retryable error, and synthetic-data
states; improved table scroll-region and control labels; added visible focus
styles and reduced-motion handling; made calculator range labels accessible;
used readable text colors rather than chart-series colors for calculator
results. The educational/not-investment-advice disclaimer remains.

**Files:** [`frontend/src/index.css`](./frontend/src/index.css),
[`frontend/src/theme.ts`](./frontend/src/theme.ts),
[`frontend/src/components/DataState.tsx`](./frontend/src/components/DataState.tsx),
[`frontend/src/components/DataTable.tsx`](./frontend/src/components/DataTable.tsx),
[`frontend/src/components/Card.tsx`](./frontend/src/components/Card.tsx),
[`frontend/src/components/MarketArt.tsx`](./frontend/src/components/MarketArt.tsx),
[`frontend/src/components/Layout.tsx`](./frontend/src/components/Layout.tsx),
[`frontend/src/components/TopNav.tsx`](./frontend/src/components/TopNav.tsx),
[`frontend/src/pages/Landing.tsx`](./frontend/src/pages/Landing.tsx),
[`frontend/src/pages/Overview.tsx`](./frontend/src/pages/Overview.tsx),
[`frontend/src/pages/ExploreFunds.tsx`](./frontend/src/pages/ExploreFunds.tsx),
[`frontend/src/pages/Portfolio.tsx`](./frontend/src/pages/Portfolio.tsx),
[`frontend/src/pages/Calculators.tsx`](./frontend/src/pages/Calculators.tsx),
and [`frontend/src/pages/Login.tsx`](./frontend/src/pages/Login.tsx).

**Checks:** Frontend TypeScript check, all 11 Vitest tests, and production build
passed. WCAG contrast calculations for the defined text/status tokens against
the page, surface, and sunken-surface colors passed 4.5:1; the minimum measured
ratio was 5.24:1. Brand-contrast text on the emerald action color measured
7.50:1.

## Phase 4 — Responsive behavior and screenshots

**Changes:** Added Playwright coverage for the landing page and all four
workspace pages at 360, 768, 1024, and 1440 pixels; checks include browser
console errors, document overflow, chart sizing, and mobile-menu keyboard
dismissal. Aligned the landing and dashboard navigation breakpoints after the
768-pixel test exposed a hidden-drawer edge case. Replaced the concept-only
image with actual Playwright captures. Every capture uses a visibly labelled
synthetic fixture.

**Files:** [`frontend/e2e/responsive.spec.ts`](./frontend/e2e/responsive.spec.ts),
[`frontend/src/pages/Landing.tsx`](./frontend/src/pages/Landing.tsx),
[`frontend/src/components/TopNav.tsx`](./frontend/src/components/TopNav.tsx),
[`frontend/src/index.css`](./frontend/src/index.css),
[`assets/screenshots/`](./assets/screenshots/),
[`assets/README.txt`](./assets/README.txt); deleted
`assets/ai_dashboard_concept_mockup.png`.

**Checks:** `npm run test:e2e` passed all 6 tests. All 20 page/viewport
screenshots were generated and visually spot-checked; the responsive checks
reported no horizontal overflow or console errors.

## Phase 5 — Tests, deployment, and documentation

**Changes:** Added component tests for shared data states, fund filters/sorting,
and calculator output; added backend SQLite path configuration for a persistent
container volume; added backend/frontend Dockerfiles, Nginx API proxy, Compose,
`.env.example`, and `.dockerignore` files; added contributor guidance, a
Mermaid architecture diagram, screenshot gallery, and this report. Replaced a
credential-shaped value in the tracked secrets template with a generic
placeholder. `secrets.toml` remains ignored. No license was added because none
was specified.

**Files:** [`frontend/src/components/DataState.test.tsx`](./frontend/src/components/DataState.test.tsx),
[`frontend/src/pages/ExploreFunds.test.tsx`](./frontend/src/pages/ExploreFunds.test.tsx),
[`frontend/src/pages/Calculators.test.tsx`](./frontend/src/pages/Calculators.test.tsx),
[`backend/sessions.py`](./backend/sessions.py),
[`Dockerfile`](./Dockerfile),
[`docker-compose.yml`](./docker-compose.yml),
[`.dockerignore`](./.dockerignore),
[`.env.example`](./.env.example),
[`frontend/Dockerfile`](./frontend/Dockerfile),
[`frontend/nginx.conf`](./frontend/nginx.conf),
[`frontend/.dockerignore`](./frontend/.dockerignore),
[`CONTRIBUTING.md`](./CONTRIBUTING.md),
[`secrets.example.toml`](./secrets.example.toml),
[`.gitignore`](./.gitignore),
[`README.md`](./README.md), and [`docs/roadmap.md`](./docs/roadmap.md).

**Checks:** Final Python suite passed (141 tests); Ruff and mypy passed. Final
frontend TypeScript check, all 11 Vitest tests, production build, and all 6
Playwright tests passed. `git check-ignore` confirmed `secrets.toml` is ignored.

**Not verified:** Docker and Docker Compose are not installed in this
environment, so the images and `docker compose up --build` could not be run.
Production OAuth, HTTPS, and deployment credentials were not provided. The
contrast check covers the shared text/status token combinations and action
foreground, not every rendered pixel or external browser/theme configuration.
