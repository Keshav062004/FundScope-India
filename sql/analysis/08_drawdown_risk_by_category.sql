-- Business question: Which categories combine deeper historical losses with
-- more frequent drawdowns?
WITH drawdowns AS (
    SELECT
        fund.category,
        fund.fund_key,
        nav.date_key,
        nav.nav / MAX(nav.nav) OVER (
            PARTITION BY nav.fund_key ORDER BY nav.date_key
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) - 1.0 AS drawdown
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
),
fund_drawdown AS (
    SELECT
        category,
        fund_key,
        MIN(drawdown) AS maximum_drawdown,
        SUM(CASE WHEN drawdown < 0 THEN 1 ELSE 0 END) AS underwater_rows
    FROM drawdowns
    GROUP BY category, fund_key
)
SELECT
    category,
    COUNT(*) AS fund_count,
    AVG(maximum_drawdown) AS average_fund_maximum_drawdown,
    MIN(maximum_drawdown) AS deepest_fund_drawdown,
    AVG(underwater_rows) AS average_underwater_observations
FROM fund_drawdown
GROUP BY category
ORDER BY average_fund_maximum_drawdown;
