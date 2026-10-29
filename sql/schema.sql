-- FundScope India star-schema migration (SQLite).
-- Apply after the pipeline has created nav_observations and fund_metrics:
--   sqlite3 fundscope.db < sql/schema.sql
-- The migration is idempotent and may also be run by src/pipeline.py after
-- rebuilding its source tables. Existing pipeline tables remain the source
-- of truth; these dimensions/facts are reporting-friendly projections.

PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS dim_fund (
    fund_key INTEGER PRIMARY KEY,
    scheme_code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT,
    amc TEXT
);

CREATE TABLE IF NOT EXISTS dim_date (
    date_key TEXT PRIMARY KEY,
    calendar_date TEXT NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    month INTEGER NOT NULL,
    month_name TEXT NOT NULL,
    year_month TEXT NOT NULL,
    day_of_month INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL,
    is_month_end INTEGER NOT NULL CHECK (is_month_end IN (0, 1))
);

CREATE TABLE IF NOT EXISTS fact_nav (
    fund_key INTEGER NOT NULL,
    date_key TEXT NOT NULL,
    nav REAL NOT NULL CHECK (nav > 0),
    PRIMARY KEY (fund_key, date_key),
    FOREIGN KEY (fund_key) REFERENCES dim_fund(fund_key),
    FOREIGN KEY (date_key) REFERENCES dim_date(date_key)
);

CREATE TABLE IF NOT EXISTS fact_metrics (
    metric_key INTEGER PRIMARY KEY,
    fund_key INTEGER NOT NULL,
    period TEXT NOT NULL,
    start_date_key TEXT,
    end_date_key TEXT,
    observations INTEGER,
    starting_nav REAL,
    ending_nav REAL,
    period_return REAL,
    cagr REAL,
    annualized_volatility REAL,
    max_drawdown REAL,
    sharpe_ratio REAL,
    sortino_ratio REAL,
    calmar_ratio REAL,
    UNIQUE (fund_key, period),
    FOREIGN KEY (fund_key) REFERENCES dim_fund(fund_key),
    FOREIGN KEY (start_date_key) REFERENCES dim_date(date_key),
    FOREIGN KEY (end_date_key) REFERENCES dim_date(date_key)
);

-- Rebuild the reporting projection so switching between demo and real inputs
-- cannot leave stale funds, NAV rows, or metrics in the star schema.
DELETE FROM fact_nav;
DELETE FROM fact_metrics;
DELETE FROM dim_date;
DELETE FROM dim_fund;

WITH fund_source AS (
    SELECT
        scheme_code,
        MAX(scheme_name) AS name,
        MAX(category) AS category
    FROM nav_observations
    GROUP BY scheme_code
)
INSERT INTO dim_fund (scheme_code, name, category, amc)
SELECT
    scheme_code,
    name,
    category,
    CASE
        WHEN name LIKE 'SBI %' THEN 'SBI Mutual Fund'
        WHEN name LIKE 'Navi %' THEN 'Navi Mutual Fund'
        WHEN name LIKE 'L&T %' THEN 'L&T Mutual Fund'
        WHEN name LIKE 'Taurus %' THEN 'Taurus Mutual Fund'
        WHEN name LIKE 'HSBC %' THEN 'HSBC Mutual Fund'
        WHEN name LIKE 'Franklin %' THEN 'Franklin Templeton Mutual Fund'
        WHEN name LIKE 'Parag Parikh %' THEN 'PPFAS Mutual Fund'
        WHEN name LIKE 'HDFC %' THEN 'HDFC Mutual Fund'
        WHEN name LIKE 'Canara Robeco %' THEN 'Canara Robeco Mutual Fund'
        WHEN name LIKE 'Tata %' THEN 'Tata Mutual Fund'
        WHEN name LIKE 'Aditya Birla Sun Life %' THEN 'Aditya Birla Sun Life Mutual Fund'
        WHEN name LIKE 'IDBI %' THEN 'IDBI Mutual Fund'
        WHEN name LIKE 'Nippon India %' THEN 'Nippon India Mutual Fund'
        ELSE NULL
    END AS amc
FROM fund_source
WHERE 1
ON CONFLICT (scheme_code) DO UPDATE SET
    name = excluded.name,
    category = excluded.category,
    amc = excluded.amc;

