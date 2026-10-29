from datetime import datetime, timezone

import pandas as pd
import requests

BASE_URL = "https://api.mfapi.in/mf"

def search_mf_schemes(query: str):
    """Search the MFapi.in scheme catalogue. Third-party API, not AMFI itself."""
    q = (query or "").strip()
    if not q:
        return []
    response = requests.get(f"{BASE_URL}/search", params={"q": q}, timeout=30)
    response.raise_for_status()
    payload = response.json()
    return payload if isinstance(payload, list) else []

def fetch_mf_nav(scheme_code: str, start_date: str | None = None, end_date: str | None = None):
    """Fetch and normalize NAV history from MFapi.in, a third-party API."""
    code = str(scheme_code).strip()
    if not code:
        raise ValueError("Enter a scheme code.")
    url = f"{BASE_URL}/{code}"
    params = {}
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    response = requests.get(url, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()
    if "data" not in payload:
        raise ValueError("Provider response did not contain NAV data.")
    df = pd.DataFrame(payload.get("data", []))
    if df.empty:
        raise ValueError("No NAV observations returned for this scheme/date range.")
    df = df.rename(columns={"date": "Date", "nav": "NAV"})
    df["Date"] = pd.to_datetime(df["Date"], dayfirst=True, errors="coerce")
    df["NAV"] = pd.to_numeric(df["NAV"], errors="coerce")
    df = df.dropna(subset=["Date", "NAV"]).sort_values("Date").drop_duplicates("Date")
    if df.empty or (df["NAV"] <= 0).any():
        raise ValueError("NAV data is empty or contains non-positive values.")
    retrieved = datetime.now(timezone.utc).isoformat()
    df["Source"] = "MFapi.in API (third-party)"
    df["Source URL"] = response.url
    df["Retrieved At UTC"] = retrieved
    return df.reset_index(drop=True), {
        "scheme_name": payload.get("meta", {}).get("scheme_name", f"Scheme {code}"),
        "scheme_code": code,
        "source_url": response.url,
        "retrieved_at_utc": retrieved,
        "provider": "MFapi.in (third-party API)"
    }
