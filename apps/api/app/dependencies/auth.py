# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Authentication dependencies for Supabase JWT verification using PyJWT."""

import uuid
from dataclasses import dataclass
from typing import Any, Optional

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt.types import Options

from app.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=False)

ALLOWED_ALGORITHMS = ["HS256"]


@dataclass
class AuthenticatedUser:
    auth_uid: uuid.UUID
    email: str
    is_confirmed: bool
    raw_payload: dict[str, Any]


def verify_supabase_jwt(
    token: str, secret: str, expected_issuer: Optional[str] = None
) -> dict[str, Any]:
    """Verify Supabase JWT using PyJWT.

    Security Requirements:
    - Pinned allowed algorithms: HS256 (matches Supabase project shared secret signing).
    - Rejects 'alg=none' and asymmetric algorithm confusion.
    - Requires 'exp', 'aud="authenticated"', and 'iss'.
    """
    req_claims = ["exp", "aud"]
    if expected_issuer:
        req_claims.append("iss")

    decode_options: Options = {
        "verify_signature": True,
        "verify_exp": True,
        "verify_aud": True,
        "verify_iss": bool(expected_issuer),
        "require": req_claims,
    }

    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            key=secret,
            algorithms=ALLOWED_ALGORITHMS,
            audience="authenticated",
            issuer=expected_issuer if expected_issuer else None,
            options=decode_options,
        )
    except jwt.ExpiredSignatureError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.InvalidAudienceError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.InvalidIssuerError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.InvalidAlgorithmError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or unsupported signing algorithm",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.MissingRequiredClaimError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Missing required token claim: {err}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
    except jwt.PyJWTError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {type(err).__name__}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from err

    return payload


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

    expected_issuer = (
        settings.supabase_issuer
        if settings.supabase_issuer
        else (f"{settings.supabase_url}/auth/v1" if settings.supabase_url else None)
    )

    payload = verify_supabase_jwt(
        credentials.credentials,
        secret=settings.supabase_jwt_secret,
        expected_issuer=expected_issuer,
    )

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