WITH RECURSIVE
date_bounds AS (
    SELECT MIN(date(date)) AS first_date, MAX(date(date)) AS last_date
    FROM nav_observations
),
calendar(calendar_date) AS (
    SELECT first_date FROM date_bounds WHERE first_date IS NOT NULL
    UNION ALL
    SELECT date(calendar.calendar_date, '+1 day')
    FROM calendar, date_bounds
    WHERE calendar.calendar_date < date_bounds.last_date
)
INSERT INTO dim_date (
    date_key, calendar_date, year, quarter, month, month_name,
    year_month, day_of_month, day_of_week, is_month_end
)
SELECT
    calendar_date,
    calendar_date,
    CAST(strftime('%Y', calendar_date) AS INTEGER),
    ((CAST(strftime('%m', calendar_date) AS INTEGER) - 1) / 3) + 1,
    CAST(strftime('%m', calendar_date) AS INTEGER),
    CASE strftime('%m', calendar_date)
        WHEN '01' THEN 'January'
        WHEN '02' THEN 'February'
        WHEN '03' THEN 'March'
        WHEN '04' THEN 'April'
        WHEN '05' THEN 'May'
        WHEN '06' THEN 'June'
        WHEN '07' THEN 'July'
        WHEN '08' THEN 'August'
        WHEN '09' THEN 'September'
        WHEN '10' THEN 'October'
        WHEN '11' THEN 'November'
        WHEN '12' THEN 'December'
    END,
    strftime('%Y-%m', calendar_date),
    CAST(strftime('%d', calendar_date) AS INTEGER),
    CAST(strftime('%w', calendar_date) AS INTEGER),
    CASE
        WHEN date(calendar_date, '+1 day', 'start of month') =
             date(calendar_date, 'start of month', '+1 month')
        THEN 1 ELSE 0
    END
FROM calendar
WHERE 1
ON CONFLICT (date_key) DO UPDATE SET
    calendar_date = excluded.calendar_date,
    year = excluded.year,
    quarter = excluded.quarter,
    month = excluded.month,
    month_name = excluded.month_name,
    year_month = excluded.year_month,
    day_of_month = excluded.day_of_month,
    day_of_week = excluded.day_of_week,
    is_month_end = excluded.is_month_end;

INSERT INTO fact_nav (fund_key, date_key, nav)
SELECT
    fund.fund_key,
    date(observation.date),
    observation.nav
FROM nav_observations AS observation
JOIN dim_fund AS fund ON fund.scheme_code = observation.scheme_code
JOIN dim_date AS calendar ON calendar.date_key = date(observation.date)
WHERE 1
ON CONFLICT (fund_key, date_key) DO UPDATE SET
    nav = excluded.nav;

INSERT INTO fact_metrics (
    fund_key, period, start_date_key, end_date_key, observations,
    starting_nav, ending_nav, period_return, cagr, annualized_volatility,
    max_drawdown, sharpe_ratio, sortino_ratio, calmar_ratio
)
SELECT
    fund.fund_key,
    'FULL_HISTORY',
    date(metrics.start_date),
    date(metrics.end_date),
    metrics.observations,
    metrics.starting_nav,
    metrics.ending_nav,
    metrics.period_return,
    metrics.cagr,
    metrics.annualized_volatility,
    metrics.max_drawdown,
    metrics.sharpe_ratio,
    metrics.sortino_ratio,
    metrics.calmar_ratio
FROM fund_metrics AS metrics
JOIN dim_fund AS fund ON fund.scheme_code = metrics.scheme_code
WHERE 1
ON CONFLICT (fund_key, period) DO UPDATE SET
    start_date_key = excluded.start_date_key,
    end_date_key = excluded.end_date_key,
    observations = excluded.observations,
    starting_nav = excluded.starting_nav,
    ending_nav = excluded.ending_nav,
    period_return = excluded.period_return,
    cagr = excluded.cagr,
    annualized_volatility = excluded.annualized_volatility,
    max_drawdown = excluded.max_drawdown,
    sharpe_ratio = excluded.sharpe_ratio,
    sortino_ratio = excluded.sortino_ratio,
    calmar_ratio = excluded.calmar_ratio;

CREATE INDEX IF NOT EXISTS idx_fact_nav_date ON fact_nav(date_key);
CREATE INDEX IF NOT EXISTS idx_fact_metrics_period ON fact_metrics(period, fund_key);
CREATE INDEX IF NOT EXISTS idx_dim_fund_category ON dim_fund(category);

