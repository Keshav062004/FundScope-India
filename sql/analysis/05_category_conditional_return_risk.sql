-- Business question: How do equity, debt, and index cohorts compare on
-- positive CAGR coverage, downside performance, and risk-adjusted metrics?
SELECT
    category,
    COUNT(*) AS fund_count,
    SUM(CASE WHEN cagr > 0 THEN 1 ELSE 0 END) AS funds_with_positive_cagr,
    AVG(CASE WHEN cagr > 0 THEN cagr END) AS average_positive_cagr,
    AVG(CASE WHEN cagr <= 0 THEN cagr END) AS average_nonpositive_cagr,
    AVG(annualized_volatility) AS average_annualized_volatility,
    AVG(max_drawdown) AS average_max_drawdown,
    AVG(sharpe_ratio) AS average_sharpe_ratio,
    AVG(sortino_ratio) AS average_sortino_ratio
FROM fund_performance_summary
WHERE cagr IS NOT NULL
GROUP BY category
ORDER BY average_positive_cagr DESC;
