-- Business question: How many funds have enough history to report each
-- rolling horizon, by category?
SELECT
    fund.category,
    COUNT(*) AS fund_count,
    SUM(CASE WHEN summary.rolling_1y_return IS NOT NULL THEN 1 ELSE 0 END)
        AS funds_with_1y_return,
    SUM(CASE WHEN summary.rolling_3y_return IS NOT NULL THEN 1 ELSE 0 END)
        AS funds_with_3y_return,
    SUM(CASE WHEN summary.rolling_5y_return IS NOT NULL THEN 1 ELSE 0 END)
        AS funds_with_5y_return,
    SUM(CASE WHEN summary.rolling_3y_return IS NULL THEN 1 ELSE 0 END)
        AS funds_missing_3y_history
FROM dim_fund AS fund
JOIN fund_performance_summary AS summary ON summary.fund_key = fund.fund_key
GROUP BY fund.category
ORDER BY fund.category;
