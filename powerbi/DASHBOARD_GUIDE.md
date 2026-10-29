# FundScope India — Power BI Desktop guide

This guide builds a four-page historical analytics report from the SQLite
star schema. The schema migration runs automatically at the end of
`python run_project.py`. To apply or refresh it separately:

```powershell
python -c "import sqlite3,pathlib; c=sqlite3.connect('fundscope.db'); c.executescript(pathlib.Path('sql/schema.sql').read_text(encoding='utf-8')); c.close()"
```

The migration is repeatable. It refreshes the reporting facts from
`nav_observations` and `fund_metrics`; those pipeline tables remain the source
of truth. AMC values are inferred from the source scheme display-name prefix
because the current pipeline does not store a separate AMC field. Verify the
labels before using them for official AMC reporting; unrecognized names remain
NULL.

## 1. Connect Power BI Desktop to SQLite

### Option A — SQLite ODBC

1. Install a 64-bit SQLite ODBC driver that matches the bitness of Power BI
   Desktop. Create a System DSN (for example `FundScopeSQLite`) pointing to the
   absolute path of `fundscope.db`.
2. In Power BI Desktop, choose **Home → Get data → ODBC**.
3. Select the DSN and choose **Connect**. In Navigator, select:
   - dimensions: `dim_fund`, `dim_date`;
   - facts: `fact_nav`, `fact_metrics`;
   - report views: `fund_performance_summary`, `category_comparison`,
     `top_bottom_performers`, `data_quality_status`.
4. Choose **Transform Data**. Set `dim_date[calendar_date]` and the fact date
   keys to Date type, NAV and metrics to Decimal Number, keys/counts to Whole
   Number, and category/name/period fields to Text.
5. In Model view, create one-to-many, single-direction relationships:
   - `dim_fund[fund_key]` → `fact_nav[fund_key]`;
   - `dim_fund[fund_key]` → `fact_metrics[fund_key]`;
   - `dim_fund[fund_key]` → `fund_performance_summary[fund_key]`;
   - `dim_fund[fund_key]` → `data_quality_status[fund_key]`;
   - `dim_date[date_key]` → `fact_nav[date_key]`.
6. To filter metric start and end dates independently, make two Power Query
   references of `dim_date`, named `dim_metric_start_date` and
   `dim_metric_end_date`, and relate them to `fact_metrics[start_date_key]`
   and `fact_metrics[end_date_key]`. Keep those role-playing date dimensions
   separate from the NAV date relationship.
7. Mark `dim_date` as the model's date table using `calendar_date`. Use
   `dim_fund` fields for fund, category, and AMC slicers. Keep
   `category_comparison` and `top_bottom_performers` disconnected when used as
   pre-aggregated visuals; use the dimensions and facts for interactive
   charts to avoid duplicate filter paths.

### Option B — Export CSVs from the views

If an ODBC driver is unavailable, install the SQLite command-line utility,
open PowerShell in the project root, and export the dimensions, facts, and
views. SQLite's `.once` sends the next query result to the named CSV:

```text
sqlite3 fundscope.db
.headers on
.mode csv
.once powerbi/dim_fund.csv
SELECT * FROM dim_fund;
.once powerbi/dim_date.csv
SELECT * FROM dim_date;
.once powerbi/fact_nav.csv
SELECT * FROM fact_nav;
.once powerbi/fact_metrics.csv
SELECT * FROM fact_metrics;
.once powerbi/fund_performance_summary.csv
SELECT * FROM fund_performance_summary;
.once powerbi/category_comparison.csv
SELECT * FROM category_comparison;
.once powerbi/top_bottom_performers.csv
SELECT * FROM top_bottom_performers;
.once powerbi/data_quality_status.csv
SELECT * FROM data_quality_status;
.quit
```

Use **Home → Get data → Text/CSV** for each file. Re-export after each
pipeline refresh and use **Refresh** in Power BI. Large CSV exports are
generated locally and should not be committed unless intentionally required.

## 2. Add the KPI measures

Create these measures in Power BI (for example, in a dedicated `Measures`
table). Ratios are stored as decimal fractions; format CAGR, returns,
volatility, and drawdown as percentages. Keep ratio measures to two decimals.
The `FULL_HISTORY` filter makes the full-history metric basis explicit.

