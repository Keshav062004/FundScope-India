from __future__ import annotations

from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field

from . import config
from .deps import require_user
from .sessions import (
    OAUTH_STATE_COOKIE,
    OAUTH_STATE_MAX_AGE,
    SESSION_COOKIE,
    consume_oauth_state,
    create_oauth_state,
    create_session,
    destroy_session,
    get_session,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

FIREBASE_ACCOUNTS = "https://identitytoolkit.googleapis.com/v1/accounts"
GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


def firebase_request(endpoint: str, payload: dict) -> dict:
    api_key = config.FIREBASE["api_key"]
    response = requests.post(
        f"{FIREBASE_ACCOUNTS}:{endpoint}?key={api_key}", json=payload, timeout=20
    )
    try:
        data = response.json()
    except ValueError:
        data = {}
    if not response.ok:
        error = data.get("error", {}).get("message", "UNKNOWN_ERROR")
        raise ValueError(error)
    return data


def _set_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        SESSION_COOKIE,
        token,
        httponly=config.COOKIE_HTTPONLY,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        max_age=config.COOKIE_MAX_AGE,
    )


# ---------------------------------------------------------------- session --

@router.get("/session")
def session(fs_session: str | None = Cookie(default=None)):
    user = get_session(fs_session)
    return {"user": user}


@router.post("/logout")
def logout(
    response: Response,
    fs_session: str | None = Cookie(default=None),
    _user: dict = Depends(require_user),
):
    destroy_session(fs_session)
    response.delete_cookie(
        SESSION_COOKIE,
        httponly=config.COOKIE_HTTPONLY,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
    )
    return {"ok": True}


# ----------------------------------------------------------- email/password --

class EmailAuth(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6)


class ResetRequest(BaseModel):
    email: str = Field(min_length=3)


@router.post("/firebase/login")
def firebase_login(body: EmailAuth, response: Response):
    try:
        result = firebase_request(
            "signInWithPassword",
            {"email": body.email.strip(), "password": body.password, "returnSecureToken": True},
        )
        account = firebase_request("lookup", {"idToken": result["idToken"]})
        users = account.get("users", [])
        if not users:
            return {"error": "Could not verify this account."}
        if not users[0].get("emailVerified", False):
            try:
                firebase_request("sendOobCode", {"requestType": "VERIFY_EMAIL", "idToken": result["idToken"]})
            except Exception:
                pass
            return {"error": "Please verify your email first. A verification email has been sent."}
        user = {"email": result.get("email", ""), "local_id": result["localId"]}
        token = create_session(user)
        _set_cookie(response, token)
        return {"user": user}
    except ValueError as exc:
        error = str(exc)
        if "INVALID_LOGIN_CREDENTIALS" in error:
            return {"error": "Incorrect email or password."}
        if "TOO_MANY_ATTEMPTS" in error:
            return {"error": "Too many attempts. Please try again later."}
        return {"error": f"Login failed: {error}"}
    except requests.RequestException:
        return {"error": "Network error. Check your internet connection."}


@router.post("/firebase/signup")
def firebase_signup(body: EmailAuth):
    try:
        result = firebase_request(
            "signUp",
            {"email": body.email.strip(), "password": body.password, "returnSecureToken": True},
        )
        firebase_request("sendOobCode", {"requestType": "VERIFY_EMAIL", "idToken": result["idToken"]})
        return {"ok": True, "message": "Account created! Check your email and verify your address before logging in."}
    except ValueError as exc:
        error = str(exc)
        mapping = {
            "EMAIL_EXISTS": "This email is already registered. Try logging in or resetting your password.",
            "WEAK_PASSWORD": "Choose a stronger password.",
            "INVALID_EMAIL": "Enter a valid email address.",
            "OPERATION_NOT_ALLOWED": "Email/password sign-in is not enabled in Firebase Authentication.",
        }
        for key, message in mapping.items():
            if key in error:
                return {"error": message}
        return {"error": f"Signup failed: {error}"}
    except requests.RequestException:
        return {"error": "Network error. Check your internet connection."}


@router.post("/firebase/reset")
def firebase_reset(body: ResetRequest):
    generic_ok = {"ok": True, "message": "If the account can receive a reset email, Firebase will send instructions to your inbox."}
    try:
        firebase_request("sendOobCode", {"requestType": "PASSWORD_RESET", "email": body.email.strip()})
        return generic_ok
    except ValueError as exc:
        if "EMAIL_NOT_FOUND" in str(exc):
            return generic_ok
        return {"error": f"Could not send reset email: {exc}"}
    except requests.RequestException:
        return {"error": "Network error. Check your internet connection."}


# ------------------------------------------------------------- google oauth --

@router.get("/google/login")
def google_login():
    state, browser_session_id = create_oauth_state()
    params = {
        "client_id": config.AUTH["client_id"],
        "redirect_uri": config.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "prompt": "select_account",
        "state": state,
    }
    response = RedirectResponse(f"{GOOGLE_AUTHORIZE_URL}?{urlencode(params)}")
    response.set_cookie(
        OAUTH_STATE_COOKIE,
        browser_session_id,
        httponly=config.COOKIE_HTTPONLY,
        secure=config.COOKIE_SECURE,
        samesite=config.COOKIE_SAMESITE,
        max_age=OAUTH_STATE_MAX_AGE,
    )
    return response


@router.get("/google/callback")
def google_callback(
    state: str | None = None,
    code: str | None = None,
    error: str | None = None,
    fs_oauth_session: str | None = Cookie(default=None),
):
    if not consume_oauth_state(state, fs_oauth_session):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state.",
        )
    if error or not code:
        response = RedirectResponse(f"{config.FRONTEND_ORIGIN}/login?error=google_auth_failed")
        response.delete_cookie(
            OAUTH_STATE_COOKIE,
            httponly=config.COOKIE_HTTPONLY,
            secure=config.COOKIE_SECURE,
            samesite=config.COOKIE_SAMESITE,
        )
        return response

    try:
        token_response = requests.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": config.AUTH["client_id"],
                "client_secret": config.AUTH["client_secret"],
                "redirect_uri": config.GOOGLE_REDIRECT_URI,
                "grant_type": "authorization_code",
            },
            timeout=20,
        )
        token_response.raise_for_status()
        google_id_token = token_response.json().get("id_token")
        if not google_id_token:
            return RedirectResponse(f"{config.FRONTEND_ORIGIN}/login?error=no_id_token")

        result = firebase_request(
            "signInWithIdp",
            {
                "postBody": urlencode({"id_token": google_id_token, "providerId": "google.com"}),
                "requestUri": config.FRONTEND_ORIGIN,
                "returnIdpCredential": True,
                "returnSecureToken": True,
            },
        )
        user = {"email": result.get("email", ""), "local_id": result["localId"]}
        token = create_session(user)
        redirect = RedirectResponse(f"{config.FRONTEND_ORIGIN}/app")
        _set_cookie(redirect, token)
        redirect.delete_cookie(
            OAUTH_STATE_COOKIE,
            httponly=config.COOKIE_HTTPONLY,
            secure=config.COOKIE_SECURE,
            samesite=config.COOKIE_SAMESITE,
        )
        return redirect
    except Exception:
        return RedirectResponse(f"{config.FRONTEND_ORIGIN}/login?error=google_auth_failed")
