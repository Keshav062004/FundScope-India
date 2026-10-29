-- Business question: What is the current three-year return distribution
-- within each fund category?
WITH latest AS (
    SELECT fund_key, MAX(date_key) AS latest_date
    FROM fact_nav
    GROUP BY fund_key
),
fund_returns AS (
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
)
SELECT
    category,
    COUNT(rolling_3y_return) AS funds_with_full_three_year_history,
    AVG(rolling_3y_return) AS average_annualized_three_year_return,
    MIN(rolling_3y_return) AS lowest_annualized_three_year_return,
    MAX(rolling_3y_return) AS highest_annualized_three_year_return
FROM fund_returns
GROUP BY category
ORDER BY average_annualized_three_year_return DESC;
