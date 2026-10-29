from __future__ import annotations

import json
import shutil
import sys
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from src.data_sources.mutual_funds import fetch_mf_nav
from src.data_sources.real_schemes import REAL_SCHEMES
from src.pipeline import run_pipeline

ROOT = Path(__file__).resolve().parents[2]

RAW_FILE = ROOT / "data" / "raw" / "real_nav_schemes.csv"
LEGACY_RAW_FILE = ROOT / "data" / "raw" / "real_nav_sbi_small_cap.csv"
BACKUP_DIR = ROOT / "data" / "backups"
DQ_LOG = ROOT / "reports" / "dq_results.jsonl"
NAV_JUMP_THRESHOLD = 0.20
DATE_GAP_THRESHOLD_DAYS = 7
NAV_COLUMNS = ["scheme_code", "scheme_name", "date", "nav", "category"]


def validate_nav_data(df: pd.DataFrame, label: str) -> pd.DataFrame:
    """Normalize NAV rows while retaining duplicate records for quality checks."""
    required = {"date", "nav"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"{label} is missing columns: {sorted(missing)}")
    result = df.copy()
    result["date"] = pd.to_datetime(result["date"], errors="coerce")
    result["nav"] = pd.to_numeric(result["nav"], errors="coerce")
    if result.empty:
        raise ValueError(f"{label} is empty.")
    if result["date"].isna().any():
        raise ValueError(f"{label} contains invalid dates.")
    if result["nav"].isna().any() or (result["nav"] <= 0).any():
        raise ValueError(f"{label} contains missing or non-positive NAV values.")
    return result.sort_values("date").reset_index(drop=True)


def _read_existing() -> pd.DataFrame:
    path = RAW_FILE if RAW_FILE.exists() else LEGACY_RAW_FILE
    if not path.exists():
        return pd.DataFrame(columns=NAV_COLUMNS)
    existing = pd.read_csv(path, dtype={"scheme_code": "string"})
    missing = set(NAV_COLUMNS) - set(existing.columns)
    if missing:
        raise ValueError(f"Existing real dataset is missing columns: {sorted(missing)}")
    existing["scheme_code"] = existing["scheme_code"].astype("string").str.strip()
    existing["scheme_name"] = existing["scheme_name"].astype("string").str.strip()
    existing["category"] = existing["category"].fillna("Unspecified").astype("string")
    return validate_nav_data(existing, "Existing real dataset")[NAV_COLUMNS]


def _fetch_scheme(scheme: tuple[str, str, str]) -> tuple[tuple[str, str, str], pd.DataFrame, dict]:
    code, name, category = scheme
    nav_df, metadata = fetch_mf_nav(code)
    incoming = nav_df[["Date", "NAV"]].rename(columns={"Date": "date", "NAV": "nav"})
    incoming = validate_nav_data(incoming, f"Incoming API data for {code}")
    incoming["scheme_code"] = code
    incoming["scheme_name"] = name or metadata.get("scheme_name", f"Scheme {code}")
    incoming["category"] = category
    return scheme, incoming[NAV_COLUMNS], metadata


def _fetch_scheme_with_retry(
    scheme: tuple[str, str, str],
    max_attempts: int = 3,
) -> tuple[tuple[str, str, str], pd.DataFrame, dict]:
    for attempt in range(1, max_attempts + 1):
        try:
            return _fetch_scheme(scheme)
        except Exception:
            if attempt == max_attempts:
                raise
            time.sleep(0.5 * (2 ** (attempt - 1)))
    raise RuntimeError(f"Unable to fetch scheme {scheme[0]}.")


