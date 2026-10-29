from __future__ import annotations

import sqlite3
from pathlib import Path

import pandas as pd

from src.pipeline import run_pipeline

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def test_pipeline_migration_and_analysis_queries_execute(tmp_path):
    raw_dir = tmp_path / "data" / "raw"
    raw_dir.mkdir(parents=True)
    rows = []
    for scheme_code, name, category, multiplier in (
        ("1001", "Alpha Equity Fund", "Equity", 1.0),
        ("1002", "Beta Debt Fund", "Debt", 0.8),
    ):
        for year, nav in (
            (2018, 100),
            (2019, 108),
            (2020, 115),
            (2021, 120),
            (2022, 132),
            (2023, 143),
            (2024, 150),
            (2025, 166),
            (2026, 178),
        ):
            rows.append(
                {
                    "scheme_code": scheme_code,
                    "scheme_name": name,
                    "category": category,
                    "date": f"{year}-12-30",
                    "nav": nav * multiplier,
                }
            )
    pd.DataFrame(rows).to_csv(raw_dir / "nav_history.csv", index=False)

    run_pipeline(tmp_path, source="demo")
    database = tmp_path / "fundscope.db"

    with sqlite3.connect(database) as connection:
        analysis_files = sorted((PROJECT_ROOT / "sql" / "analysis").glob("*.sql"))
        assert len(analysis_files) == 18

        for query_file in analysis_files:
            result = connection.execute(
                query_file.read_text(encoding="utf-8")
            ).fetchall()
            assert isinstance(result, list), query_file.name

        assert connection.execute("SELECT COUNT(*) FROM dim_fund").fetchone()[0] == 2
        assert connection.execute("SELECT COUNT(*) FROM fact_nav").fetchone()[0] == 18
        assert connection.execute("SELECT COUNT(*) FROM fact_metrics").fetchone()[0] == 2
        assert connection.execute(
            "SELECT COUNT(*) FROM fund_performance_summary"
        ).fetchone()[0] == 2

        # Re-running the reporting migration remains safe and refreshes facts/views.
        connection.executescript(
            (PROJECT_ROOT / "sql" / "schema.sql").read_text(encoding="utf-8")
        )
        assert connection.execute("SELECT COUNT(*) FROM fact_nav").fetchone()[0] == 18

