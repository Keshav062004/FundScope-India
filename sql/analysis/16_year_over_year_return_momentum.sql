-- Business question: Did a fund's calendar-year return improve or weaken
-- compared with its own previous available calendar-year return?
WITH annual AS (
    SELECT
        fund.name,
        fund.category,
        returns.year,
        returns.calendar_year_return,
        LAG(returns.calendar_year_return) OVER (
            PARTITION BY fund.fund_key ORDER BY returns.year
        ) AS prior_year_return
    FROM calendar_year_returns AS returns
    JOIN dim_fund AS fund ON fund.scheme_code = returns.scheme_code
)
SELECT
    *,
    calendar_year_return - prior_year_return AS return_change_vs_prior_year
FROM annual
WHERE calendar_year_return IS NOT NULL
ORDER BY name, year;