def _quality_summary(
    scheme: tuple[str, str, str],
    before: pd.DataFrame,
    incoming: pd.DataFrame,
    merged: pd.DataFrame,
) -> dict:
    code, name, category = scheme
    prior = before[before["scheme_code"].astype(str) == code]
    new = incoming[incoming["scheme_code"].astype(str) == code]
    available_frames = [frame for frame in (prior, new) if not frame.empty]
    combined = (
        pd.concat(available_frames, ignore_index=True)
        if available_frames
        else before.iloc[0:0].copy()
    )
    duplicate_count = int(combined.duplicated(["scheme_code", "date"]).sum())
    upserted = combined.drop_duplicates(["scheme_code", "date"], keep="last")
    scheme_after = merged[merged["scheme_code"].astype(str) == code].sort_values("date")

    ordered = upserted.sort_values("date")
    nav = pd.to_numeric(ordered["nav"], errors="coerce")
    returns = nav.pct_change() if len(nav) > 1 else pd.Series(dtype=float)
    jumps = [
        {
            "date": date.strftime("%Y-%m-%d"),
            "return": float(change),
        }
        for date, change in zip(ordered["date"].iloc[1:], returns.iloc[1:])
        if abs(float(change)) > NAV_JUMP_THRESHOLD
    ]
    gaps = []
    dates = scheme_after["date"].sort_values().reset_index(drop=True)
    for previous, current in zip(dates.iloc[:-1], dates.iloc[1:]):
        gap_days = int((current - previous).days)
        if gap_days > DATE_GAP_THRESHOLD_DAYS:
            gaps.append({
                "from": previous.strftime("%Y-%m-%d"),
                "to": current.strftime("%Y-%m-%d"),
                "days": gap_days,
            })
    return {
        "scheme_code": code,
        "scheme_name": name,
        "category": category,
        "row_count_before": int(len(prior)),
        "provider_rows": int(len(new)),
        "row_count_after": int(len(scheme_after)),
        "duplicate_count": duplicate_count,
        "nav_jump_threshold": NAV_JUMP_THRESHOLD,
        "nav_jumps": jumps,
        "date_gap_threshold_days": DATE_GAP_THRESHOLD_DAYS,
        "date_gaps": gaps,
    }


def _write_quality_log(entry: dict) -> None:
    DQ_LOG.parent.mkdir(parents=True, exist_ok=True)
    with DQ_LOG.open("a", encoding="utf-8") as log:
        log.write(json.dumps(entry, ensure_ascii=False, allow_nan=False) + "\n")


