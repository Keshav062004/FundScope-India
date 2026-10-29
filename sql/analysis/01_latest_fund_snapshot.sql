-- Business question: What are the latest full-history metrics for every fund?
SELECT
    scheme_code,
    name,
    category,
    amc,
    observations,
    start_date_key,
    end_date_key,
    cagr,
    annualized_volatility,
    max_drawdown,
    sharpe_ratio,
    sortino_ratio,
    calmar_ratio
FROM fund_performance_summary
ORDER BY category, name;
