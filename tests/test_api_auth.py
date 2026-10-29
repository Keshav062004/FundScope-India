from __future__ import annotations

import sqlite3
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

import pandas as pd
import pytest
from fastapi.testclient import TestClient

from backend import config, sessions
from backend.auth_routes import _set_cookie
from backend.main import app

PROTECTED_REQUESTS = [
    ("GET", "/api/data", None),
    ("GET", "/api/status", None),
    ("GET", "/api/downloads/fund_metrics.csv", None),
    ("GET", "/api/downloads/rolling_returns.csv", None),
    ("GET", "/api/downloads/calendar_year_returns.csv", None),
    ("GET", "/api/downloads/dq_results.jsonl", None),
    ("GET", "/api/stocks/tickers", None),
    (
        "GET",
        "/api/stocks/history?ticker=RELIANCE.NS&start=2026-01-01&end=2026-01-10",
        None,
    ),
    ("GET", "/api/mf/search?q=fund", None),
    ("GET", "/api/mf/nav?code=125497", None),
    (
        "POST",
        "/api/portfolio/calculate",
        {
            "holdings": [
                {
                    "asset_type": "Stock",
                    "name": "TEST",
                    "quantity": 1,
                    "buy_price": 10,
                    "current_price": 11,
                }
            ]
        },
    ),
    ("GET", "/api/lineage", None),
    ("POST", "/api/ai/ask", {"question": "Summarize the data"}),
    ("POST", "/api/ai/chat", {"messages": [{"role": "user", "content": "Hello"}]}),
    ("GET", "/api/ai/insights", None),
    ("POST", "/api/auth/logout", None),
]
PIPELINE_REQUESTS = [
    ("POST", "/api/pipeline/run", {"source": "demo"}),
    ("POST", "/api/pipeline/refresh-nav", None),
]


