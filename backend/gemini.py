"""Thin wrapper around the Gemini REST API (generateContent)."""
from __future__ import annotations

import requests

from . import config

GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
DEFAULT_MODEL = "gemini-3.5-flash-lite"


class GeminiError(Exception):
    pass


def _call(contents: list[dict], system: str | None, temperature: float) -> str:
    api_key = config.GEMINI.get("api_key")
    model = config.GEMINI.get("model", DEFAULT_MODEL)
    if not api_key:
        raise GeminiError(
            "Gemini API key is not configured. Set GEMINI_API_KEY or add "
            "api_key to secrets.toml [gemini]."
        )

    payload: dict = {
        "contents": contents,
        "generationConfig": {"temperature": temperature},
    }
    if system:
        payload["systemInstruction"] = {"parts": [{"text": system}]}

    try:
        resp = requests.post(
            GEMINI_URL.format(model=model),
            params={"key": api_key},
            json=payload,
            timeout=30,
        )
    except requests.RequestException as exc:
        raise GeminiError(f"Network error contacting Gemini: {exc}") from exc

    if not resp.ok:
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except ValueError:
            detail = resp.text
        raise GeminiError(f"Gemini API error ({resp.status_code}): {detail}")

    data = resp.json()
    candidates = data.get("candidates") or []
    if not candidates:
        reason = data.get("promptFeedback", {}).get("blockReason")
        raise GeminiError(f"Gemini returned no candidates{f' ({reason})' if reason else ''}.")

    parts = candidates[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts if "text" in p).strip()
    if not text:
        raise GeminiError("Gemini returned an empty response.")
    return text


def generate(prompt: str, system: str | None = None, temperature: float = 0.3) -> str:
    return _call([{"role": "user", "parts": [{"text": prompt}]}], system, temperature)


def chat(messages: list[dict], system: str | None = None, temperature: float = 0.4) -> str:
    """messages: [{"role": "user"|"model", "content": str}, ...] (chronological)."""
    contents = [{"role": m["role"], "parts": [{"text": m["content"]}]} for m in messages]
    return _call(contents, system, temperature)
