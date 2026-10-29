# Data dictionary

## Input: `data/raw/nav_history.csv`
- `scheme_code` (text): unique scheme identifier.
- `scheme_name` (text): scheme display name.
- `date` (date): NAV observation date.
- `nav` (number): net asset value; must be positive.
- `category` (text, optional): scheme category. Used for grouping, not automatically sufficient for fair comparisons.

## Generated: `cleaned_nav.csv`
All input fields after cleaning, plus `daily_return`. Daily return is null for the first observation per scheme.

## Generated: `fund_metrics.csv`
- `observations`: count of valid NAV observations.
- `period_return`: last NAV / first NAV − 1.
- `cagr`: annualized compounded growth over observed calendar span.
- `annualized_volatility`: standard deviation of daily observation returns × √252.
- `max_drawdown`: largest peak-to-trough decline expressed as a negative fraction.
- `sharpe_ratio`: annualized excess-return/volatility ratio under the starter assumptions.
- `start_date`, `end_date`: observed date boundaries per scheme.

## Generated: `monthly_returns.csv`
Month-end NAV and change versus the prior available month-end NAV per scheme. The first month has no monthly return.
