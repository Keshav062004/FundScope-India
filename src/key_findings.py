"""Reproducible, source-labelled findings and same-date index comparisons."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
METRICS_FILE = ROOT / "data" / "processed" / "fund_metrics.csv"
NAV_FILE = ROOT / "data" / "processed" / "cleaned_nav.csv"
DATASET_FILE = ROOT / "reports" / "current_dataset.json"
OUTPUT_FILE = ROOT / "reports" / "key_findings.json"


def build_benchmarks(nav: pd.DataFrame) -> list[dict[str, Any]]:
    """Compare every scheme to every index scheme on identical observed dates."""
    if nav.empty:
        return []
    required = {"scheme_code", "scheme_name", "category", "date", "nav"}
    missing = required.difference(nav.columns)
    if missing:
        raise ValueError(f"NAV data is missing columns: {', '.join(sorted(missing))}")

    clean = nav[list(required)].copy()
    clean["scheme_code"] = clean["scheme_code"].astype(str)
    clean["date"] = pd.to_datetime(clean["date"], errors="coerce")
    clean["nav"] = pd.to_numeric(clean["nav"], errors="coerce")
    clean = clean.dropna(subset=["scheme_code", "scheme_name", "category", "date", "nav"])
    clean = clean.loc[clean["nav"] > 0]
    index_schemes = clean.loc[clean["category"].str.casefold() == "index"]
    fund_schemes = clean

    scheme_meta = clean.drop_duplicates("scheme_code").set_index("scheme_code")
    comparisons: list[dict[str, Any]] = []
    for fund_code, fund_rows in fund_schemes.groupby("scheme_code", sort=True):
        for index_code, index_rows in index_schemes.groupby("scheme_code", sort=True):
            if fund_code == index_code:
                continue
            matched = fund_rows[["date", "nav"]].merge(
                index_rows[["date", "nav"]],
                on="date",
                how="inner",
                suffixes=("_fund", "_index"),
            ).sort_values("date")
            fund_info = scheme_meta.loc[fund_code]
            index_info = scheme_meta.loc[index_code]
            fund_return: float | None = None
            index_return: float | None = None
            difference: float | None = None
            start_date: str | None = None
            end_date: str | None = None
            if len(matched) >= 2:
                start = matched.iloc[0]
                end = matched.iloc[-1]
                start_date = start["date"].date().isoformat()
                end_date = end["date"].date().isoformat()
                fund_return = float(end["nav_fund"] / start["nav_fund"] - 1)
                index_return = float(end["nav_index"] / start["nav_index"] - 1)
                difference = fund_return - index_return
            comparisons.append(
                {
                    "scheme_code": str(fund_code),
                    "scheme_name": str(fund_info["scheme_name"]),
                    "category": str(fund_info["category"]),
                    "benchmark_code": str(index_code),
                    "benchmark_name": str(index_info["scheme_name"]),
                    "benchmark_category": str(index_info["category"]),
                    "start_date": start_date,
                    "end_date": end_date,
                    "observations": int(len(matched)),
                    "fund_return": fund_return,
                    "benchmark_return": index_return,
                    "return_difference": difference,
                }
            )
    return comparisons


def build_key_findings(
    metrics: pd.DataFrame,
    benchmarks: list[dict[str, Any]],
    metadata: dict[str, Any],
) -> dict[str, Any]:
    """Summarize measured dataset facts without adding recommendations."""
    source_mode = str(metadata.get("source_mode", "unknown"))
    synthetic = source_mode != "real"
    if metrics.empty:
        return {
            "source_mode": source_mode,
            "synthetic": synthetic,
            "disclaimer": (
                "Synthetic demo data; not actual market performance."
                if synthetic
                else "Historical descriptive analysis; not investment advice."
            ),
            "source_url": metadata.get("source_url"),
            "generated_at_utc": metadata.get("generated_at_utc"),
            "findings": [],
        }

    required = {"scheme_name", "start_date", "end_date", "cagr", "max_drawdown", "sharpe_ratio"}
    missing = required.difference(metrics.columns)
    if missing:
        raise ValueError(f"Metrics data is missing columns: {', '.join(sorted(missing))}")

    prefix = "Synthetic demo data — " if synthetic else ""
    findings: list[dict[str, Any]] = []
    scheme_count = int(metrics["scheme_name"].nunique())
    dates = pd.concat(
        [
            pd.to_datetime(metrics["start_date"], errors="coerce"),
            pd.to_datetime(metrics["end_date"], errors="coerce"),
        ],
        ignore_index=True,
    ).dropna()
    if scheme_count and not dates.empty:
        findings.append(
            {
                "title": "Dataset coverage",
                "value": f"{scheme_count} schemes",
                "detail": f"{prefix}processed scheme histories span {dates.min().date()} to {dates.max().date()}.",
                "source": "data/processed/fund_metrics.csv; reports/current_dataset.json",
            }
        )

    for column, title, direction in (
        ("cagr", "Highest full-history CAGR", "max"),
        ("max_drawdown", "Least severe maximum drawdown", "max"),
        ("sharpe_ratio", "Highest full-history Sharpe ratio", "max"),
    ):
        usable = metrics.copy()
        usable[column] = pd.to_numeric(usable[column], errors="coerce")
        usable = usable.dropna(subset=[column])
        if usable.empty:
            continue
        row = usable.sort_values(column, ascending=(direction == "min")).iloc[0]
        value = float(row[column])
        if column in {"cagr", "max_drawdown"}:
            display_value = f"{value:.2%}"
        else:
            display_value = f"{value:.2f}"
        findings.append(
            {
                "title": title,
                "value": display_value,
                "detail": (
                    f"{prefix}{row['scheme_name']} over its reported period "
                    f"({row['start_date']} to {row['end_date']})."
                ),
                "source": "data/processed/fund_metrics.csv",
            }
        )

    paired = [
        item
        for item in benchmarks
        if item["category"] != "Index"
        and item["benchmark_category"] == "Index"
        and item["return_difference"] is not None
    ]
    if paired:
        differences = [float(item["return_difference"]) for item in paired]
        beat_count = sum(difference > 0 for difference in differences)
        median_difference = float(pd.Series(differences).median())
        findings.append(
            {
                "title": "Matched-period fund/index comparisons",
                "value": f"{beat_count} of {len(paired)} fund/index pairs",
                "detail": (
                    f"{prefix}{beat_count} of {len(paired)} exact-date comparisons had a "
                    f"higher fund period return than the paired index fund; the median "
                    f"return difference was {median_difference:.2%}. Periods vary by pair."
                ),
                "source": "data/processed/cleaned_nav.csv",
            }
        )

    return {
        "source_mode": source_mode,
        "synthetic": synthetic,
        "disclaimer": (
            "Synthetic demo data; not actual market performance."
            if synthetic
            else "Historical descriptive analysis; not investment advice."
        ),
        "source_url": metadata.get("source_url"),
        "generated_at_utc": metadata.get("generated_at_utc"),
        "findings": findings,
    }


def generate_report() -> dict[str, Any]:
    metrics = pd.read_csv(METRICS_FILE, dtype={"scheme_code": str})
    nav = pd.read_csv(NAV_FILE, dtype={"scheme_code": str})
    metadata = json.loads(DATASET_FILE.read_text(encoding="utf-8"))
    benchmarks = build_benchmarks(nav)
    report = {
        "benchmarks": benchmarks,
        **build_key_findings(metrics, benchmarks, metadata),
    }
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return report


if __name__ == "__main__":
    result = generate_report()
    print(f"Wrote {OUTPUT_FILE.relative_to(ROOT)} with {len(result['findings'])} findings.")
