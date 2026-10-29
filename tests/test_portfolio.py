import pandas as pd
from src.portfolio.portfolio import calculate_portfolio

def test_portfolio_gain_loss():
    df = pd.DataFrame([{"Asset Type":"Stock","Name":"TEST","Quantity":2,"Buy Price":10,"Current Price":12}])
    out = calculate_portfolio(df)
    assert out.loc[0, "invested"] == 20
    assert out.loc[0, "current_value"] == 24
    assert out.loc[0, "gain_loss"] == 4
