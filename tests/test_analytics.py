import math

import numpy as np
import pandas as pd
from src.analytics import (
    ANNUAL_RISK_FREE_RATES,
    calculate_fund_metrics,
    calculate_calendar_year_returns,
    calculate_monthly_returns,
    calculate_rolling_returns,
    clean_nav,
    max_drawdown,
)

def test_clean_nav_deduplicates_and_returns():
    raw = pd.DataFrame({
        "scheme_code":["A","A","A"],
        "scheme_name":["Fund A","Fund A","Fund A"],
        "date":["2024-01-01","2024-01-02","2024-01-02"],
        "nav":[10,11,11],
        "category":["Equity","Equity","Equity"]
    })
    clean, report = clean_nav(raw)
    assert len(clean) == 2
    assert report["duplicates_removed"] == 1
    assert clean["daily_return"].iloc[1] > 0

def test_max_drawdown():
    nav = pd.Series([100, 120, 90, 110])
    assert round(max_drawdown(nav), 4) == -0.25

def test_metrics():
    raw = pd.DataFrame({
        "scheme_code":["A","A","A"],
        "scheme_name":["Fund A"]*3,
        "date":["2023-01-01","2024-01-01","2025-01-01"],
        "nav":[100,110,121],
        "category":["Equity"]*3
    })
    clean, _ = clean_nav(raw)
    metrics = calculate_fund_metrics(clean)
    assert metrics.loc[0, "cagr"] > 0.09
    assert metrics.loc[0, "cagr"] < 0.11

def test_metrics_use_documented_252_day_volatility_and_sharpe_assumption():
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 4,
        "scheme_name": ["Fund A"] * 4,
        "date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"],
        "nav": [100, 101, 99, 102],
    })
    cleaned, _ = clean_nav(raw)
    metric = calculate_fund_metrics(cleaned).iloc[0]
    returns = cleaned["daily_return"].dropna()
    annual_rf = ANNUAL_RISK_FREE_RATES[2024]
    daily_risk_free = (1 + annual_rf) ** (1 / 252) - 1
    expected_volatility = returns.std(ddof=1) * np.sqrt(252)
    expected_sharpe = ((returns - daily_risk_free).mean() / returns.std(ddof=1)) * np.sqrt(252)

    assert math.isclose(metric["annualized_volatility"], expected_volatility)
    assert math.isclose(metric["sharpe_ratio"], expected_sharpe)


def test_sharpe_uses_risk_free_rate_for_each_return_year(monkeypatch):
    monkeypatch.setattr(
        "src.analytics.ANNUAL_RISK_FREE_RATES",
        {2023: 0.02, 2024: 0.08},
    )
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 4,
        "scheme_name": ["Fund A"] * 4,
        "date": ["2023-12-28", "2023-12-29", "2024-01-02", "2024-01-03"],
        "nav": [100, 102, 101, 104],
    })
    cleaned, _ = clean_nav(raw)
    metric = calculate_fund_metrics(cleaned).iloc[0]
    returns = cleaned["daily_return"].dropna().to_numpy()
    annual_rf = np.array([0.02, 0.08, 0.08])
    daily_rf = (1 + annual_rf) ** (1 / 252) - 1
    expected = ((returns - daily_rf).mean() / returns.std(ddof=1)) * np.sqrt(252)

    assert math.isclose(metric["sharpe_ratio"], expected)


def test_sortino_uses_hand_calculated_downside_deviation(monkeypatch):
    monkeypatch.setattr("src.analytics.ANNUAL_RISK_FREE_RATES", {2024: 0.0})
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 4,
        "scheme_name": ["Fund A"] * 4,
        "date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04"],
        "nav": [100, 110, 99, 108.9],
    })
    cleaned, _ = clean_nav(raw)
    metric = calculate_fund_metrics(cleaned).iloc[0]
    expected_downside_deviation = math.sqrt((0**2 + 0.1**2 + 0**2) / 3)
    expected_sortino = ((0.1 - 0.1 + 0.1) / 3) / expected_downside_deviation * math.sqrt(252)

    assert math.isclose(metric["sortino_ratio"], expected_sortino)


