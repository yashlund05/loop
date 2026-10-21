# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Authentication dependencies for Supabase JWT verification."""

import base64
import hashlib
import hmac
import json
import time
import uuid
from dataclasses import dataclass
from typing import Any, Optional, cast

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    auth_uid: uuid.UUID
    email: str
    is_confirmed: bool
    raw_payload: dict[str, Any]


def _decode_b64url(data: str) -> bytes:
    padding = "=" * ((4 - len(data) % 4) % 4)
    return base64.urlsafe_b64decode(data + padding)


def verify_supabase_jwt(token: str, secret: str) -> dict[str, Any]:
    """Verify an HS256 JWT signature and expiration."""
    parts = token.split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    header_b64, payload_b64, sig_b64 = parts

    try:
        header = json.loads(_decode_b64url(header_b64).decode("utf-8"))
        if header.get("alg") != "HS256":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unsupported signing algorithm",
                headers={"WWW-Authenticate": "Bearer"},
            )

        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")
        expected_sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
        actual_sig = _decode_b64url(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token signature",
                headers={"WWW-Authenticate": "Bearer"},
            )

        payload = json.loads(_decode_b64url(payload_b64).decode("utf-8"))
    except (ValueError, json.JSONDecodeError) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token encoding",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    exp = payload.get("exp")
    if exp is not None and time.time() > float(exp):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return cast(dict[str, Any], payload)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    """Dependency that extracts and validates the Bearer token."""
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_supabase_jwt(credentials.credentials, settings.supabase_jwt_secret)

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(sub)
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid subject claim format",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    email = payload.get("email", "")
    email_confirmed = bool(payload.get("email_confirmed_at"))

    return AuthenticatedUser(
        auth_uid=user_uuid,
        email=email,
        is_confirmed=email_confirmed,
        raw_payload=payload,
    )