def refresh_real_nav() -> None:
    """Fetch all configured real schemes and atomically upsert scheme/date rows."""
    refresh_id = str(uuid.uuid4())
    refreshed_at = datetime.now(timezone.utc).isoformat()
    existing = pd.DataFrame(columns=NAV_COLUMNS)
    try:
        existing = _read_existing()
        fetched: dict[str, tuple[pd.DataFrame, dict]] = {}
        failures = []
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(_fetch_scheme_with_retry, scheme): scheme
                for scheme in REAL_SCHEMES
            }
            for future in as_completed(futures):
                scheme = futures[future]
                try:
                    _, incoming, metadata = future.result()
                    fetched[scheme[0]] = (incoming, metadata)
                except Exception as exc:
                    failures.append({
                        "scheme_code": scheme[0],
                        "scheme_name": scheme[1],
                        "error": str(exc),
                    })
        if failures:
            raise RuntimeError(f"One or more MFapi.in scheme fetches failed: {failures}")

        incoming_all = pd.concat(
            [fetched[scheme[0]][0] for scheme in REAL_SCHEMES],
            ignore_index=True,
        )
        combined = (
            pd.concat([existing[NAV_COLUMNS], incoming_all], ignore_index=True)
            if not existing.empty
            else incoming_all.copy()
        )
        duplicate_count = int(combined.duplicated(["scheme_code", "date"]).sum())
        combined["_source_priority"] = [0] * len(existing) + [1] * len(incoming_all)
        merged = (
            combined.sort_values(["scheme_code", "date", "_source_priority"])
            .drop_duplicates(["scheme_code", "date"], keep="last")
            .drop(columns="_source_priority")
            .sort_values(["scheme_code", "date"])
            .reset_index(drop=True)
        )
        if merged.empty or merged.duplicated(["scheme_code", "date"]).any():
            raise ValueError("Merged NAV data is empty or contains duplicate scheme/date rows.")
        if merged["nav"].isna().any() or (merged["nav"] <= 0).any():
            raise ValueError("Merged NAV data contains invalid NAV values.")

        scheme_quality = [
            _quality_summary(scheme, existing, incoming_all, merged)
            for scheme in REAL_SCHEMES
        ]
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        RAW_FILE.parent.mkdir(parents=True, exist_ok=True)
        backup_path = None
        if RAW_FILE.exists():
            backup_path = BACKUP_DIR / (
                f"real_nav_schemes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
            shutil.copy2(RAW_FILE, backup_path)
        elif LEGACY_RAW_FILE.exists():
            backup_path = BACKUP_DIR / (
                f"real_nav_sbi_small_cap_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            )
            shutil.copy2(LEGACY_RAW_FILE, backup_path)

        temp_file = RAW_FILE.with_suffix(".tmp")
        pipeline_started = False
        try:
            merged.assign(date=merged["date"].dt.strftime("%Y-%m-%d")).to_csv(
                temp_file, index=False
            )
            verified = pd.read_csv(temp_file, dtype={"scheme_code": "string"})
            if verified.duplicated(["scheme_code", "date"]).any():
                raise ValueError("Temporary CSV contains duplicate scheme/date rows.")
            if len(verified) != len(merged):
                raise ValueError("Temporary CSV row-count verification failed.")
            temp_file.replace(RAW_FILE)
            pipeline_started = True
            pipeline_result = run_pipeline(ROOT, source="real")
        except Exception:
            temp_file.unlink(missing_ok=True)
            if pipeline_started:
                if backup_path:
                    shutil.copy2(backup_path, RAW_FILE)
                else:
                    RAW_FILE.unlink(missing_ok=True)
            raise

        entry = {
            "refresh_id": refresh_id,
            "refreshed_at_utc": refreshed_at,
            "status": "success",
            "source": "MFapi.in (third-party; not official AMFI)",
            "row_count_before": int(len(existing)),
            "provider_rows": int(len(incoming_all)),
            "row_count_after": int(len(merged)),
            "duplicate_count": duplicate_count,
            "nav_jump_threshold": NAV_JUMP_THRESHOLD,
            "date_gap_threshold_days": DATE_GAP_THRESHOLD_DAYS,
            "schemes": scheme_quality,
            "backup": str(backup_path) if backup_path else None,
        }
        _write_quality_log(entry)
        print(f"Refreshed {len(REAL_SCHEMES)} schemes: {len(existing)} -> {len(merged)} NAV rows.")
        print(f"Data-quality log: {DQ_LOG}")
        print(f"Pipeline result: {pipeline_result}")
    except Exception as exc:
        failure_schemes = [
            _quality_summary(
                scheme,
                existing,
                pd.DataFrame(columns=NAV_COLUMNS),
                existing,
            )
            for scheme in REAL_SCHEMES
        ]
        _write_quality_log({
            "refresh_id": refresh_id,
            "refreshed_at_utc": refreshed_at,
            "status": "failed",
            "source": "MFapi.in (third-party; not official AMFI)",
            "row_count_before": int(len(existing)),
            "row_count_after": int(len(existing)),
            "provider_rows": 0,
            "duplicate_count": int(
                existing.duplicated(["scheme_code", "date"]).sum()
            ),
            "nav_jump_threshold": NAV_JUMP_THRESHOLD,
            "date_gap_threshold_days": DATE_GAP_THRESHOLD_DAYS,
            "schemes": failure_schemes,
            "error": str(exc),
        })
        raise


if __name__ == "__main__":
    try:
        refresh_real_nav()
    except Exception as exc:
        print(f"\nNAV refresh failed: {exc}", file=sys.stderr)
        raise
