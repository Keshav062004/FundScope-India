
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .analytics import (
    calculate_calendar_year_returns,
    calculate_fund_metrics,
    calculate_monthly_returns,
    calculate_rolling_returns,
    clean_nav,
)


def run_pipeline(root: Path, source: str = "demo") -> dict:
    if source not in {"demo", "real"}:
        raise ValueError("Source must be 'demo' or 'real'.")

    if source == "demo":
        filename = "nav_history.csv"
        dataset_name = "Synthetic demo dataset"
    else:
        multi_scheme_file = root / "data" / "raw" / "real_nav_schemes.csv"
        filename = (
            "real_nav_schemes.csv"
            if multi_scheme_file.exists()
            else "real_nav_sbi_small_cap.csv"
        )
        dataset_name = (
            "Real mutual fund schemes (MFapi.in)"
            if filename == "real_nav_schemes.csv"
            else "SBI Small Cap Fund - Direct Plan - Growth"
        )
    raw_path = root / "data" / "raw" / filename
    processed = root / "data" / "processed"
    reports = root / "reports"

    processed.mkdir(parents=True, exist_ok=True)
    reports.mkdir(parents=True, exist_ok=True)

    if not raw_path.exists():
        raise FileNotFoundError(f"Expected input CSV at {raw_path}")

    raw = pd.read_csv(raw_path, dtype={"scheme_code": "string"})
    cleaned, quality = clean_nav(raw)

    if cleaned.empty:
        raise ValueError("No valid NAV observations remained after cleaning.")

    metrics = calculate_fund_metrics(cleaned)
    monthly = calculate_monthly_returns(cleaned)
    rolling = calculate_rolling_returns(cleaned)
    calendar_year = calculate_calendar_year_returns(cleaned)

    cleaned.to_csv(
        processed / "cleaned_nav.csv",
        index=False,
        date_format="%Y-%m-%d",
    )
    metrics.to_csv(processed / "fund_metrics.csv", index=False)
    monthly.to_csv(processed / "monthly_returns.csv", index=False)
    rolling.to_csv(
        processed / "rolling_returns.csv",
        index=False,
        date_format="%Y-%m-%d",
    )
    calendar_year.to_csv(processed / "calendar_year_returns.csv", index=False)

    source_info = {
        "source_mode": source,
        "dataset_name": dataset_name,
        "input_file": str(Path("data") / "raw" / filename),
        "source_url": "https://api.mfapi.in/mf/{scheme_code}" if source == "real" else None,
        "source_type": (
            "Third-party MFapi.in historical NAV data"
            if source == "real"
            else "Synthetic demonstration data"
        ),
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "input_rows": quality["input_rows"],
        "clean_rows": quality["clean_rows"],
        "schemes": quality["schemes"],
        "start_date": quality["start_date"],
        "end_date": quality["end_date"],
    }

    (reports / "current_dataset.json").write_text(
        json.dumps(source_info, indent=2),
        encoding="utf-8",
    )

    with (reports / "data_quality_report.txt").open(
        "w", encoding="utf-8"
    ) as f:
        f.write("FUNDSCOPE INDIA - DATA QUALITY REPORT\n")
        f.write("=" * 42 + "\n")
        f.write(f"Selected dataset: {dataset_name}\n")
        f.write(f"Input file: {filename}\n")
        f.write(f"Source mode: {source}\n")
        if source_info["source_url"]:
            f.write(f"Source URL: {source_info['source_url']}\n")
            f.write(
                "Note: MFapi.in is a third-party source, "
                "not the official AMFI website.\n"
            )
        f.write("\n")
        for key, value in quality.items():
            f.write(f"{key}: {value}\n")
        f.write(
            "\nMetrics use each scheme's full available history. "
            "For fair rankings, align date ranges and categories.\n"
        )

    db_path = root / "fundscope.db"
    with sqlite3.connect(db_path) as con:
        cleaned.to_sql(
            "nav_observations", con, if_exists="replace", index=False
        )
        metrics.to_sql(
            "fund_metrics", con, if_exists="replace", index=False
        )
        monthly.to_sql(
            "monthly_returns", con, if_exists="replace", index=False
        )
        rolling.to_sql(
            "rolling_returns", con, if_exists="replace", index=False
        )
        calendar_year.to_sql(
            "calendar_year_returns", con, if_exists="replace", index=False
        )
        schema_path = Path(__file__).resolve().parents[1] / "sql" / "schema.sql"
        con.executescript(schema_path.read_text(encoding="utf-8"))

    insights = make_insights(metrics, quality, source_info)
    (reports / "summary_insights.md").write_text(
        insights, encoding="utf-8"
    )

    return {
        "source": source,
        "dataset": dataset_name,
        "input_rows": quality["input_rows"],
        "clean_rows": quality["clean_rows"],
        "schemes": quality["schemes"],
        "date_range": (
            f"{quality['start_date']} to {quality['end_date']}"
        ),
        "metrics_csv": str(processed / "fund_metrics.csv"),
        "sqlite_db": str(db_path),
        "quality_report": str(reports / "data_quality_report.txt"),
    }


def make_insights(
    metrics: pd.DataFrame,
    quality: dict,
    source_info: dict,
) -> str:
    lines = [
        "# FundScope India - Generated Summary",
        "",
        f"- Selected dataset: **{source_info['dataset_name']}**",
        f"- Source mode: **{source_info['source_mode']}**",
        f"- Input file: `{source_info['input_file']}`",
    ]

    if source_info["source_url"]:
        lines += [
            f"- Source URL: {source_info['source_url']}",
            "- Source note: MFapi.in is a third-party data source, "
            "not the official AMFI website.",
        ]

    lines += [
        "",
        f"- Valid observations after cleaning: **{quality['clean_rows']}**",
        f"- Schemes analyzed: **{quality['schemes']}**",
        f"- Date range: **{quality['start_date']} to "
        f"{quality['end_date']}**",
        "",
        "## Descriptive results",
        "",
    ]

    valid = metrics.dropna(subset=["cagr"])

    if not valid.empty:
        best = valid.sort_values("cagr", ascending=False).iloc[0]
        worst_dd = metrics.dropna(subset=["max_drawdown"]).sort_values(
            "max_drawdown"
        ).head(1)

        lines.append(
            f"- Highest calculated CAGR in this dataset: "
            f"**{best['scheme_name']} ({best['cagr']:.2%})**."
        )

        if not worst_dd.empty:
            row = worst_dd.iloc[0]
            lines.append(
                f"- Largest maximum drawdown in this dataset: "
                f"**{row['scheme_name']} ({row['max_drawdown']:.2%})**."
            )
    else:
        lines.append("- Not enough valid observations to calculate CAGR.")

    lines += [
        "",
        "## Interpretation cautions",
        "- These are historical descriptive statistics, not predictions.",
        "- Past performance does not guarantee future results.",
        "- Do not compare funds from unlike categories or different "
        "date windows without adjustment.",
        "- Benchmark-relative results require a suitable benchmark series "
        "and aligned dates.",
        "- Sharpe and Sortino use approximate calendar-year Indian 91-day "
        "Treasury-bill yields; see METHODOLOGY.md for rates and limitations.",
        "- The real dataset may contain multiple schemes and categories; "
        "compare aligned dates and like categories.",
        "- Verify the source and permitted use before relying on the data.",
        "",
    ]

    return "\n".join(lines) + "\n"
