-- Business question: Which funds led and lagged each calendar year, based on
-- the last available NAV in each year versus the prior calendar year-end NAV?
WITH ranked_returns AS (
    SELECT
        fund.name,
        fund.category,
        annual.year,
        annual.calendar_year_return,
        RANK() OVER (
            PARTITION BY annual.year ORDER BY annual.calendar_year_return DESC
        ) AS best_rank,
        RANK() OVER (
            PARTITION BY annual.year ORDER BY annual.calendar_year_return ASC
        ) AS weakest_rank
    FROM calendar_year_returns AS annual
    JOIN dim_fund AS fund ON fund.scheme_code = annual.scheme_code
    WHERE annual.calendar_year_return IS NOT NULL
)
SELECT *
FROM ranked_returns
WHERE best_rank <= 5 OR weakest_rank <= 5
ORDER BY year DESC, best_rank, name;
