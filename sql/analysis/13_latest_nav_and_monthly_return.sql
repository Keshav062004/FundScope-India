-- Business question: What are the latest NAV and most recent available
-- month-over-month return for each fund?
WITH latest_nav AS (
    SELECT
        fund_key,
        date_key,
        nav,
        ROW_NUMBER() OVER (PARTITION BY fund_key ORDER BY date_key DESC) AS row_number
    FROM fact_nav
),
latest_month AS (
    SELECT
        scheme_code,
        month,
        month_end_nav,
        monthly_return,
        ROW_NUMBER() OVER (PARTITION BY scheme_code ORDER BY month DESC) AS row_number
    FROM monthly_returns
)
SELECT
    fund.name,
    fund.category,
    latest_nav.date_key AS latest_nav_date,
    latest_nav.nav AS latest_nav,
    latest_month.month AS latest_month,
    latest_month.monthly_return AS latest_monthly_return
FROM dim_fund AS fund
JOIN latest_nav ON latest_nav.fund_key = fund.fund_key AND latest_nav.row_number = 1
LEFT JOIN latest_month
  ON latest_month.scheme_code = fund.scheme_code AND latest_month.row_number = 1
ORDER BY fund.category, fund.name;
