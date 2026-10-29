from __future__ import annotations

import json
import subprocess
import sys
from datetime import date
from pathlib import Path
from typing import Literal

import pandas as pd
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src.key_findings import build_benchmarks, build_key_findings

from . import config
from .ai_analyst import fmt_pct, get_local_ai_answer
from .auth_routes import router as auth_router
from .data import (
    REPORTS_DIR,
    active_raw_file,
    df_to_records,
    is_synthetic,
    load_metrics,
    load_monthly,
    load_nav,
    read_csv_safe,
)
from .deps import require_admin, require_user
from .gemini import GeminiError
from .gemini import chat as gemini_chat
from .gemini import generate as gemini_generate

ROOT = Path(__file__).resolve().parent.parent

app = FastAPI(title="FundScope India API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


# ---------------------------------------------------------------- dataset --

@app.get("/api/data", dependencies=[Depends(require_user)])
def get_data():
    metrics = load_metrics()
    nav = load_nav()
    monthly = load_monthly()
    benchmarks = build_benchmarks(nav)
    metadata_path = REPORTS_DIR / "current_dataset.json"
    dataset_metadata = (
        json.loads(metadata_path.read_text(encoding="utf-8"))
        if metadata_path.exists()
        else {}
    )
    findings = build_key_findings(metrics, benchmarks, dataset_metadata)
    return {
        "metrics": df_to_records(metrics),
        "nav": df_to_records(nav),
        "monthly": df_to_records(monthly),
        "benchmarks": benchmarks,
        "findings": findings["findings"],
        "source_mode": findings["source_mode"],
        "source_url": findings["source_url"],
        "generated_at_utc": findings["generated_at_utc"],
        "synthetic": findings["synthetic"],
    }


@app.get("/api/status", dependencies=[Depends(require_user)])
def get_status():
    raw_file = active_raw_file()
    raw = read_csv_safe(raw_file)
    metrics_file = ROOT / "data" / "processed" / "fund_metrics.csv"
    report = REPORTS_DIR / "data_quality_report.txt"
    return {
        "raw_present": raw_file.exists(),
        "raw_path": str(raw_file.relative_to(ROOT)),
        "metrics_present": metrics_file.exists(),
        "raw_rows": len(raw),
        "duplicate_rows": int(raw.duplicated().sum()) if not raw.empty else None,
        "missing_nav": int(raw["nav"].isna().sum()) if "nav" in raw else None,
        "scheme_codes": int(raw["scheme_code"].nunique()) if "scheme_code" in raw else None,
        "report_text": report.read_text(encoding="utf-8") if report.exists() else None,
        "synthetic": is_synthetic(),
    }


# --------------------------------------------------------------- pipeline --

class PipelineRequest(BaseModel):
    source: Literal["demo", "real"] = "demo"


@app.post("/api/pipeline/run", dependencies=[Depends(require_admin)])
def run_pipeline_endpoint(body: PipelineRequest):
    try:
        process = subprocess.run(
            [sys.executable, str(ROOT / "run_project.py"), "--source", body.source],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=120,
        )
        return {
            "ok": process.returncode == 0,
            "stdout": process.stdout,
            "stderr": process.stderr,
        }
    except Exception as exc:
        raise HTTPException(500, f"Could not run the pipeline: {exc}")


@app.post("/api/pipeline/refresh-nav", dependencies=[Depends(require_admin)])
def refresh_nav_endpoint():
    try:
        process = subprocess.run(
            [sys.executable, str(ROOT / "src" / "data_sources" / "refresh_real_nav.py")],
            cwd=str(ROOT),
            capture_output=True,
            text=True,
            timeout=300,
        )
        return {
            "ok": process.returncode == 0,
            "stdout": process.stdout,
            "stderr": process.stderr,
        }
    except Exception as exc:
        raise HTTPException(500, f"Refresh error: {exc}")


@app.get("/api/downloads/{filename}", dependencies=[Depends(require_user)])
def download_file(filename: str):
    from fastapi.responses import FileResponse

    candidates = {
        "fund_metrics.csv": ROOT / "data" / "processed" / "fund_metrics.csv",
        "cleaned_nav.csv": ROOT / "data" / "processed" / "cleaned_nav.csv",
        "monthly_returns.csv": ROOT / "data" / "processed" / "monthly_returns.csv",
        "rolling_returns.csv": ROOT / "data" / "processed" / "rolling_returns.csv",
        "calendar_year_returns.csv": ROOT / "data" / "processed" / "calendar_year_returns.csv",
        "dq_results.jsonl": REPORTS_DIR / "dq_results.jsonl",
        "summary_insights.md": REPORTS_DIR / "summary_insights.md",
        "data_quality_report.txt": REPORTS_DIR / "data_quality_report.txt",
    }
    path = candidates.get(filename)
    if not path or not path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(path, filename=filename)


# ------------------------------------------------------------------ stocks --

SYNTHETIC_TICKERS = [
    "RELIANCE.NS", "TCS.NS", "INFY.NS", "HDFCBANK.NS", "ICICIBANK.NS",
    "SBIN.NS", "ITC.NS", "LT.NS", "BHARTIARTL.NS", "TATAMOTORS.NS",
]


@app.get("/api/stocks/tickers", dependencies=[Depends(require_user)])
def stock_tickers():
    return SYNTHETIC_TICKERS


@app.get("/api/stocks/history", dependencies=[Depends(require_user)])
def stock_history(
    ticker: str = Query(min_length=1),
    start: date = Query(),
    end: date = Query(),
    mode: Literal["synthetic", "provider"] = "synthetic",
):
    import numpy as np

    if end < start:
        raise HTTPException(422, "End date must be on or after start date.")

    if mode == "provider":
        from src.data_sources.stocks import fetch_stock_history

        try:
            df = fetch_stock_history(ticker, start.isoformat(), end.isoformat())
        except Exception as exc:
            raise HTTPException(400, str(exc))
        return df_to_records(df)

    dates = pd.bdate_range(start=pd.Timestamp(start), end=pd.Timestamp(end))
    if len(dates) < 2:
        raise HTTPException(400, "Choose a range containing at least two business days.")

    rng = np.random.default_rng(sum(map(ord, ticker)))
    start_price = {"RELIANCE.NS": 1250, "TCS.NS": 3200, "INFY.NS": 1400, "HDFCBANK.NS": 1500}.get(ticker, 1000)
    prices = start_price * (1 + pd.Series(rng.normal(0.0003, 0.014, len(dates))).cumsum()).clip(lower=0.65)

    df = pd.DataFrame({
        "Date": dates,
        "Close": prices.values,
        "Volume": rng.integers(100000, 2000000, len(dates)),
        "Ticker": ticker,
        "Source": "Synthetic demo data",
    })
    return df_to_records(df)


# ------------------------------------------------------------- mutual funds --

@app.get("/api/mf/search", dependencies=[Depends(require_user)])
def mf_search(q: str = Query(default="", max_length=100)):
    from src.data_sources.mutual_funds import search_mf_schemes

    try:
        return search_mf_schemes(q)
    except Exception as exc:
        raise HTTPException(400, str(exc))


@app.get("/api/mf/nav", dependencies=[Depends(require_user)])
def mf_nav(
    code: str = Query(min_length=1, pattern=r"^\d+$"),
    start: date | None = None,
    end: date | None = None,
):
    from src.data_sources.mutual_funds import fetch_mf_nav

    if start is not None and end is not None and end < start:
        raise HTTPException(422, "End date must be on or after start date.")

    try:
        df, meta = fetch_mf_nav(
            code,
            start.isoformat() if start else None,
            end.isoformat() if end else None,
        )
    except Exception as exc:
        raise HTTPException(400, str(exc))
    return {"data": df_to_records(df), "meta": meta}


# ---------------------------------------------------------------- portfolio --

class Holding(BaseModel):
    asset_type: str = Field(min_length=1)
    name: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    buy_price: float = Field(gt=0)
    current_price: float = Field(gt=0)


class PortfolioRequest(BaseModel):
    holdings: list[Holding]


@app.post("/api/portfolio/calculate", dependencies=[Depends(require_user)])
def portfolio_calculate(body: PortfolioRequest):
    from src.portfolio.portfolio import calculate_portfolio

    if not body.holdings:
        raise HTTPException(400, "Add at least one holding.")

    df = pd.DataFrame([
        {
            "Asset Type": h.asset_type,
            "Name": h.name,
            "Quantity": h.quantity,
            "Buy Price": h.buy_price,
            "Current Price": h.current_price,
        }
        for h in body.holdings
    ])
    try:
        result = calculate_portfolio(df)
    except ValueError as exc:
        raise HTTPException(400, str(exc))
    return df_to_records(result)


# ------------------------------------------------------------------ lineage --

@app.get("/api/lineage", dependencies=[Depends(require_user)])
def lineage():
    from src.utils.provenance import provenance_table

    return df_to_records(provenance_table())


# ---------------------------------------------------------------------- ai --

class AskRequest(BaseModel):
    question: str = Field(min_length=1)
    ollama_model: str = "qwen2.5:1.5b"


@app.post("/api/ai/ask", dependencies=[Depends(require_user)])
def ai_ask(body: AskRequest):
    metrics = load_metrics()
    monthly = load_monthly()
    context = metrics.to_string(index=False) if not metrics.empty else "No metrics available."
    if not monthly.empty:
        context += "\nMONTHLY RETURNS SAMPLE:\n" + monthly.head(30).to_string(index=False)
    answer, mode = get_local_ai_answer(body.question.strip(), context[:14000], body.ollama_model)
    return {"answer": answer, "mode": mode}


GEMINI_SYSTEM_PROMPT = (
    "You are FundScope's AI analyst for an Indian mutual fund analytics dashboard. "
    "Use only the dataset context given to you. Never give investment advice, buy/sell "
    "recommendations, price targets, or predictions about future performance. If something "
    "isn't in the context, say so plainly instead of guessing. Keep answers concise, use plain "
    "language, and mention clearly when the active dataset is synthetic/demo data."
)


def _dataset_context() -> tuple[str, bool]:
    metrics = load_metrics()
    monthly = load_monthly()
    context = metrics.to_string(index=False) if not metrics.empty else "No metrics available."
    if not monthly.empty:
        context += "\nMONTHLY RETURNS SAMPLE:\n" + monthly.head(30).to_string(index=False)
    return context[:12000], is_synthetic()


def _fallback_insights(metrics: pd.DataFrame) -> str:
    lines = []
    best = metrics.dropna(subset=["cagr"]).sort_values("cagr", ascending=False).head(1)
    if not best.empty:
        row = best.iloc[0]
        lines.append(f"**Highest CAGR:** {row['scheme_name']} at {fmt_pct(row['cagr'])}.")
    worst_dd = metrics.dropna(subset=["max_drawdown"]).sort_values("max_drawdown").head(1)
    if not worst_dd.empty:
        row = worst_dd.iloc[0]
        lines.append(f"**Largest drawdown:** {row['scheme_name']} at {fmt_pct(row['max_drawdown'])}.")
    most_vol = metrics.dropna(subset=["annualized_volatility"]).sort_values("annualized_volatility", ascending=False).head(1)
    if not most_vol.empty:
        row = most_vol.iloc[0]
        lines.append(f"**Highest volatility:** {row['scheme_name']} at {fmt_pct(row['annualized_volatility'])}.")
    if not lines:
        return "Not enough data to generate insights yet."
    return " ".join(lines) + " These are historical descriptive statistics, not predictions."


class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    content: str = Field(min_length=1)


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@app.post("/api/ai/chat", dependencies=[Depends(require_user)])
def ai_chat(body: ChatRequest):
    if not body.messages:
        raise HTTPException(400, "Send at least one message.")

    context, synthetic = _dataset_context()
    note = (
        "The active dataset is SYNTHETIC/DEMO data, not real market data — mention this if relevant."
        if synthetic
        else "The active dataset is real historical NAV data (not synthetic). Do not call it synthetic or demo data."
    )
    system = f"{GEMINI_SYSTEM_PROMPT}\n\n{note}\n\nDATA CONTEXT:\n{context}"
    gem_messages = [{"role": "user" if m.role == "user" else "model", "content": m.content} for m in body.messages]

    try:
        reply = gemini_chat(gem_messages, system=system)
        return {"reply": reply, "mode": "Gemini"}
    except GeminiError as exc:
        last_user = next((m.content for m in reversed(body.messages) if m.role == "user"), "")
        answer, mode = get_local_ai_answer(last_user, context)
        return {"reply": f"{answer}\n\n_(Gemini unavailable: {exc})_", "mode": mode}


@app.get("/api/ai/insights", dependencies=[Depends(require_user)])
def ai_insights():
    metrics = load_metrics()
    if metrics.empty:
        return {"insights": "Run the data pipeline first to generate insights.", "mode": "none"}

    context, synthetic = _dataset_context()
    note = (
        "The dataset below is SYNTHETIC/DEMO data, not real market data — state this fact once."
        if synthetic
        else "The dataset below is real historical NAV data (not synthetic). Do not call it synthetic or demo data."
    )
    prompt = (
        "Write a concise 120-180 word descriptive summary of this mutual fund dataset for an "
        "analytics dashboard. Cover which scheme(s) stand out on CAGR, drawdown and volatility, "
        f"one notable risk observation, and one caution about interpreting the numbers. {note} "
        f"No investment advice.\n\nDATA:\n{context}"
    )
    try:
        text = gemini_generate(prompt, system=GEMINI_SYSTEM_PROMPT)
        return {"insights": text, "mode": "Gemini"}
    except GeminiError as exc:
        return {"insights": _fallback_insights(metrics), "mode": f"fallback: {exc}"}


@app.get("/api/health")
def health():
    return {"ok": True}
