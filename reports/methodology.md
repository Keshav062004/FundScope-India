# Methodology and limitations

The canonical source, risk-free-rate lookup values, calculation definitions,
annualization choice, and excluded investment effects are documented in
[`../METHODOLOGY.md`](../METHODOLOGY.md).

## Data quality
The pipeline parses dates, converts NAV to numeric, removes missing scheme/date/NAV rows, rejects non-positive NAV values, deduplicates by scheme code and date, and sorts observations chronologically. It reports row counts and the effective date range.

## Return metrics
Daily return = current NAV / prior observation NAV − 1 within each scheme. If the data has gaps, this is the return over the gap between observations, not necessarily a one-day return; verify gaps before annualizing.

Period return = last NAV / first NAV − 1.
CAGR = (last NAV / first NAV)^(365.25 / elapsed calendar days) − 1.
Annualized volatility = sample standard deviation of daily observation returns × √252.
Maximum drawdown = minimum of NAV / running maximum NAV − 1.
Sharpe and Sortino use approximate year-specific Indian 91-day T-bill
proxies, converted to daily returns with 252 periods per year. Calmar is CAGR
divided by absolute maximum drawdown. Rolling 1-, 3-, and 5-year returns use
annualized NAV growth from the latest observation on or before each calendar
anniversary. Calendar-year returns compare each year's last observed NAV to
the prior calendar year's last observed NAV.

## Limitations
- The included demo dataset is synthetic.
- NAV total-return treatment depends on the scheme and source; verify the data definition.
- NAV observations can be irregular due to holidays or missing data.
- This starter project does not calculate benchmark-relative metrics unless benchmark data is added and validated.
- Metrics from unequal periods or unlike categories are not directly comparable.
- Risk-free rates are approximate annual proxies, not an exact dated auction series.
- Historical results are not forecasts or investment advice.
