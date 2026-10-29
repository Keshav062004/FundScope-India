from __future__ import annotations

import json

import pandas as pd

from src.data_sources import refresh_real_nav


def test_refresh_upserts_scheme_date_and_logs_quality(tmp_path, monkeypatch):
    schemes = (
        ("1001", "Fund One", "Large Cap"),
        ("1002", "Fund Two", "Debt"),
    )
    monkeypatch.setattr(refresh_real_nav, "ROOT", tmp_path)
    monkeypatch.setattr(
        refresh_real_nav,
        "RAW_FILE",
        tmp_path / "data" / "raw" / "real_nav_schemes.csv",
    )
    monkeypatch.setattr(
        refresh_real_nav,
        "LEGACY_RAW_FILE",
        tmp_path / "data" / "raw" / "real_nav_sbi_small_cap.csv",
    )
    monkeypatch.setattr(
        refresh_real_nav,
        "BACKUP_DIR",
        tmp_path / "data" / "backups",
    )
    monkeypatch.setattr(refresh_real_nav, "DQ_LOG", tmp_path / "reports" / "dq_results.jsonl")
    monkeypatch.setattr(refresh_real_nav, "REAL_SCHEMES", schemes)
    monkeypatch.setattr(refresh_real_nav, "run_pipeline", lambda *args, **kwargs: {"ok": True})

    def fake_fetch(code):
        return (
            pd.DataFrame({
                "Date": ["2024-01-01", "2024-01-12"],
                "NAV": [100.0, 130.0],
            }),
            {"scheme_name": f"Provider {code}"},
        )

    monkeypatch.setattr(refresh_real_nav, "fetch_mf_nav", fake_fetch)
    refresh_real_nav.refresh_real_nav()
    first = pd.read_csv(refresh_real_nav.RAW_FILE, dtype={"scheme_code": str})
    refresh_real_nav.refresh_real_nav()
    second = pd.read_csv(refresh_real_nav.RAW_FILE, dtype={"scheme_code": str})
    logs = [
        json.loads(line)
        for line in refresh_real_nav.DQ_LOG.read_text(encoding="utf-8").splitlines()
    ]

    assert len(first) == len(second) == 4
    assert not second.duplicated(["scheme_code", "date"]).any()
    assert [entry["status"] for entry in logs] == ["success", "success"]
    assert logs[0]["row_count_before"] == 0
    assert logs[0]["row_count_after"] == 4
    assert logs[1]["row_count_before"] == logs[1]["row_count_after"] == 4
    assert logs[1]["duplicate_count"] == 4
    assert all(scheme["nav_jumps"] for scheme in logs[-1]["schemes"])
    assert all(scheme["date_gaps"] for scheme in logs[-1]["schemes"])


def test_failed_refresh_is_recorded_without_replacing_dataset(tmp_path, monkeypatch):
    monkeypatch.setattr(refresh_real_nav, "ROOT", tmp_path)
    raw_file = tmp_path / "data" / "raw" / "real_nav_schemes.csv"
    raw_file.parent.mkdir(parents=True)
    original = "scheme_code,scheme_name,date,nav,category\n1001,Fund One,2024-01-01,100,Large Cap\n"
    raw_file.write_text(original, encoding="utf-8")
    monkeypatch.setattr(refresh_real_nav, "RAW_FILE", raw_file)
    monkeypatch.setattr(
        refresh_real_nav,
        "LEGACY_RAW_FILE",
        tmp_path / "data" / "raw" / "legacy.csv",
    )
    monkeypatch.setattr(refresh_real_nav, "BACKUP_DIR", tmp_path / "data" / "backups")
    dq_log = tmp_path / "reports" / "dq_results.jsonl"
    monkeypatch.setattr(refresh_real_nav, "DQ_LOG", dq_log)
    monkeypatch.setattr(
        refresh_real_nav,
        "REAL_SCHEMES",
        (("1001", "Fund One", "Large Cap"),),
    )

    def fail_fetch(code):
        raise RuntimeError("provider unavailable")

    monkeypatch.setattr(refresh_real_nav, "fetch_mf_nav", fail_fetch)

    try:
        refresh_real_nav.refresh_real_nav()
    except RuntimeError as exc:
        assert "fetches failed" in str(exc)
    else:
        raise AssertionError("Expected failed provider fetch to abort the refresh.")

    log_entry = json.loads(dq_log.read_text(encoding="utf-8").splitlines()[0])
    assert raw_file.read_text(encoding="utf-8") == original
    assert log_entry["status"] == "failed"
    assert log_entry["row_count_before"] == log_entry["row_count_after"] == 1
    assert log_entry["duplicate_count"] == 0
    assert log_entry["nav_jump_threshold"] == refresh_real_nav.NAV_JUMP_THRESHOLD
    assert log_entry["date_gap_threshold_days"] == refresh_real_nav.DATE_GAP_THRESHOLD_DAYS
    assert log_entry["schemes"][0]["nav_jumps"] == []
    assert log_entry["schemes"][0]["date_gaps"] == []


def test_real_scheme_catalog_covers_requested_categories():
    from src.data_sources.real_schemes import REAL_SCHEMES

    categories = {category for _, _, category in REAL_SCHEMES}
    assert len(REAL_SCHEMES) == 16
    assert {"Large Cap", "Mid Cap", "Flexi Cap", "Debt", "Index"}.issubset(categories)


def test_scheme_fetch_retries_transient_provider_failures(monkeypatch):
    scheme = ("1001", "Fund One", "Large Cap")
    attempts = 0

    def flaky_fetch(_scheme):
        nonlocal attempts
        attempts += 1
        if attempts == 1:
            raise TimeoutError("temporary timeout")
        return scheme, pd.DataFrame(), {}

    monkeypatch.setattr(refresh_real_nav, "_fetch_scheme", flaky_fetch)
    monkeypatch.setattr(refresh_real_nav.time, "sleep", lambda seconds: None)

    result = refresh_real_nav._fetch_scheme_with_retry(scheme)

    assert result[0] == scheme
    assert attempts == 2
