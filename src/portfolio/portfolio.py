import pandas as pd

REQUIRED_COLUMNS = ["Asset Type", "Name", "Quantity", "Buy Price", "Current Price"]

def calculate_portfolio(holdings: pd.DataFrame) -> pd.DataFrame:
    missing = [c for c in REQUIRED_COLUMNS if c not in holdings.columns]
    if missing:
        raise ValueError("Missing columns: " + ", ".join(missing))
    out = holdings.copy()
    for col in ["Quantity", "Buy Price", "Current Price"]:
        out[col] = pd.to_numeric(out[col], errors="coerce")
    if out[["Quantity", "Buy Price", "Current Price"]].isna().any().any():
        raise ValueError("Quantity and prices must all be numeric.")
    if (out[["Quantity", "Buy Price", "Current Price"]] < 0).any().any():
        raise ValueError("Quantity and prices cannot be negative.")
    out["invested"] = out["Quantity"] * out["Buy Price"]
    out["current_value"] = out["Quantity"] * out["Current Price"]
    out["gain_loss"] = out["current_value"] - out["invested"]
    out["return_pct"] = out.apply(
        lambda row: row["gain_loss"] / row["invested"] if row["invested"] else 0.0, axis=1
    )
    return out