```DAX
Fund Count =
DISTINCTCOUNT ( dim_fund[fund_key] )

Average CAGR =
CALCULATE (
    AVERAGE ( fact_metrics[cagr] ),
    fact_metrics[period] = "FULL_HISTORY"
)

Average Annualized Volatility =
CALCULATE (
    AVERAGE ( fact_metrics[annualized_volatility] ),
    fact_metrics[period] = "FULL_HISTORY"
)

Worst Maximum Drawdown =
CALCULATE (
    MIN ( fact_metrics[max_drawdown] ),
    fact_metrics[period] = "FULL_HISTORY"
)

Average Sharpe Ratio =
CALCULATE (
    AVERAGE ( fact_metrics[sharpe_ratio] ),
    fact_metrics[period] = "FULL_HISTORY"
)

Average Sortino Ratio =
CALCULATE (
    AVERAGE ( fact_metrics[sortino_ratio] ),
    fact_metrics[period] = "FULL_HISTORY"
)

Average Current 3Y Return =
AVERAGE ( fund_performance_summary[rolling_3y_return] )

NAV Observation Count =
COUNTROWS ( fact_nav )

Latest NAV Date =
MAX ( dim_date[calendar_date] )

NAV Jump Flags =
SUM ( data_quality_status[jumps_over_20_percent] )

Date Gap Flags =
SUM ( data_quality_status[gaps_over_7_days] )

Funds Requiring Review =
CALCULATE (
    DISTINCTCOUNT ( data_quality_status[fund_key] ),
    data_quality_status[quality_status] = "Review"
)

Data Quality Status =
IF (
    [NAV Jump Flags] + [Date Gap Flags] = 0,
    "No threshold flags",
    "Review flagged NAV moves or date gaps"
)
```

`Average Current 3Y Return` reads the latest available value per fund from
`fund_performance_summary`; funds without three complete years are blank and
excluded from the average. `Latest NAV Date` is the latest date in the current
date filter context. To make it ignore a report date slicer, use
`CALCULATE(MAX(dim_date[calendar_date]), REMOVEFILTERS(dim_date))`.

Optional measure for a single-fund normalized NAV line (use a fund slicer):

```DAX
Normalized NAV Index =
VAR FirstSelectedDate =
    CALCULATE (
        MIN ( fact_nav[date_key] ),
        ALLSELECTED ( dim_date[date_key] )
    )
VAR BaseNAV =
    CALCULATE (
        MIN ( fact_nav[nav] ),
        REMOVEFILTERS ( dim_date ),
        dim_date[date_key] = FirstSelectedDate
    )
RETURN
    DIVIDE ( MAX ( fact_nav[nav] ), BaseNAV ) * 100
```

## 3. Build the report pages

### Page 1 — KPI overview

- Add cards for **Fund Count**, **Average CAGR**, **Average Annualized
  Volatility**, **Worst Maximum Drawdown**, **Average Sharpe Ratio**, and
  **Average Current 3Y Return**.
- Add a clustered bar chart with category on the axis and average CAGR or
  average 3Y return as the value. Add a table from `category_comparison`.
- Add a data freshness card using **Latest NAV Date** and an observation
  count card using **NAV Observation Count**.
- Label full-history measures as historical and descriptive.

### Page 2 — Fund explorer

- Add slicers for fund name, category, AMC, and end date.
- Add a detail table using `dim_fund` and
  `fund_performance_summary`: date range, observation count, CAGR,
  volatility, drawdown, Sharpe, Sortino, Calmar, and rolling returns.
- Add a NAV or **Normalized NAV Index** line chart with `dim_date[calendar_date]`
  on the X-axis. Use a single-fund selection for a readable NAV line; use the
  normalized index to compare different NAV scales.
- Add a monthly-return chart from the pipeline's `monthly_returns` table if
  you also import it.

### Page 3 — Risk and return

- Add a scatter chart using `fact_metrics`: X-axis
  `annualized_volatility`, Y-axis `cagr`, Details `dim_fund[name]`, and
  Legend `dim_fund[category]`.
- Use `Average Sharpe Ratio`, `Average Sortino Ratio`, and
  `Worst Maximum Drawdown` cards and a table of fund-level risk metrics.
- Add category/fund slicers. Avoid presenting a cross-category ranking as a
  recommendation: each fund can have a different date range.

### Page 4 — Data quality status

- Add cards for **Data Quality Status**, **Funds Requiring Review**,
  **NAV Jump Flags**, **Date Gap Flags**, and **Latest NAV Date**.
- Add a table from `data_quality_status` with fund, category, row count,
  first/latest NAV dates, gaps over seven days, jumps over 20%, and status.
- Add a date-gap and NAV-jump bar chart by fund.
- These are threshold-based review flags, not proof that a source observation
  is wrong. The pipeline refresh log remains in `reports/dq_results.jsonl`;
  this view independently recomputes gaps and large adjacent NAV changes from
  the current NAV fact.

## 4. Validate and publish

1. Reconcile selected fund totals and metrics with
   `fund_performance_summary` and the source `data/processed/fund_metrics.csv`.
2. Verify date filters affect NAV charts as intended and category/fund slicers
   filter both facts through `dim_fund`.
3. Confirm NAV-jump and date-gap counts against the `data_quality_status`
   view. A large NAV move is flagged for review, not removed.
4. Show the data end date and identify synthetic/demo data whenever the
   selected dataset is synthetic.
5. Save the finished report as `powerbi/FundScope_Dashboard.pbix`.

The current raw data comes from MFapi.in, a third-party source and not the
official AMFI site. AMC labels are inferred from scheme display names and need
verification. NAV metrics do not model expense ratio drag, exit loads, taxes,
or SIP timing. See [`../METHODOLOGY.md`](../METHODOLOGY.md) before interpreting
the charts.
