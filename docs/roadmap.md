# FundScope India — project roadmap

This roadmap records verified implementation scope and outstanding verification.
It is not a claim that untested features are production-ready.

| Area | Current status | Evidence or limitation |
|---|---|---|
| NAV analytics and pipeline | Implemented | 16 MFapi.in schemes are configured; synthetic demo data is separate. Formulas and source limits are documented in [METHODOLOGY.md](../METHODOLOGY.md). |
| Backend API and sessions | Implemented | Protected API routes and SQLite sessions have automated tests. Production OAuth credentials, HTTPS, and deployment behavior are not verified. |
| Primary frontend | Implemented | Four workspace areas are routed and tested at mobile, tablet, and desktop viewport widths. |
| Fund/index comparison | Implemented | Each fund/index pair uses exact shared NAV observation dates; period windows and sample counts are included. |
| Reproducible findings | Implemented | [`src/key_findings.py`](../src/key_findings.py) generates the current sourced summary and JSON report. |
| Accessibility and responsive coverage | Verified in-browser | Shared data states, keyboard-accessible tables/controls, focus styles, token contrast checks, mobile menu, and no-overflow checks are covered. |
| Component and browser tests | Implemented | Component tests cover filters, calculator output, and shared states; Playwright covers auth, primary pages, console errors, overflow, and screenshots. |
| Container deployment | Defined, build unverified | Dockerfiles and Compose configuration are present; Docker is unavailable in the current environment. |
| Production deployment | Not configured | No deployment host, OAuth credentials, or production origins were provided. |
| License | Unspecified | No license file is added until a license is selected. |

## Verification baseline

Python tests, Ruff, mypy, frontend TypeScript checks, Vitest, the production
frontend build, and the Playwright suite pass in the current environment. The
token contrast calculations meet WCAG AA for the tested text/surface pairs.
Exact commands and the unverified Docker build are recorded in
[`CHANGES.md`](../CHANGES.md). Rerun the documented checks after changes.

## Data limitations

- MFapi.in is a third-party source, not the official AMFI site.
- Historical NAV-based outputs do not deduct fees, taxes, exit loads, or model
  investor cash flows.
- Synthetic data is a labelled demonstration only and is not market data.
- Provider access, freshness, coverage, reuse rights, and production behavior
  require independent verification.
