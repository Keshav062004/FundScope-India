import json

import numpy as np
import pandas as pd

from backend.data import df_to_records


def test_dataframe_records_convert_missing_values_to_json_null():
    frame = pd.DataFrame(
        {
            "nav": [12.5, np.nan],
            "date": pd.to_datetime(["2026-01-01", None]),
        }
    )

    records = df_to_records(frame)

    assert records == [
        {"nav": 12.5, "date": "2026-01-01"},
        {"nav": None, "date": None},
    ]
    json.dumps(records, allow_nan=False)
