"""Persistent SQLite-backed authentication and OAuth state storage."""
from __future__ import annotations

import os
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Iterator, Optional

from .config import ROOT

SESSION_COOKIE = "fs_session"
OAUTH_STATE_COOKIE = "fs_oauth_session"
SESSION_MAX_AGE = 60 * 60 * 24 * 7
OAUTH_STATE_MAX_AGE = 60 * 10
DATABASE_PATH = Path(os.getenv("FUNDSCOPE_DB_PATH", str(ROOT / "fundscope.db")))


@contextmanager
def _connect() -> Iterator[sqlite3.Connection]:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _timestamp(value: datetime) -> str:
    return value.isoformat(timespec="microseconds")


def initialize_session_store() -> None:
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS sessions (
                session_id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                email TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS oauth_states (
                state TEXT PRIMARY KEY,
                browser_session_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_oauth_states_expires_at ON oauth_states(expires_at)"
        )


def create_session(user: dict) -> str:
    token = secrets.token_urlsafe(32)
    now = _utc_now()
    initialize_session_store()
    with _connect() as connection:
        connection.execute(
            "DELETE FROM sessions WHERE expires_at <= ?", (_timestamp(now),)
        )
        connection.execute(
            """
            INSERT INTO sessions (session_id, user_id, email, created_at, expires_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                token,
                str(user.get("local_id") or user.get("user_id") or ""),
                str(user.get("email") or ""),
                _timestamp(now),
                _timestamp(now + timedelta(seconds=SESSION_MAX_AGE)),
            ),
        )
    return token


def get_session(token: Optional[str]) -> Optional[dict]:
    if not token:
        return None
    initialize_session_store()
    now = _timestamp(_utc_now())
    with _connect() as connection:
        row = connection.execute(
            "SELECT user_id, email, expires_at FROM sessions WHERE session_id = ?",
            (token,),
        ).fetchone()
        if row is None:
            return None
        if row["expires_at"] <= now:
            connection.execute("DELETE FROM sessions WHERE session_id = ?", (token,))
            return None
    return {"email": row["email"], "local_id": row["user_id"]}


def destroy_session(token: Optional[str]) -> None:
    if not token:
        return
    initialize_session_store()
    with _connect() as connection:
        connection.execute("DELETE FROM sessions WHERE session_id = ?", (token,))


def create_oauth_state() -> tuple[str, str]:
    state = secrets.token_urlsafe(32)
    browser_session_id = secrets.token_urlsafe(32)
    now = _utc_now()
    initialize_session_store()
    with _connect() as connection:
        connection.execute(
            "DELETE FROM oauth_states WHERE expires_at <= ?", (_timestamp(now),)
        )
        connection.execute(
            """
            INSERT INTO oauth_states (state, browser_session_id, created_at, expires_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                state,
                browser_session_id,
                _timestamp(now),
                _timestamp(now + timedelta(seconds=OAUTH_STATE_MAX_AGE)),
            ),
        )
    return state, browser_session_id


def consume_oauth_state(state: Optional[str], browser_session_id: Optional[str]) -> bool:
    if not state or not browser_session_id:
        return False
    initialize_session_store()
    now = _timestamp(_utc_now())
    with _connect() as connection:
        cursor = connection.execute(
            """
            DELETE FROM oauth_states
            WHERE state = ? AND browser_session_id = ? AND expires_at > ?
            """,
            (state, browser_session_id, now),
        )
        return cursor.rowcount == 1