@pytest.fixture
def api_client(tmp_path, monkeypatch):
    monkeypatch.setattr(sessions, "DATABASE_PATH", tmp_path / "sessions.sqlite3")
    monkeypatch.setattr(config, "ADMIN_EMAILS", frozenset({"admin@example.com"}))
    monkeypatch.setattr(config, "AUTH", {"client_id": "test-client", "client_secret": "test-secret"})
    monkeypatch.setattr(config, "GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    monkeypatch.setattr(config, "FRONTEND_ORIGIN", "http://localhost:5173")
    from backend import main as api_main

    data_dir = tmp_path / "data"
    processed_dir = data_dir / "processed"
    reports_dir = tmp_path / "reports"
    processed_dir.mkdir(parents=True)
    reports_dir.mkdir()
    (processed_dir / "fund_metrics.csv").write_text("scheme_name\n", encoding="utf-8")
    (processed_dir / "rolling_returns.csv").write_text("scheme_code\n", encoding="utf-8")
    (processed_dir / "calendar_year_returns.csv").write_text("scheme_code\n", encoding="utf-8")
    (reports_dir / "summary_insights.md").write_text("test\n", encoding="utf-8")
    (reports_dir / "data_quality_report.txt").write_text("test\n", encoding="utf-8")
    (reports_dir / "dq_results.jsonl").write_text("{}\n", encoding="utf-8")
    raw_file = data_dir / "raw.csv"
    raw_file.write_text("scheme_code,nav\n", encoding="utf-8")
    monkeypatch.setattr(api_main, "ROOT", tmp_path)
    monkeypatch.setattr(api_main, "REPORTS_DIR", reports_dir)
    monkeypatch.setattr(api_main, "active_raw_file", lambda: raw_file)
    monkeypatch.setattr(api_main, "read_csv_safe", lambda path: pd.DataFrame())
    monkeypatch.setattr("backend.main.load_metrics", pd.DataFrame)
    monkeypatch.setattr("backend.main.load_nav", pd.DataFrame)
    monkeypatch.setattr("backend.main.load_monthly", pd.DataFrame)
    monkeypatch.setattr("backend.main.is_synthetic", lambda: False)
    monkeypatch.setattr(
        "backend.main.subprocess.run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="", stderr=""),
    )
    monkeypatch.setattr(
        "src.data_sources.mutual_funds.search_mf_schemes",
        lambda query: [],
    )
    monkeypatch.setattr(
        "src.data_sources.mutual_funds.fetch_mf_nav",
        lambda code, start, end: (pd.DataFrame(), {}),
    )
    monkeypatch.setattr(
        "src.utils.provenance.provenance_table",
        lambda: pd.DataFrame(),
    )
    monkeypatch.setattr("backend.main.gemini_chat", lambda *args, **kwargs: "Grounded response")
    monkeypatch.setattr("backend.main.gemini_generate", lambda *args, **kwargs: "Grounded insights")
    monkeypatch.setattr(
        "backend.main.get_local_ai_answer",
        lambda *args, **kwargs: ("Local response", "rule-based"),
    )
    with TestClient(app, follow_redirects=False) as client:
        yield client


@pytest.fixture
def expired_session():
    token = sessions.create_session(
        {"email": "user@example.com", "local_id": "expired-user"}
    )
    expired_at = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(
        timespec="microseconds"
    )
    with sqlite3.connect(sessions.DATABASE_PATH) as connection:
        connection.execute(
            "UPDATE sessions SET expires_at = ? WHERE session_id = ?",
            (expired_at, token),
        )
    return token


def _request(client: TestClient, method: str, url: str, body: dict | None = None):
    return client.request(method, url, json=body)


@pytest.mark.parametrize("method,url,body", PROTECTED_REQUESTS + PIPELINE_REQUESTS)
def test_protected_routes_require_a_session(api_client, method, url, body):
    response = _request(api_client, method, url, body)

    assert response.status_code == 401


@pytest.mark.parametrize("method,url,body", PROTECTED_REQUESTS + PIPELINE_REQUESTS)
@pytest.mark.parametrize("cookie", ["invalid-session-token", "expired"])
def test_protected_routes_reject_invalid_or_expired_sessions(
    api_client, expired_session, method, url, body, cookie
):
    token = expired_session if cookie == "expired" else cookie
    api_client.cookies.set(sessions.SESSION_COOKIE, token)

    response = _request(api_client, method, url, body)

    assert response.status_code == 401


@pytest.mark.parametrize("method,url,body", PROTECTED_REQUESTS)
def test_protected_routes_accept_a_valid_session(api_client, method, url, body):
    token = sessions.create_session(
        {"email": "user@example.com", "local_id": "valid-user"}
    )
    api_client.cookies.set(sessions.SESSION_COOKIE, token)

    response = _request(api_client, method, url, body)

    assert response.status_code == 200


@pytest.mark.parametrize("method,url,body", PIPELINE_REQUESTS)
def test_pipeline_routes_reject_non_admin_users(api_client, method, url, body):
    token = sessions.create_session(
        {"email": "user@example.com", "local_id": "regular-user"}
    )
    api_client.cookies.set(sessions.SESSION_COOKIE, token)

    response = _request(api_client, method, url, body)

    assert response.status_code == 403


@pytest.mark.parametrize("method,url,body", PIPELINE_REQUESTS)
def test_pipeline_routes_accept_admin_users(api_client, method, url, body):
    token = sessions.create_session(
        {"email": "ADMIN@example.com", "local_id": "administrator"}
    )
    api_client.cookies.set(sessions.SESSION_COOKIE, token)

    response = _request(api_client, method, url, body)

    assert response.status_code == 200


def test_session_route_allows_logged_out_users(api_client):
    response = api_client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.json() == {"user": None}


def test_session_route_returns_authenticated_user(api_client):
    token = sessions.create_session(
        {"email": "signed-in@example.com", "local_id": "signed-in"}
    )
    api_client.cookies.set(sessions.SESSION_COOKIE, token)

    response = api_client.get("/api/auth/session")

    assert response.status_code == 200
    assert response.json() == {
        "user": {"email": "signed-in@example.com", "local_id": "signed-in"}
    }


def test_health_route_is_public(api_client):
    response = api_client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_email_auth_routes_remain_public(api_client, monkeypatch):
    def firebase_request(endpoint, payload):
        if endpoint == "signInWithPassword":
            return {"email": payload["email"], "localId": "login-user", "idToken": "token"}
        if endpoint == "lookup":
            return {"users": [{"emailVerified": True}]}
        if endpoint == "signUp":
            return {"idToken": "token"}
        return {"ok": True}

    monkeypatch.setattr("backend.auth_routes.firebase_request", firebase_request)

    login = api_client.post(
        "/api/auth/firebase/login",
        json={"email": "user@example.com", "password": "valid-password"},
    )
    api_client.cookies.clear()
    signup = api_client.post(
        "/api/auth/firebase/signup",
        json={"email": "new@example.com", "password": "valid-password"},
    )
    api_client.cookies.clear()
    reset = api_client.post(
        "/api/auth/firebase/reset",
        json={"email": "user@example.com"},
    )

    assert login.status_code == 200
    assert signup.status_code == 200
    assert reset.status_code == 200


def test_session_is_available_after_store_reinitialization(api_client):
    token = sessions.create_session(
        {"email": "user@example.com", "local_id": "persistent-user"}
    )

    sessions.initialize_session_store()

    assert sessions.get_session(token) == {
        "email": "user@example.com",
        "local_id": "persistent-user",
    }


@pytest.mark.parametrize(
    "secure,expected",
    [(False, False), (True, True)],
)
def test_session_cookie_security_attributes(api_client, monkeypatch, secure, expected):
    monkeypatch.setattr(config, "COOKIE_SECURE", secure)
    from fastapi import Response

    response = Response()
    _set_cookie(response, "test-session")
    cookie = response.headers["set-cookie"].lower()

    assert "httponly" in cookie
    assert "samesite=lax" in cookie
    assert "max-age=604800" in cookie
    assert ("secure" in cookie) is expected


def test_cors_origin_list_is_parsed_and_normalized():
    assert config.parse_cors_origins(" https://app.example, https://admin.example/ ") == [
        "https://app.example",
        "https://admin.example",
    ]


def test_google_callback_rejects_mismatched_oauth_state(api_client, monkeypatch):
    login_response = api_client.get("/api/auth/google/login")
    state_cookie = api_client.cookies.get(sessions.OAUTH_STATE_COOKIE)
    query = parse_qs(urlparse(login_response.headers["location"]).query)
    expected_state = query["state"][0]
    monkeypatch.setattr(
        "backend.auth_routes.requests.post",
        lambda *args, **kwargs: pytest.fail("OAuth token exchange must not run"),
    )

    api_client.cookies.set(sessions.OAUTH_STATE_COOKIE, state_cookie)
    response = api_client.get(
        "/api/auth/google/callback",
        params={"code": "authorization-code", "state": f"{expected_state}-mismatch"},
    )

    assert response.status_code == 400
    assert "state" in response.json()["detail"].lower()


def test_google_callback_accepts_matching_state_once(api_client, monkeypatch):
    login_response = api_client.get("/api/auth/google/login")
    state_cookie = api_client.cookies.get(sessions.OAUTH_STATE_COOKIE)
    state = parse_qs(urlparse(login_response.headers["location"]).query)["state"][0]
    api_client.cookies.set(sessions.OAUTH_STATE_COOKIE, state_cookie)

    class TokenResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"id_token": "google-id-token"}

    monkeypatch.setattr(
        "backend.auth_routes.requests.post",
        lambda *args, **kwargs: TokenResponse(),
    )
    monkeypatch.setattr(
        "backend.auth_routes.firebase_request",
        lambda *args, **kwargs: {"email": "user@example.com", "localId": "google-user"},
    )

    response = api_client.get(
        "/api/auth/google/callback",
        params={"code": "authorization-code", "state": state},
    )

    assert response.status_code == 307
    assert sessions.get_session(response.cookies.get(sessions.SESSION_COOKIE)) == {
        "email": "user@example.com",
        "local_id": "google-user",
    }
    replay = api_client.get(
        "/api/auth/google/callback",
        params={"code": "authorization-code", "state": state},
    )
    assert replay.status_code == 400


