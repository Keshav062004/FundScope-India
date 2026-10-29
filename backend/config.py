from __future__ import annotations

import os
import tomllib
from pathlib import Path
from typing import Literal

ROOT = Path(__file__).resolve().parent.parent
SECRETS_PATH = ROOT / "secrets.toml"  # local only, never committed

_secrets: dict = {}
if SECRETS_PATH.exists():
    with SECRETS_PATH.open("rb") as f:
        _secrets = tomllib.load(f)

FIREBASE = _secrets.get("firebase", {})
AUTH = _secrets.get("auth", {})
SUPABASE = _secrets.get("supabase", {})
GEMINI = dict(_secrets.get("gemini", {}))
if os.getenv("GEMINI_API_KEY"):
    GEMINI["api_key"] = os.environ["GEMINI_API_KEY"]
if os.getenv("GEMINI_MODEL"):
    GEMINI["model"] = os.environ["GEMINI_MODEL"]

def _admin_emails() -> frozenset[str]:
    configured = _secrets.get("ADMIN_EMAILS")
    if configured is None:
        auth_secrets = _secrets.get("auth", {})
        configured = auth_secrets.get("ADMIN_EMAILS", auth_secrets.get("admin_emails", []))
    if not isinstance(configured, list):
        raise ValueError("ADMIN_EMAILS must be a list of email addresses in secrets.toml.")
    return frozenset(
        email.strip().casefold()
        for email in configured
        if isinstance(email, str) and email.strip()
    )


ADMIN_EMAILS = _admin_emails()
ENVIRONMENT = os.getenv("FUNDSCOPE_ENV", "development").strip().casefold()
COOKIE_SECURE = ENVIRONMENT in {"production", "prod"}
COOKIE_SAMESITE: Literal["lax", "strict", "none"] = "lax"
COOKIE_HTTPONLY = True
COOKIE_MAX_AGE = 60 * 60 * 24 * 7


def parse_cors_origins(value: str) -> list[str]:
    return [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]


CORS_ORIGINS = parse_cors_origins(
    os.getenv("CORS_ORIGINS", "http://localhost:5173")
)
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173").rstrip("/")
BACKEND_ORIGIN = os.getenv("BACKEND_ORIGIN", "http://localhost:8000").rstrip("/")
GOOGLE_REDIRECT_URI = f"{BACKEND_ORIGIN}/api/auth/google/callback"
