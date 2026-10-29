# Analytics methodology

This note describes the calculations in `src/analytics.py`. Metrics summarize
observed historical NAV; they are descriptive and are not forecasts or
investment advice.

## Data source and coverage

The current real NAV series is retrieved from
[MFapi.in](https://www.mfapi.in/), a third-party API that republishes mutual
fund data. It is **not the official AMFI site** and its completeness, timing,
availability, and permitted reuse are not guaranteed by this project. Check
scheme identity and source dates before relying on an output. Synthetic demo
data is not market data.

Invalid dates and non-positive or missing NAVs are discarded. Rows are sorted
by scheme and date, and duplicate `(scheme_code, date)` observations retain
the last input row. Daily returns are the percentage change between adjacent
retained NAV observations.

## Risk-free-rate proxy

Sharpe and Sortino use a small, approximate calendar-year lookup of Indian
91-day Treasury-bill yields. Annual yields are converted to per-observation
daily rates using 252 periods per year. Each NAV return is matched to the
calendar year of its ending observation. The estimates are rounded annual
proxies, not an exact dated auction series:

| Calendar year | Approx. annual yield |
|---:|---:|
| 2013 | 8.3% |
| 2014 | 8.3% |
| 2015 | 7.3% |
| 2016 | 6.7% |
| 2017 | 6.1% |
| 2018 | 6.8% |
| 2019 | 6.1% |
| 2020 | 3.8% |
| 2021 | 3.4% |
| 2022 | 5.7% |
| 2023 | 6.9% |
| 2024 | 6.8% |
| 2025 | 5.8% |

These approximate values are based on the annual pattern of 91-day Treasury
Bill yields reported in the Reserve Bank of India's
[Handbook of Statistics on the Indian Economy](https://www.rbi.org.in/Scripts/AnnualPublications.aspx?head=Handbook%20of%20Statistics%20on%20Indian%20Economy)
and underlying
[Database on Indian Economy](https://data.rbi.org.in/) government-securities
statistics. They are intentionally rounded and should not be treated as
official annual averages or as investment-grade benchmark observations. For
years outside the table, the nearest endpoint rate is carried forward.

## Formulas

Let \(P_t\) be a cleaned NAV observation, \(r_t=P_t/P_{t-1}-1\), and \(d\) the
number of calendar days between the first and last observations.

- **Period return:** \(P_{\mathrm{last}}/P_{\mathrm{first}}-1\).
- **CAGR:** \((P_{\mathrm{last}}/P_{\mathrm{first}})^{365.25/d}-1\).
  It is unavailable with fewer than two observations or a zero-day span.
- **Annualized volatility:** sample standard deviation of daily observed
  returns (\(ddof=1\)) multiplied by \(\sqrt{252}\).
- **Maximum drawdown:** minimum of \(P_t/\max_{s\leq t}P_s-1\).
- **Sharpe ratio:** annualized arithmetic mean of daily excess returns divided
  by sample standard deviation of daily fund returns:
  \(\operatorname{mean}(r_t-r_{f,t})/\operatorname{std}(r_t)\times\sqrt{252}\).
  Each \(r_{f,t}\) is the corresponding calendar-year proxy converted as
  \((1+y_t)^{1/252}-1\).
- **Downside deviation:** square root of the mean squared negative daily
  excess returns, with non-negative excess observations contributing zero.
- **Sortino ratio:** mean daily excess return divided by downside deviation,
  multiplied by \(\sqrt{252}\). It is unavailable if downside deviation is
  zero or unavailable.
- **Calmar ratio:** CAGR divided by the absolute maximum drawdown. It is
  unavailable when CAGR/drawdown is unavailable or drawdown is zero.
- **Rolling 1-, 3-, and 5-year return:** annualized NAV growth from the latest
  observation on or before the ending observation's calendar anniversary:
  \((P_{\mathrm{end}}/P_{\mathrm{start}})^{365.25/\Delta d}-1\). If the
  history does not cover a full window, the result is null.
- **Calendar-year return:** last observed NAV in year \(Y\) divided by last
  observed NAV in year \(Y-1\), minus one. The first represented year and
  years without the immediately preceding calendar year have no return.
- **Monthly return:** last observed NAV in each month divided by the previous
  represented month's last observed NAV, minus one. The first represented
  month has no return.

## Annualization and interpretation

The implementation uses a fixed **252-observation** convention for annualized
daily volatility, Sharpe, and Sortino. It is a standard trading-year
approximation and keeps risk measures comparable when holidays and missing
observations make the actual number of rows differ. CAGR and rolling returns
instead use actual calendar-day spans (365.25 days per year). The risk-free
proxy is assigned by the return's ending calendar year; gaps in observed NAV
do not create synthetic daily observations.

## Explicitly not modeled

NAV-based calculations do not deduct expense-ratio drag, exit loads, or taxes.
They do not model investor cash flows or SIP contribution timing, execution
prices, liquidity, benchmark-relative risk, or future returns. A 91-day
Treasury-bill proxy is not a matched-maturity risk-free curve. Calendar-year
and rolling figures are dependent on the data provider's observations and
coverage.