PORTFOLIO_BODY = {
    "holdings": [
        {
            "asset_type": "Stock",
            "name": "TEST",
            "quantity": 1,
            "buy_price": 10,
            "current_price": 11,
        }
    ]
}

API_SUCCESS_CASES = [
    ("GET", "/api/data", None, "user"),
    ("GET", "/api/status", None, "user"),
    ("POST", "/api/pipeline/run", {"source": "demo"}, "admin"),
    ("POST", "/api/pipeline/refresh-nav", None, "admin"),
    ("GET", "/api/downloads/fund_metrics.csv", None, "user"),
    ("GET", "/api/stocks/tickers", None, "user"),
    (
        "GET",
        "/api/stocks/history?ticker=RELIANCE.NS&start=2026-01-01&end=2026-01-10",
        None,
        "user",
    ),
    ("GET", "/api/mf/search?q=fund", None, "user"),
    ("GET", "/api/mf/nav?code=125497", None, "user"),
    ("POST", "/api/portfolio/calculate", PORTFOLIO_BODY, "user"),
    ("GET", "/api/lineage", None, "user"),
    ("POST", "/api/ai/ask", {"question": "Summarize the data"}, "user"),
    ("POST", "/api/ai/chat", {"messages": [{"role": "user", "content": "Hello"}]}, "user"),
    ("GET", "/api/ai/insights", None, "user"),
    ("GET", "/api/health", None, "public"),
]

