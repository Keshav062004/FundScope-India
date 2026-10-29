from __future__ import annotations

from collections.abc import Sequence

import numpy as np
import pandas as pd

REQUIRED_NAV_COLUMNS = {"scheme_code", "scheme_name", "date", "nav"}
TRADING_DAYS_PER_YEAR = 252
ANNUAL_RISK_FREE_RATES = {
    2013: 0.083,
    2014: 0.083,
    2015: 0.073,
    2016: 0.067,
    2017: 0.061,
    2018: 0.068,
    2019: 0.061,
    2020: 0.038,
    2021: 0.034,
    2022: 0.057,
    2023: 0.069,
    2024: 0.068,
    2025: 0.058,
}


def clean_nav(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    missing = REQUIRED_NAV_COLUMNS - set(raw.columns)
    if missing:
        raise ValueError(f"Missing required columns: {sorted(missing)}")
    df = raw.copy()
    input_rows = len(df)
    df["scheme_code"] = df["scheme_code"].astype("string").str.strip()
    df["scheme_name"] = df["scheme_name"].astype("string").str.strip()
    df["date"] = pd.to_datetime(df["date"], errors="coerce", dayfirst=False)
    df["nav"] = pd.to_numeric(df["nav"], errors="coerce")
    if "category" not in df.columns:
        df["category"] = "Unspecified"
    df["category"] = df["category"].fillna("Unspecified").astype("string")
    bad_date = int(df["date"].isna().sum())
    bad_nav = int((df["nav"].isna() | (df["nav"] <= 0)).sum())
    df = df.dropna(subset=["scheme_code", "scheme_name", "date", "nav"])
    df = df[df["nav"] > 0]
    before_dedup = len(df)
    df = df.drop_duplicates(["scheme_code", "date"], keep="last")
    duplicates_removed = before_dedup - len(df)
    df = df.sort_values(["scheme_code", "date"]).reset_index(drop=True)
    df["daily_return"] = df.groupby("scheme_code")["nav"].pct_change()
    report = {
        "input_rows": input_rows,
        "clean_rows": len(df),
        "invalid_dates": bad_date,
        "invalid_or_missing_nav": bad_nav,
        "duplicates_removed": duplicates_removed,
        "schemes": int(df["scheme_code"].nunique()),
        "start_date": str(df["date"].min().date()) if len(df) else "N/A",
        "end_date": str(df["date"].max().date()) if len(df) else "N/A",
    }
    return df, report


def max_drawdown(nav: pd.Series) -> float:
    clean = pd.to_numeric(nav, errors="coerce").dropna()
    if len(clean) < 2:
        return np.nan
    running_peak = clean.cummax()
    return float((clean / running_peak - 1).min())


def annual_risk_free_rate(year: int) -> float:
    """Return the dated annual T-bill proxy, carrying endpoint rates outside the table."""
    years = sorted(ANNUAL_RISK_FREE_RATES)
    if year < years[0]:
        return ANNUAL_RISK_FREE_RATES[years[0]]
    if year > years[-1]:
        return ANNUAL_RISK_FREE_RATES[years[-1]]
    return ANNUAL_RISK_FREE_RATES[year]


def downside_deviation(excess_returns: pd.Series) -> float:
    clean = pd.to_numeric(excess_returns, errors="coerce").dropna()
    if clean.empty:
        return np.nan
    downside = np.minimum(clean.to_numpy(dtype=float), 0.0)
    return float(np.sqrt(np.mean(np.square(downside))))


def _annualized_excess_ratio(
    returns: pd.Series,
    annual_rf_rates: Sequence[float],
    denominator: float,
) -> float:
    clean = pd.to_numeric(returns, errors="coerce").dropna()
    rates = np.asarray(annual_rf_rates, dtype=float)
    if len(clean) != len(rates) or clean.empty or not np.isfinite(denominator) or denominator <= 0:
        return np.nan
    daily_rf = np.expm1(np.log1p(rates) / TRADING_DAYS_PER_YEAR)
    excess = clean.to_numpy(dtype=float) - daily_rf
    return float(excess.mean() / denominator * np.sqrt(TRADING_DAYS_PER_YEAR))


def calculate_fund_metrics(cleaned: pd.DataFrame) -> pd.DataFrame:
    records = []
    for code, group in cleaned.groupby("scheme_code", sort=False):
        g = group.sort_values("date")
        nav = g["nav"].astype(float)
        dates = g["date"]
        n = len(g)
        start_nav, end_nav = float(nav.iloc[0]), float(nav.iloc[-1])
        elapsed_days = (dates.iloc[-1] - dates.iloc[0]).days
        cagr = ((end_nav / start_nav) ** (365.25 / elapsed_days) - 1) if n >= 2 and elapsed_days > 0 else np.nan
        period_return = end_nav / start_nav - 1 if n >= 2 else np.nan
        daily_returns = g["daily_return"].dropna()
        return_dates = g.loc[g["daily_return"].notna(), "date"]
        rf_rates = [annual_risk_free_rate(date.year) for date in return_dates]
        volatility = daily_returns.std(ddof=1)
        vol = (
            float(volatility * np.sqrt(TRADING_DAYS_PER_YEAR))
            if len(daily_returns) >= 2
            else np.nan
        )
        sharpe = (
            _annualized_excess_ratio(daily_returns, rf_rates, float(volatility))
            if len(daily_returns) >= 2 and pd.notna(volatility)
            else np.nan
        )
        excess_returns = pd.Series(
            daily_returns.to_numpy(dtype=float)
            - np.expm1(
                np.log1p(np.asarray(rf_rates, dtype=float))
                / TRADING_DAYS_PER_YEAR
            ),
            index=daily_returns.index,
        )
        downside = downside_deviation(excess_returns)
        sortino = (
            float(excess_returns.mean() / downside * np.sqrt(TRADING_DAYS_PER_YEAR))
            if pd.notna(downside) and downside > 0
            else np.nan
        )
        drawdown = max_drawdown(nav)
        calmar = (
            float(cagr / abs(drawdown))
            if pd.notna(cagr) and pd.notna(drawdown) and drawdown < 0
            else np.nan
        )
        records.append({
            "scheme_code": str(code),
            "scheme_name": str(g["scheme_name"].iloc[0]),
            "category": str(g["category"].iloc[0]),
            "observations": int(n),
            "start_date": dates.iloc[0].date().isoformat(),
            "end_date": dates.iloc[-1].date().isoformat(),
            "starting_nav": start_nav,
            "ending_nav": end_nav,
            "period_return": period_return,
            "cagr": cagr,
            "annualized_volatility": vol,
            "max_drawdown": drawdown,
            "sharpe_ratio": sharpe,
            "sortino_ratio": sortino,
            "calmar_ratio": calmar,
        })
    return pd.DataFrame(records)


def calculate_rolling_returns(
    cleaned: pd.DataFrame,
    windows: Sequence[int] = (1, 3, 5),
) -> pd.DataFrame:
    """Calculate annualized rolling returns using NAV at or before each anniversary."""
    if any(not isinstance(window, int) or window <= 0 for window in windows):
        raise ValueError("Rolling-return windows must be positive integer years.")
    columns = [
        "scheme_code",
        "scheme_name",
        "date",
        *[f"rolling_{window}y_return" for window in windows],
    ]
    if cleaned.empty:
        return pd.DataFrame(columns=columns)

    records: list[dict] = []
    for code, group in cleaned.groupby("scheme_code", sort=False):
        g = group.sort_values("date").reset_index(drop=True)
        dates = pd.DatetimeIndex(pd.to_datetime(g["date"]))
        nav = pd.to_numeric(g["nav"], errors="coerce").to_numpy(dtype=float)
        for end_index, end_date in enumerate(dates):
            record = {
                "scheme_code": str(code),
                "scheme_name": str(g["scheme_name"].iloc[end_index]),
                "date": end_date,
            }
            for window in windows:
                target_date = end_date - pd.DateOffset(years=window)
                start_index = dates.searchsorted(target_date, side="right") - 1
                result = np.nan
                if start_index >= 0 and start_index < end_index:
                    start_position = int(start_index)
                    elapsed_days = (end_date - dates[start_position]).days
                    if elapsed_days > 0 and nav[start_position] > 0 and nav[end_index] > 0:
                        result = (
                            (nav[end_index] / nav[start_position])
                            ** (365.25 / elapsed_days)
                            - 1
                        )
                record[f"rolling_{window}y_return"] = float(result)
            records.append(record)
    return pd.DataFrame(records, columns=columns)


def _numeric_float(value: object) -> float:
    if isinstance(value, (int, float, np.number)):
        return float(value)
    return np.nan


def calculate_calendar_year_returns(cleaned: pd.DataFrame) -> pd.DataFrame:
    """Calculate calendar-year return from the prior calendar year's last NAV."""
    columns = [
        "scheme_code",
        "scheme_name",
        "year",
        "starting_nav",
        "ending_nav",
        "calendar_year_return",
    ]
    if cleaned.empty:
        return pd.DataFrame(columns=columns)

    records: list[dict] = []
    for code, group in cleaned.groupby("scheme_code", sort=False):
        g = group.sort_values("date").copy()
        g["year"] = pd.to_datetime(g["date"]).dt.year
        year_end_nav = g.groupby("year").tail(1).set_index("year")
        for year in year_end_nav.index:
            year_number = int(year)
            has_previous_year = year_number - 1 in year_end_nav.index
            start_nav = (
                _numeric_float(year_end_nav.at[year_number - 1, "nav"])
                if has_previous_year
                else np.nan
            )
            end_nav = _numeric_float(year_end_nav.at[year_number, "nav"])
            calendar_return = end_nav / start_nav - 1 if pd.notna(start_nav) and start_nav > 0 else np.nan
            records.append({
                "scheme_code": str(code),
                "scheme_name": str(year_end_nav.at[year_number, "scheme_name"]),
                "year": year_number,
                "starting_nav": start_nav,
                "ending_nav": end_nav,
                "calendar_year_return": calendar_return,
            })
    return pd.DataFrame(records, columns=columns)


def calculate_monthly_returns(cleaned: pd.DataFrame) -> pd.DataFrame:
    if cleaned.empty:
        return pd.DataFrame(columns=["scheme_code","scheme_name","month","month_end_nav","monthly_return"])
    df = cleaned.copy()
    df["month"] = df["date"].dt.to_period("M").astype(str)
    month_end = (df.sort_values("date")
        .groupby(["scheme_code", "scheme_name", "month"], as_index=False)
        .tail(1)
        .sort_values(["scheme_code", "date"]))
    month_end["monthly_return"] = month_end.groupby("scheme_code")["nav"].pct_change()
    return month_end.rename(columns={"nav":"month_end_nav"})[
        ["scheme_code","scheme_name","month","month_end_nav","monthly_return"]
    ].reset_index(drop=True)
