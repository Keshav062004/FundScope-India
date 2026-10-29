from __future__ import annotations

from fastapi import Cookie, Depends, HTTPException, status

from . import config
from .sessions import get_session


def require_user(fs_session: str | None = Cookie(default=None)) -> dict:
    user = get_session(fs_session)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Cookie"},
        )
    return user


def require_admin(user: dict = Depends(require_user)) -> dict:
    if user.get("email", "").strip().casefold() not in config.ADMIN_EMAILS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )
    return user