API_INVALID_INPUT_CASES = [
    ("POST", "/api/pipeline/run", {"source": "unknown"}, "admin", 422),
    ("POST", "/api/pipeline/run", None, "admin", 422),
    ("GET", "/api/downloads/not-a-report.csv", None, "user", 404),
    ("GET", "/api/stocks/history?start=2026-01-01&end=2026-01-10", None, "user", 422),
    (
        "GET",
        "/api/stocks/history?ticker=TEST&start=not-a-date&end=2026-01-10",
        None,
        "user",
        422,
    ),
    (
        "GET",
        "/api/stocks/history?ticker=TEST&start=2026-01-10&end=2026-01-01",
        None,
        "user",
        422,
    ),
    ("GET", f"/api/mf/search?q={'x' * 101}", None, "user", 422),
    ("GET", "/api/mf/nav?code=not-a-scheme-code", None, "user", 422),
    ("GET", "/api/mf/nav?code=125497&start=not-a-date", None, "user", 422),
    (
        "GET",
        "/api/mf/nav?code=125497&start=2026-02-01&end=2026-01-01",
        None,
        "user",
        422,
    ),
    (
        "POST",
        "/api/portfolio/calculate",
        {"holdings": [{**PORTFOLIO_BODY["holdings"][0], "quantity": 0}]},
        "user",
        422,
    ),
    ("POST", "/api/ai/ask", {"question": ""}, "user", 422),
    ("POST", "/api/ai/chat", {"messages": []}, "user", 400),
    (
        "POST",
        "/api/ai/chat",
        {"messages": [{"role": "assistant", "content": "Hello"}]},
        "user",
        422,
    ),
    ("POST", "/api/auth/firebase/login", {}, "public", 422),
    ("POST", "/api/auth/firebase/signup", {}, "public", 422),
    (
        "POST",
        "/api/auth/firebase/signup",
        {"email": "user@example.com", "password": "short"},
        "public",
        422,
    ),
    ("POST", "/api/auth/firebase/reset", {}, "public", 422),
]

EXPECTED_API_ROUTES = {
    ("GET", "/api/data"),
    ("GET", "/api/status"),
    ("POST", "/api/pipeline/run"),
    ("POST", "/api/pipeline/refresh-nav"),
    ("GET", "/api/downloads/{filename}"),
    ("GET", "/api/stocks/tickers"),
    ("GET", "/api/stocks/history"),
    ("GET", "/api/mf/search"),
    ("GET", "/api/mf/nav"),
    ("POST", "/api/portfolio/calculate"),
    ("GET", "/api/lineage"),
    ("POST", "/api/ai/ask"),
    ("POST", "/api/ai/chat"),
    ("GET", "/api/ai/insights"),
    ("GET", "/api/health"),
    ("GET", "/api/auth/session"),
    ("POST", "/api/auth/logout"),
    ("POST", "/api/auth/firebase/login"),
    ("POST", "/api/auth/firebase/signup"),
    ("POST", "/api/auth/firebase/reset"),
    ("GET", "/api/auth/google/login"),
    ("GET", "/api/auth/google/callback"),
}


def _create_route_session(email: str = "user@example.com") -> str:
    token = sessions.create_session({"email": email, "local_id": "route-test-user"})
    return token


@pytest.mark.parametrize("method,url,body,access", API_SUCCESS_CASES)
def test_every_main_api_route_has_a_success_case(api_client, method, url, body, access):
    if access in {"user", "admin"}:
        email = "admin@example.com" if access == "admin" else "user@example.com"
        api_client.cookies.set(
            sessions.SESSION_COOKIE,
            _create_route_session(email),
        )

    response = _request(api_client, method, url, body)

    assert response.status_code == 200


@pytest.mark.parametrize("method,url,body,access,status_code", API_INVALID_INPUT_CASES)
def test_api_routes_reject_invalid_inputs(
    api_client, method, url, body, access, status_code
):
    if access in {"user", "admin"}:
        email = "admin@example.com" if access == "admin" else "user@example.com"
        api_client.cookies.set(
            sessions.SESSION_COOKIE,
            _create_route_session(email),
        )

    response = _request(api_client, method, url, body)

    assert response.status_code == status_code


def test_every_api_route_is_in_the_route_test_inventory():
    actual = {
        (method.upper(), path)
        for path, operations in app.openapi()["paths"].items()
        for method in operations
        if method in {"get", "post", "put", "patch", "delete"}
        and path.startswith("/api/")
    }

    assert actual == EXPECTED_API_ROUTES


def test_logout_succeeds_for_an_authenticated_user(api_client):
    api_client.cookies.set(sessions.SESSION_COOKIE, _create_route_session())

    response = api_client.post("/api/auth/logout")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_google_login_redirects_with_state_and_sets_state_cookie(api_client):
    response = api_client.get("/api/auth/google/login")

    assert response.status_code == 307
    assert "state=" in response.headers["location"]
    assert sessions.OAUTH_STATE_COOKIE in response.headers["set-cookie"]
