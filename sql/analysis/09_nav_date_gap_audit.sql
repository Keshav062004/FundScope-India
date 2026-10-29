-- Business question: Which funds have observation gaps longer than seven
-- calendar days, and what are the largest gaps to investigate?
WITH dated_nav AS (
    SELECT
        fund.name,
        fund.category,
        nav.date_key,
        LAG(nav.date_key) OVER (
            PARTITION BY nav.fund_key ORDER BY nav.date_key
        ) AS previous_date
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
)
SELECT
    name,
    category,
    previous_date,
    date_key AS next_date,
    CAST(julianday(date_key) - julianday(previous_date) AS INTEGER) AS gap_days
FROM dated_nav
WHERE previous_date IS NOT NULL
  AND julianday(date_key) - julianday(previous_date) > 7
ORDER BY gap_days DESC, name, next_date;
