-- Business question: What is each fund's 30-observation rolling average NAV
-- and how far is today's NAV above or below that smoothed level?
WITH smoothed_nav AS (
    SELECT
        fund.name,
        fund.category,
        nav.date_key,
        nav.nav,
        AVG(nav.nav) OVER (
            PARTITION BY nav.fund_key
            ORDER BY nav.date_key
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) AS rolling_30_observation_average,
        COUNT(*) OVER (
            PARTITION BY nav.fund_key
            ORDER BY nav.date_key
            ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
        ) AS observations_in_window
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
)
SELECT
    *,
    nav / NULLIF(rolling_30_observation_average, 0) - 1.0 AS distance_from_average
FROM smoothed_nav
WHERE observations_in_window = 30
ORDER BY name, date_key;
