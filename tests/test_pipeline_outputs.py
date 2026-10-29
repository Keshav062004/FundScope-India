from __future__ import annotations

import json
import sqlite3

import pandas as pd

from src.pipeline import run_pipeline


def test_real_pipeline_writes_metrics_rolling_and_calendar_outputs(tmp_path):
    raw_dir = tmp_path / "data" / "raw"
    raw_dir.mkdir(parents=True)
    pd.DataFrame({
        "scheme_code": ["1001"] * 4,
        "scheme_name": ["Test Fund"] * 4,
        "date": ["2022-01-03", "2022-12-30", "2023-12-29", "2024-12-31"],
        "nav": [100, 110, 121, 133.1],
        "category": ["Large Cap"] * 4,
    }).to_csv(raw_dir / "real_nav_schemes.csv", index=False)

    result = run_pipeline(tmp_path, source="real")

    metrics = pd.read_csv(tmp_path / "data" / "processed" / "fund_metrics.csv")
    rolling = pd.read_csv(tmp_path / "data" / "processed" / "rolling_returns.csv")
    annual = pd.read_csv(tmp_path / "data" / "processed" / "calendar_year_returns.csv")
    metadata = json.loads((tmp_path / "reports" / "current_dataset.json").read_text())

    assert result["schemes"] == 1
    assert {"sortino_ratio", "calmar_ratio"}.issubset(metrics.columns)
    assert {"rolling_1y_return", "rolling_3y_return", "rolling_5y_return"}.issubset(
        rolling.columns
    )
    assert annual["year"].tolist() == [2022, 2023, 2024]
    assert metadata["dataset_name"] == "Real mutual fund schemes (MFapi.in)"

    with sqlite3.connect(tmp_path / "fundscope.db") as connection:
        assert connection.execute("SELECT COUNT(*) FROM dim_fund").fetchone()[0] == 1
        assert connection.execute("SELECT COUNT(*) FROM fact_nav").fetchone()[0] == 4
        assert connection.execute("SELECT COUNT(*) FROM fact_metrics").fetchone()[0] == 1
        assert connection.execute(
            "SELECT name FROM fund_performance_summary"
        ).fetchone()[0] == "Test Fund"
