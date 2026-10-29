-- Business question: Which funds had the largest positive or negative
-- month-over-month NAV changes in each month?
WITH monthly_changes AS (
    SELECT
        fund.fund_key,
        fund.name,
        fund.category,
        monthly.month AS year_month,
        monthly.month_end_nav,
        LAG(monthly.month_end_nav) OVER (
            PARTITION BY fund.fund_key ORDER BY monthly.month
        ) AS prior_month_end_nav,
        monthly.monthly_return
    FROM monthly_returns AS monthly
    JOIN dim_fund AS fund ON fund.scheme_code = monthly.scheme_code
)
SELECT
    *,
    RANK() OVER (
        PARTITION BY year_month ORDER BY monthly_return DESC
    ) AS monthly_return_rank,
    RANK() OVER (
        PARTITION BY year_month ORDER BY monthly_return ASC
    ) AS monthly_return_bottom_rank
FROM monthly_changes
WHERE monthly_return IS NOT NULL
ORDER BY year_month DESC, monthly_return_rank, name;
