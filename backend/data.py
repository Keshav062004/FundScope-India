"""Loads the pipeline's CSV outputs into JSON-friendly records.

Mirrors app.py's read_csv_safe / load_data so the React frontend gets the
the same data shape the earlier prototype used.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data" / "processed"
RAW_FILE = ROOT / "data" / "raw" / "nav_history.csv"
METRICS_FILE = DATA_DIR / "fund_metrics.csv"
NAV_FILE = DATA_DIR / "cleaned_nav.csv"
MONTHLY_FILE = DATA_DIR / "monthly_returns.csv"
REPORTS_DIR = ROOT / "reports"


def read_csv_safe(path: Path, required: list[str] | None = None) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame(columns=required or [])
    try:
        df = pd.read_csv(path)
        for col in required or []:
            if col not in df.columns:
                df[col] = pd.NA
        return df
    except Exception:
        return pd.DataFrame(columns=required or [])


def load_metrics() -> pd.DataFrame:
    metrics = read_csv_safe(
        METRICS_FILE,
        [
            "scheme_code", "scheme_name", "category", "start_date", "end_date",
            "starting_nav", "ending_nav", "period_return", "cagr",
            "annualized_volatility", "max_drawdown", "sharpe_ratio",
            "sortino_ratio", "calmar_ratio",
        ],
    )
    numeric_columns = [
        "period_return", "cagr", "annualized_volatility", "max_drawdown",
        "sharpe_ratio", "starting_nav", "ending_nav",
        "sortino_ratio", "calmar_ratio",
    ]
    for col in numeric_columns:
        if col in metrics.columns:
            metrics[col] = pd.to_numeric(metrics[col], errors="coerce")
    return metrics


def load_nav() -> pd.DataFrame:
    nav = read_csv_safe(
        NAV_FILE,
        ["scheme_code", "scheme_name", "date", "nav", "category", "daily_return"],
    )
    if not nav.empty and "date" in nav.columns:
        nav["date"] = pd.to_datetime(nav["date"], errors="coerce")
        nav["nav"] = pd.to_numeric(nav["nav"], errors="coerce")
    return nav


def load_monthly() -> pd.DataFrame:
    monthly = read_csv_safe(
        MONTHLY_FILE,
        ["scheme_code", "scheme_name", "month", "month_end_nav", "monthly_return"],
    )
    if not monthly.empty:
        monthly["month"] = monthly["month"].astype(str)
        monthly["month_end_nav"] = pd.to_numeric(monthly["month_end_nav"], errors="coerce")
        monthly["monthly_return"] = pd.to_numeric(monthly["monthly_return"], errors="coerce")
    return monthly


def df_to_records(df: pd.DataFrame) -> list[dict]:
    """NaN/NaT-safe conversion to JSON records; dates become ISO strings."""
    out = df.copy()
    for col in out.columns:
        if pd.api.types.is_datetime64_any_dtype(out[col]):
            out[col] = out[col].dt.strftime("%Y-%m-%d")
    records = out.to_dict(orient="records")
    for record in records:
        for column, value in record.items():
            if pd.isna(value):
                record[column] = None
    return records


def active_raw_file() -> Path:
    """The raw CSV used by the most recent pipeline run (real or demo)."""
    try:
        import json
        meta = json.loads((REPORTS_DIR / "current_dataset.json").read_text(encoding="utf-8"))
        candidate = ROOT / meta.get("input_file", "")
        if candidate.is_file():
            return candidate
    except Exception:
        pass
    return RAW_FILE


def is_synthetic() -> bool:
    try:
        metadata_path = REPORTS_DIR / "current_dataset.json"
        if not metadata_path.exists():
            return True
        import json
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        return metadata.get("source_mode") != "real"
    except Exception:
        return True
