import pandas as pd


def provenance_table():
    return pd.DataFrame([
        {"Dataset": "Mutual fund NAV", "Candidate source": "AMFI NAV downloads / MFapi.in",
         "Source type": "Official publication / third-party API", "Frequency": "Daily when published",
         "Traceability": "Scheme code, source URL, retrieval timestamp, date range",
         "Caveat": "MFapi.in is not AMFI; validate scheme metadata and response."},
        {"Dataset": "Indian stock history", "Candidate source": "yfinance / Yahoo Finance",
         "Source type": "Third-party data interface", "Frequency": "Daily",
         "Traceability": "Ticker, source URL, retrieval timestamp, price basis",
         "Caveat": "Not an NSE/BSE-certified feed; check current terms, coverage and adjustments."},
        {"Dataset": "Bundled fund demo", "Candidate source": "Local sample files",
         "Source type": "Synthetic demo data", "Frequency": "Static sample",
         "Traceability": "data/raw/DATA_NOTICE.txt and reports",
         "Caveat": "Never report synthetic demo results as actual market performance."},
    ])
