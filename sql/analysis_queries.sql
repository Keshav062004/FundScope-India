-- Run these in SQLite after `python run_project.py`.

-- 1. Inspect the number of schemes and observations.
SELECT COUNT(DISTINCT scheme_code) AS schemes,
       COUNT(*) AS nav_rows
FROM nav_observations;

-- 2. Compare historical returns and risk (descriptive only).
SELECT scheme_name, category, observations, cagr,
       annualized_volatility, max_drawdown, sharpe_ratio
FROM fund_metrics
WHERE observations >= 30
ORDER BY cagr DESC;

-- 3. Find the largest historical drawdowns.
SELECT scheme_name, max_drawdown
FROM fund_metrics
WHERE max_drawdown IS NOT NULL
ORDER BY max_drawdown ASC
LIMIT 10;

-- 4. Summarize average calculated metrics by category.
SELECT category,
       COUNT(*) AS scheme_count,
       AVG(cagr) AS mean_cagr,
       AVG(annualized_volatility) AS mean_volatility
FROM fund_metrics
GROUP BY category
ORDER BY mean_cagr DESC;

-- 5. Monthly returns for one scheme (replace the code).
SELECT scheme_code, scheme_name, month, month_end_nav, monthly_return
FROM monthly_returns
WHERE scheme_code = 'DEMO001'
ORDER BY month;

-- 6. Window function: rank schemes by CAGR within category.
SELECT scheme_name, category, cagr,
       RANK() OVER (PARTITION BY category ORDER BY cagr DESC) AS category_rank
FROM fund_metrics
WHERE cagr IS NOT NULL;
