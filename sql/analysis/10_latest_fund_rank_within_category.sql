-- Business question: How do funds rank within their own category by CAGR,
-- Sharpe, and Sortino rather than across unlike peer groups?
SELECT
    name,
    category,
    cagr,
    sharpe_ratio,
    sortino_ratio,
    RANK() OVER (PARTITION BY category ORDER BY cagr DESC) AS cagr_rank,
    RANK() OVER (PARTITION BY category ORDER BY sharpe_ratio DESC) AS sharpe_rank,
    RANK() OVER (PARTITION BY category ORDER BY sortino_ratio DESC) AS sortino_rank
FROM fund_performance_summary
WHERE cagr IS NOT NULL
ORDER BY category, cagr_rank, name;
