-- Business question: How much observed history supports each fund's
-- full-history metric comparison?
SELECT
    fund.name,
    fund.category,
    summary.observations,
    summary.start_date_key,
    summary.end_date_key,
    CAST(julianday(summary.end_date_key) - julianday(summary.start_date_key)
         AS INTEGER) AS history_days,
    summary.cagr,
    summary.annualized_volatility
FROM fund_performance_summary AS summary
JOIN dim_fund AS fund ON fund.fund_key = summary.fund_key
ORDER BY history_days DESC, observations DESC;
