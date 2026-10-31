import math

import pandas as pd
import pytest

from src.analytics import calculate_fund_metrics, clean_nav, max_drawdown


def test_fund_metrics_match_hand_calculated_nav_series():
    raw = pd.DataFrame(
        {
            "scheme_code": ["HAND"] * 5,
            "scheme_name": ["Hand Calculated Fund"] * 5,
            "date": [
                "2020-01-01",
                "2021-01-01",
                "2022-01-01",
                "2023-01-01",
                "2024-01-01",
            ],
            "nav": [100, 110, 99, 120, 132],
        }
    )
    cleaned, _ = clean_nav(raw)
    metrics = calculate_fund_metrics(cleaned).iloc[0]

    # Returns: 110/100 - 1 = 0.10; 99/110 - 1 = -0.10;
    # 120/99 - 1 = 0.212121...; 132/120 - 1 = 0.10.
    # CAGR: elapsed = 1461 calendar days = 4 x 365.25; therefore
    # (132/100) ** (365.25/1461) - 1 = (1.32) ** 0.25 - 1.
    expected_cagr = 0.07187337372826175

    # Running peaks are [100, 110, 110, 120, 132]. The deepest decline is
    # 99/110 - 1 = -0.10.
    expected_max_drawdown = -0.10

    # Sample standard deviation (ddof=1) of the four returns is
    # 0.12992369025414957; annualized volatility is that value * sqrt(252).
    expected_volatility = 2.062474642969596

    # The return-ending years are 2021-2024 with annual risk-free proxies
    # [0.034, 0.057, 0.069, 0.068]. Convert each to a daily rate by
    # (1 + annual_rate) ** (1/252) - 1. Subtract these from the returns,
    # take the mean, divide by the sample standard deviation of returns,
    # then multiply by sqrt(252): expected Sharpe = 9.507164018748233.
    expected_sharpe = 9.507164018748233

    assert metrics["cagr"] == pytest.approx(expected_cagr)
    assert max_drawdown(cleaned["nav"]) == pytest.approx(expected_max_drawdown)
    assert metrics["annualized_volatility"] == pytest.approx(expected_volatility)
    assert metrics["sharpe_ratio"] == pytest.approx(expected_sharpe)

