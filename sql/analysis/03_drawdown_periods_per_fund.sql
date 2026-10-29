-- Business question: When did each fund remain below its previous NAV peak,
-- and what was its deepest drawdown during each continuous episode?
WITH drawdowns AS (
    SELECT
        fund.fund_key,
        fund.name,
        fund.category,
        nav.date_key,
        nav.nav / MAX(nav.nav) OVER (
            PARTITION BY nav.fund_key
            ORDER BY nav.date_key
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) - 1.0 AS drawdown
    FROM fact_nav AS nav
    JOIN dim_fund AS fund ON fund.fund_key = nav.fund_key
),
episode_edges AS (
    SELECT
        *,
        LAG(drawdown, 1, 0) OVER (
            PARTITION BY fund_key ORDER BY date_key
        ) AS previous_drawdown
    FROM drawdowns
),
episode_ids AS (
    SELECT
        *,
        SUM(
            CASE WHEN drawdown < 0 AND previous_drawdown >= 0 THEN 1 ELSE 0 END
        ) OVER (
            PARTITION BY fund_key ORDER BY date_key
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) AS episode_id
    FROM episode_edges
),
episodes AS (
    SELECT
        fund_key,
        name,
        category,
        episode_id,
        MIN(date_key) AS episode_start,
        MAX(date_key) AS episode_end,
        MIN(drawdown) AS worst_drawdown,
        SUM(CASE WHEN drawdown < 0 THEN 1 ELSE 0 END) AS underwater_observations
    FROM episode_ids
    WHERE drawdown < 0
    GROUP BY fund_key, name, category, episode_id
)
SELECT *
FROM episodes
ORDER BY category, name, episode_start;
