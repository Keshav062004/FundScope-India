-- Business question: Which funds are among the top and bottom three CAGR
-- performers within each category over their full available histories?
SELECT
    category,
    name,
    cagr,
    top_rank,
    bottom_rank,
    performer_group
FROM top_bottom_performers
ORDER BY category, performer_group, top_rank, name;