def test_calmar_uses_hand_calculated_cagr_and_max_drawdown():
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 3,
        "scheme_name": ["Fund A"] * 3,
        "date": ["2020-01-01", "2021-01-01", "2022-01-01"],
        "nav": [100, 120, 90],
    })
    cleaned, _ = clean_nav(raw)
    metric = calculate_fund_metrics(cleaned).iloc[0]
    expected_cagr = 0.9 ** (365.25 / 731) - 1
    expected_calmar = expected_cagr / 0.25

    assert math.isclose(metric["max_drawdown"], -0.25)
    assert math.isclose(metric["calmar_ratio"], expected_calmar)


def test_rolling_returns_match_hand_calculated_one_three_and_five_year_values():
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 6,
        "scheme_name": ["Fund A"] * 6,
        "date": pd.date_range("2020-01-01", periods=6, freq="YS").astype(str),
        "nav": [100, 110, 121, 133.1, 146.41, 161.051],
    })
    cleaned, _ = clean_nav(raw)

    rolling = calculate_rolling_returns(cleaned)
    final = rolling.iloc[-1]
    dates = pd.to_datetime(cleaned["date"])
    expected_1y = 1.1 ** (365.25 / (dates.iloc[-1] - dates.iloc[-2]).days) - 1
    expected_3y = (1.1**3) ** (365.25 / (dates.iloc[-1] - dates.iloc[-4]).days) - 1
    expected_5y = (1.1**5) ** (365.25 / (dates.iloc[-1] - dates.iloc[0]).days) - 1

    assert math.isclose(final["rolling_1y_return"], expected_1y, abs_tol=1e-12)
    assert math.isclose(final["rolling_3y_return"], expected_3y, abs_tol=1e-12)
    assert math.isclose(final["rolling_5y_return"], expected_5y, abs_tol=1e-12)
    assert pd.isna(rolling.loc[2, "rolling_3y_return"])


def test_calendar_year_returns_use_previous_calendar_year_end_nav():
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 4,
        "scheme_name": ["Fund A"] * 4,
        "date": ["2022-01-03", "2022-12-30", "2023-12-29", "2024-12-31"],
        "nav": [100, 110, 121, 133.1],
    })
    cleaned, _ = clean_nav(raw)

    annual = calculate_calendar_year_returns(cleaned)

    assert annual["year"].tolist() == [2022, 2023, 2024]
    assert pd.isna(annual.loc[0, "calendar_year_return"])
    assert math.isclose(annual.loc[1, "calendar_year_return"], 0.1)
    assert math.isclose(annual.loc[2, "calendar_year_return"], 0.1)


def test_single_observation_has_no_annualized_metrics_or_drawdown():
    raw = pd.DataFrame({
        "scheme_code": ["A"],
        "scheme_name": ["Fund A"],
        "date": ["2024-01-01"],
        "nav": [100],
    })
    cleaned, _ = clean_nav(raw)
    metric = calculate_fund_metrics(cleaned).iloc[0]

    assert math.isnan(metric["period_return"])
    assert math.isnan(metric["cagr"])
    assert math.isnan(metric["annualized_volatility"])
    assert math.isnan(metric["max_drawdown"])
    assert math.isnan(metric["sharpe_ratio"])
    assert math.isnan(metric["sortino_ratio"])
    assert math.isnan(metric["calmar_ratio"])

def test_monthly_returns_use_month_end_nav_observations():
    raw = pd.DataFrame({
        "scheme_code": ["A"] * 4,
        "scheme_name": ["Fund A"] * 4,
        "date": ["2024-01-01", "2024-01-31", "2024-02-15", "2024-02-29"],
        "nav": [100, 110, 108, 121],
    })
    cleaned, _ = clean_nav(raw)
    monthly = calculate_monthly_returns(cleaned)

    assert monthly["month"].tolist() == ["2024-01", "2024-02"]
    assert pd.isna(monthly.loc[0, "monthly_return"])
    assert math.isclose(monthly.loc[1, "monthly_return"], 0.1)
