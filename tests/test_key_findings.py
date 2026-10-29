import pandas as pd
from pytest import approx

from src.key_findings import build_benchmarks, build_key_findings


def test_benchmarks_use_the_same_observed_dates_for_each_pair():
    nav = pd.DataFrame(
        [
            ("1", "Fund", "Equity", "2024-01-02", 100.0),
            ("1", "Fund", "Equity", "2024-01-03", 110.0),
            ("1", "Fund", "Equity", "2024-01-04", 120.0),
            ("2", "Index", "Index", "2024-01-02", 200.0),
            ("2", "Index", "Index", "2024-01-04", 220.0),
            ("2", "Index", "Index", "2024-01-05", 230.0),
        ],
        columns=["scheme_code", "scheme_name", "category", "date", "nav"],
    )

    [comparison] = build_benchmarks(nav)

    assert comparison["start_date"] == "2024-01-02"
    assert comparison["end_date"] == "2024-01-04"
    assert comparison["observations"] == 2
    assert comparison["fund_return"] == approx(0.2)
    assert comparison["benchmark_return"] == approx(0.1)
    assert comparison["return_difference"] == approx(0.1)


def test_synthetic_findings_are_explicitly_labelled_and_data_sourced():
    metrics = pd.DataFrame(
        [
            ("Fund A", "2020-01-01", "2024-01-01", 0.1, -0.2, 0.5),
            ("Fund B", "2021-01-01", "2024-01-01", 0.2, -0.1, 1.2),
        ],
        columns=["scheme_name", "start_date", "end_date", "cagr", "max_drawdown", "sharpe_ratio"],
    )

    report = build_key_findings(metrics, [], {"source_mode": "demo", "source_url": None})

    assert report["synthetic"] is True
    assert "Synthetic demo data" in report["disclaimer"]
    assert len(report["findings"]) == 4
    assert report["findings"][1]["value"] == "20.00%"
    assert "Synthetic demo data" in report["findings"][1]["detail"]
    assert report["findings"][1]["source"] == "data/processed/fund_metrics.csv"
