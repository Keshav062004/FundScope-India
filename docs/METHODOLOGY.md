# Metrics and methodology

This note describes the calculations implemented in `src/analytics.py`.
Metrics summarize observed NAV history; they are descriptive and are not
forecasts or investment advice.

## CAGR

For starting NAV \(P_0\), ending NAV \(P_1\), and elapsed calendar days \(d\),
the code calculates:

\[
\operatorname{CAGR} = (P_1/P_0)^{365.25/d} - 1.
\]

The period in years is the date difference between the last and first NAV
observations divided by 365.25. CAGR is unavailable when there are fewer than
two observations or the date span is zero.

## Sharpe ratio

Sharpe uses daily observed NAV returns minus an approximate, year-specific
Indian 91-day Treasury-bill proxy. The code converts each annual proxy \(y_t\)
to a per-observation rate as \((1+y_t)^{1/252}-1\), subtracts that from the
return, divides the mean excess return by the sample standard deviation of
fund returns, then multiplies by \(\sqrt{252}\). The annualization factor is
252. The rates are rounded calendar-year estimates in `src/analytics.py`;
years outside its table use the nearest endpoint rate.

## Maximum drawdown

For each NAV, the code compares it with the highest NAV observed up to that
point. Maximum drawdown is the minimum value of `NAV / running peak NAV - 1`.
It is a negative percentage (or zero) describing the largest observed peak to
trough decline in the series.

## Volatility

Volatility is the sample standard deviation (`ddof=1`) of returns between
adjacent retained NAV observations, multiplied by \(\sqrt{252}\). The fixed
252-observation annualization is applied to observed returns; missing calendar
or trading days are not filled with synthetic observations.

## Data limits

The processed snapshot in `data/processed/cleaned_nav.csv` contains 42,372
NAV rows for 16 schemes, dated from 2013-01-01 through 2026-10-29. These are
the combined dataset bounds; each scheme has its own start and end dates, so
full-history metrics may cover different periods.

The cleaning step parses dates and NAV values, drops rows with invalid dates,
missing values, or non-positive NAVs, keeps the last row for duplicate
`(scheme_code, date)` pairs, and sorts each scheme by date. Daily returns use
the percentage change from the previous retained observation of that same
scheme. Missing days are not forward-filled: a return spans the gap between
the two adjacent available NAV observations and is still treated as one
observed return for volatility and Sharpe annualization.

The real-data source is MFapi.in, a third-party aggregator and not the
official AMFI site. Coverage, update timing, and completeness depend on that
source. Synthetic demo data, when selected, is not market data.
