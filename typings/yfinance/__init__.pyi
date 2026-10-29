from typing import Any

import pandas as pd

def download(
    tickers: str | list[str],
    start: str | None = ...,
    end: str | None = ...,
    *,
    interval: str = ...,
    auto_adjust: bool = ...,
    progress: bool = ...,
    threads: bool = ...,
    **kwargs: Any,
) -> pd.DataFrame: ...
