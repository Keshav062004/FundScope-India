-- Business question: Which fund leads each category on three-year return per
-- unit of realized volatility? This is a return/volatility score, not Sharpe.
WITH latest_nav_date AS (
    SELECT fund_key, MAX(date_key) AS latest_date
    FROM fact_nav
    GROUP BY fund_key
),
three_year_returns AS (
    SELECT
        fund_key,
        rolling_3y_return
    FROM (
        SELECT
            fund.fund_key,
            rolling.rolling_3y_return,
            ROW_NUMBER() OVER (
                PARTITION BY fund.fund_key ORDER BY date(rolling.date) DESC
            ) AS row_number
        FROM rolling_returns AS rolling
        JOIN dim_fund AS fund ON fund.scheme_code = rolling.scheme_code
        JOIN latest_nav_date AS latest ON latest.fund_key = fund.fund_key
        WHERE date(rolling.date) <= latest.latest_date
          AND rolling.rolling_3y_return IS NOT NULL
    )
    WHERE row_number = 1
),
three_year_daily_returns AS (
    SELECT
        nav.fund_key,
        observation.daily_return
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
    JOIN nav_observations AS observation
      ON observation.scheme_code = fund.scheme_code
     AND date(observation.date) = nav.date_key
    JOIN latest_nav_date AS latest ON latest.fund_key = nav.fund_key
    WHERE date(nav.date_key) > date(latest.latest_date, '-3 years')
      AND observation.daily_return IS NOT NULL
),
volatility AS (
    SELECT
        fund_key,
        COUNT(*) AS observations_3y,
        AVG(daily_return) AS mean_daily_return,
        AVG(daily_return * daily_return)
            - AVG(daily_return) * AVG(daily_return) AS daily_variance
    FROM three_year_daily_returns
    GROUP BY fund_key
),
scores AS (
    SELECT
        fund.fund_key,
        fund.name,
        fund.category,
        returns.rolling_3y_return,
        sqrt(MAX(volatility.daily_variance, 0) * 252.0)
            AS annualized_volatility_3y,
        returns.rolling_3y_return
            / NULLIF(sqrt(MAX(volatility.daily_variance, 0) * 252.0), 0)
            AS risk_adjusted_return_score
    FROM dim_fund AS fund
    JOIN three_year_returns AS returns ON returns.fund_key = fund.fund_key
    JOIN volatility ON volatility.fund_key = fund.fund_key
),
ranked AS (
    SELECT
        *,
        RANK() OVER (
            PARTITION BY category ORDER BY risk_adjusted_return_score DESC
        ) AS category_rank
    FROM scores
    WHERE risk_adjusted_return_score IS NOT NULL
)
SELECT *
FROM ranked
WHERE category_rank = 1;
