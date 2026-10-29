-- Business question: Which funds currently have the highest annualized
-- rolling three-year NAV returns?
WITH latest AS (
    SELECT fund_key, MAX(date_key) AS latest_date
    FROM fact_nav
    GROUP BY fund_key
)
SELECT
    fund.name,
    fund.category,
    latest.latest_date,
    rolling.rolling_3y_return
FROM latest
JOIN dim_fund AS fund ON fund.fund_key = latest.fund_key
JOIN rolling_returns AS rolling
  ON rolling.scheme_code = fund.scheme_code
 AND date(rolling.date) = latest.latest_date
WHERE rolling.rolling_3y_return IS NOT NULL
ORDER BY rolling.rolling_3y_return DESC;