DROP VIEW IF EXISTS fund_performance_summary;
CREATE VIEW fund_performance_summary AS
WITH latest_rolling AS (
    SELECT fund_key, date_key, rolling_1y_return, rolling_3y_return, rolling_5y_return
    FROM (
        SELECT
            fund.fund_key,
            date(rolling.date) AS date_key,
            rolling.rolling_1y_return,
            rolling.rolling_3y_return,
            rolling.rolling_5y_return,
            ROW_NUMBER() OVER (
                PARTITION BY fund.fund_key ORDER BY date(rolling.date) DESC
            ) AS row_number
        FROM rolling_returns AS rolling
        JOIN dim_fund AS fund ON fund.scheme_code = rolling.scheme_code
    )
    WHERE row_number = 1
)
SELECT
    fund.fund_key,
    fund.scheme_code,
    fund.name,
    fund.category,
    fund.amc,
    metrics.period,
    metrics.observations,
    metrics.start_date_key,
    metrics.end_date_key,
    metrics.starting_nav,
    metrics.ending_nav,
    metrics.period_return,
    metrics.cagr,
    metrics.annualized_volatility,
    metrics.max_drawdown,
    metrics.sharpe_ratio,
    metrics.sortino_ratio,
    metrics.calmar_ratio,
    latest_rolling.rolling_1y_return,
    latest_rolling.rolling_3y_return,
    latest_rolling.rolling_5y_return
FROM dim_fund AS fund
LEFT JOIN fact_metrics AS metrics ON metrics.fund_key = fund.fund_key
LEFT JOIN latest_rolling ON latest_rolling.fund_key = fund.fund_key;

DROP VIEW IF EXISTS category_comparison;
CREATE VIEW category_comparison AS
SELECT
    fund.category,
    COUNT(DISTINCT fund.fund_key) AS fund_count,
    AVG(metrics.cagr) AS average_cagr,
    AVG(metrics.annualized_volatility) AS average_annualized_volatility,
    AVG(metrics.max_drawdown) AS average_max_drawdown,
    AVG(metrics.sharpe_ratio) AS average_sharpe_ratio,
    AVG(metrics.sortino_ratio) AS average_sortino_ratio,
    AVG(metrics.calmar_ratio) AS average_calmar_ratio,
    AVG(summary.rolling_3y_return) AS average_rolling_3y_return
FROM dim_fund AS fund
LEFT JOIN fact_metrics AS metrics
    ON metrics.fund_key = fund.fund_key AND metrics.period = 'FULL_HISTORY'
LEFT JOIN fund_performance_summary AS summary ON summary.fund_key = fund.fund_key
GROUP BY fund.category;

DROP VIEW IF EXISTS top_bottom_performers;
CREATE VIEW top_bottom_performers AS
WITH ranked AS (
    SELECT
        summary.*,
        RANK() OVER (
            PARTITION BY category ORDER BY cagr DESC
        ) AS top_rank,
        RANK() OVER (
            PARTITION BY category ORDER BY cagr ASC
        ) AS bottom_rank
    FROM fund_performance_summary AS summary
    WHERE cagr IS NOT NULL
)
SELECT
    *,
    CASE
        WHEN top_rank <= 3 THEN 'Top 3'
        WHEN bottom_rank <= 3 THEN 'Bottom 3'
    END AS performer_group
FROM ranked
WHERE top_rank <= 3 OR bottom_rank <= 3;

DROP VIEW IF EXISTS data_quality_status;
CREATE VIEW data_quality_status AS
WITH observations AS (
    SELECT
        fund.fund_key,
        fund.scheme_code,
        fund.name,
        fund.category,
        nav.date_key,
        nav.nav,
        LAG(nav.date_key) OVER (
            PARTITION BY nav.fund_key ORDER BY nav.date_key
        ) AS previous_date_key,
        LAG(nav.nav) OVER (
            PARTITION BY nav.fund_key ORDER BY nav.date_key
        ) AS previous_nav
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
),
checks AS (
    SELECT
        *,
        CASE WHEN previous_date_key IS NOT NULL
                   AND julianday(date_key) - julianday(previous_date_key) > 7
             THEN 1 ELSE 0 END AS is_date_gap,
        CASE WHEN previous_nav IS NOT NULL
                   AND ABS(nav / previous_nav - 1.0) > 0.20
             THEN 1 ELSE 0 END AS is_nav_jump
    FROM observations
)
SELECT
    fund_key,
    scheme_code,
    name,
    category,
    COUNT(*) AS nav_rows,
    MIN(date_key) AS first_nav_date,
    MAX(date_key) AS latest_nav_date,
    SUM(is_date_gap) AS gaps_over_7_days,
    SUM(is_nav_jump) AS jumps_over_20_percent,
    CASE
        WHEN SUM(is_date_gap) > 0 OR SUM(is_nav_jump) > 0 THEN 'Review'
        ELSE 'No threshold flags'
    END AS quality_status
FROM checks
GROUP BY fund_key, scheme_code, name, category;

COMMIT;
