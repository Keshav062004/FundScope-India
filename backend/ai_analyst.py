"""Rule-based + optional local Ollama answers, ported from app.py."""
from __future__ import annotations

import pandas as pd
import requests

from .data import load_metrics, load_monthly


def fmt_pct(value) -> str:
    return "—" if pd.isna(value) else f"{value:.2%}"


def get_local_ai_answer(question: str, context: str, ollama_model: str = "qwen2.5:1.5b") -> tuple[str, str]:
    try:
        response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": ollama_model,
                "prompt": (
                    "You are FundScope's data analyst assistant. "
                    "Use only the data context below. Do not give investment "
                    "advice or predictions. If the answer is unavailable, say "
                    "so. Clearly mention synthetic data when relevant. Keep "
                    "the answer concise.\n\n"
                    f"DATA CONTEXT:\n{context}\n\nQUESTION: {question}"
                ),
                "stream": False,
                "options": {"temperature": 0.2},
            },
            timeout=20,
        )
        if response.ok:
            answer = response.json().get("response", "").strip()
            if answer:
                return answer, "Ollama local model"
    except Exception:
        pass

    q = question.lower()
    metrics = load_metrics()
    monthly = load_monthly()

    if metrics.empty:
        return (
            "Metrics are missing. Open Automation Center and run the data "
            "pipeline first.",
            "Rule-based fallback",
        )

    if any(x in q for x in ["highest cagr", "best cagr", "highest growth", "highest return"]):
        rows = metrics.dropna(subset=["cagr"]).sort_values("cagr", ascending=False).head(1)
        if not rows.empty:
            row = rows.iloc[0]
            return (
                f"{row['scheme_name']} has the highest calculated CAGR in this "
                f"dataset at {fmt_pct(row['cagr'])}. Its maximum drawdown is "
                f"{fmt_pct(row.get('max_drawdown', float('nan')))}. Historical "
                "CAGR is not a forecast or recommendation.",
                "Dataset-grounded fallback",
            )

    if any(x in q for x in ["lowest drawdown", "smallest drawdown", "least drawdown"]):
        rows = metrics.dropna(subset=["max_drawdown"]).sort_values("max_drawdown", ascending=False).head(1)
        if not rows.empty:
            row = rows.iloc[0]
            return (
                f"{row['scheme_name']} has the least severe maximum drawdown "
                f"in this dataset at {fmt_pct(row['max_drawdown'])}. Historical "
                "drawdown does not guarantee lower future risk.",
                "Dataset-grounded fallback",
            )

    if any(x in q for x in ["compare", "all funds", "summary", "summarize"]):
        lines = [
            f"- {row.scheme_name}: CAGR {fmt_pct(row.cagr)}, drawdown "
            f"{fmt_pct(row.max_drawdown)}, volatility {fmt_pct(row.annualized_volatility)}"
            for row in metrics.itertuples()
        ]
        return (
            "Descriptive comparison of the current dataset:\n\n" + "\n".join(lines) +
            "\n\nThese figures are historical analytics, not investment advice.",
            "Dataset-grounded fallback",
        )

    if "sharpe" in q:
        rows = metrics.dropna(subset=["sharpe_ratio"])
        if rows.empty:
            return ("Sharpe ratio is not available in the current metrics.", "Dataset-grounded fallback")
        row = rows.sort_values("sharpe_ratio", ascending=False).iloc[0]
        return (
            f"The highest calculated Sharpe ratio is for {row['scheme_name']} "
            f"({row['sharpe_ratio']:.2f}). Do not interpret this measure in isolation.",
            "Dataset-grounded fallback",
        )

    if any(x in q for x in ["monthly", "month return"]):
        if monthly.empty:
            return ("Monthly returns are not available yet. Run the data pipeline.", "Dataset-grounded fallback")
        count = monthly["monthly_return"].notna().sum()
        return (
            f"The monthly-returns table contains {count} observations across "
            f"{monthly['scheme_name'].nunique()} schemes.",
            "Dataset-grounded fallback",
        )

    return (
        "I can answer questions about highest CAGR, lowest drawdown, fund "
        "comparisons, Sharpe ratio, and monthly returns. For local AI "
        "responses, install Ollama and pull qwen2.5:1.5b.",
        "Rule-based fallback",
    )
