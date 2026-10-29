from datetime import datetime, timezone

import pandas as pd


def fetch_stock_history(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch daily history through yfinance. Not an NSE/BSE-certified feed."""
    try:
        import yfinance as yf
    except ImportError as exc:
        raise RuntimeError("yfinance is missing. Install packages from requirements.txt.") from exc
    if pd.Timestamp(start_date) > pd.Timestamp(end_date):
        raise ValueError("Start date must be on or before end date.")
    end_exclusive = (pd.Timestamp(end_date) + pd.Timedelta(days=1)).strftime("%Y-%m-%d")
    raw = yf.download(ticker, start=start_date, end=end_exclusive, interval="1d",
                      auto_adjust=True, progress=False, threads=False)
    if raw.empty:
        raise ValueError("No history returned. Check the symbol, dates, connection and provider availability.")
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    raw = raw.reset_index()
    date_col = "Date" if "Date" in raw.columns else raw.columns[0]
    raw = raw.rename(columns={date_col: "Date"})
    columns = [c for c in ["Date", "Close", "Volume"] if c in raw.columns]
    df = raw[columns].copy()
    df["Date"] = pd.to_datetime(df["Date"], errors="coerce").dt.tz_localize(None)
    df["Close"] = pd.to_numeric(df["Close"], errors="coerce")
    if "Volume" in df:
        df["Volume"] = pd.to_numeric(df["Volume"], errors="coerce")
    df = df.dropna(subset=["Date", "Close"]).sort_values("Date").drop_duplicates("Date")
    if df.empty or (df["Close"] <= 0).any():
        raise ValueError("Stock history is empty or contains non-positive prices.")
    retrieved = datetime.now(timezone.utc).isoformat()
    df["Ticker"] = ticker
    df["Source"] = "Yahoo Finance via yfinance (third-party)"
    df["Source URL"] = f"https://finance.yahoo.com/quote/{ticker}/history/"
    df["Price Basis"] = "auto_adjust=True; adjusted history as provided by yfinance"
    df["Retrieved At UTC"] = retrieved
    return df.reset_index(drop=True)
