-- Business question: Which fund series have large single-observation NAV
-- moves or date gaps that should be reviewed before comparison?
SELECT
    name,
    category,
    nav_rows,
    first_nav_date,
    latest_nav_date,
    gaps_over_7_days,
    jumps_over_20_percent,
    quality_status
FROM data_quality_status
ORDER BY
    CASE quality_status WHEN 'Review' THEN 0 ELSE 1 END,
    jumps_over_20_percent DESC,
    gaps_over_7_days DESC,
    name;
