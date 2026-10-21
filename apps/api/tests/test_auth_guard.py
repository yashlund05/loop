# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for JWT authentication dependency and route protection using PyJWT.

Roadmap Acceptance Check:
- Anonymous requests to protected routes return HTTP 401 Unauthorized.
- PyJWT rejects alg=none, wrong audience, wrong issuer, expired token, and invalid secret.
"""

import time
import uuid

import jwt
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.dependencies.auth import AuthenticatedUser, get_current_user

# Named auth_guard_app to avoid pytest PytestCollectionWarning on 'test_*'
auth_guard_app = FastAPI()


@auth_guard_app.get("/api/v1/protected-test")
async def protected_endpoint(
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "status": "ok",
        "auth_uid": str(user.auth_uid),
        "email": user.email,
        "is_confirmed": user.is_confirmed,
    }


def _create_jwt(
    auth_uid: str,
    email: str,
    secret: str,
    algorithm: str = "HS256",
    audience: str = "authenticated",
    issuer: str | None = None,
    expires_in_seconds: int = 3600,
    email_confirmed_at: str | None = "2026-10-22T00:00:00Z",
) -> str:
    """Helper to generate JWTs with arbitrary claims for negative testing."""
    settings = get_settings()
    now = int(time.time())
    token_issuer = (
        issuer
        if issuer is not None
        else (settings.supabase_issuer or f"{settings.supabase_url}/auth/v1")
    )
    payload = {
        "sub": auth_uid,
        "email": email,
        "aud": audience,
        "iss": token_issuer,
        "role": "authenticated",
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    if email_confirmed_at:
        payload["email_confirmed_at"] = email_confirmed_at

    if algorithm == "none":
        # Unsigned token test
        return jwt.encode(payload, key="", algorithm="none")

    return jwt.encode(payload, key=secret, algorithm=algorithm)


def test_anonymous_request_returns_401() -> None:
    client = TestClient(auth_guard_app)
    response = client.get("/api/v1/protected-test")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_malformed_auth_header_returns_401() -> None:
    client = TestClient(auth_guard_app)
    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": "NotBearer xyz"},
    )
    assert response.status_code == 401


def test_alg_none_token_rejected() -> None:
    """Security Invariant: alg=none tokens must be rejected."""
    client = TestClient(auth_guard_app)
    test_uid = str(uuid.uuid4())
    token = _create_jwt(test_uid, "student@adypu.edu.in", secret="", algorithm="none")

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_wrong_audience_rejected() -> None:
    """Security Invariant: Token with invalid audience must be rejected."""
    client = TestClient(auth_guard_app)
    settings = get_settings()
    test_uid = str(uuid.uuid4())
    token = _create_jwt(
        test_uid,
        "student@adypu.edu.in",
        secret=settings.supabase_jwt_secret,
        audience="wrong-audience",
    )

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "audience" in response.json()["detail"].lower()


def test_wrong_issuer_rejected() -> None:
    """Security Invariant: Token with wrong issuer must be rejected."""
    import pytest
    from fastapi import HTTPException

    from app.dependencies.auth import verify_supabase_jwt

    test_uid = str(uuid.uuid4())
    secret = "test-secret-at-least-32-characters-long"
    token = _create_jwt(
        test_uid,
        "student@adypu.edu.in",
        secret=secret,
        issuer="https://attacker.com/auth/v1",
    )

    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_jwt(
            token, secret=secret, expected_issuer="https://valid.supabase.co/auth/v1"
        )
    assert exc_info.value.status_code == 401
    assert "issuer" in exc_info.value.detail.lower()


def test_expired_jwt_rejected() -> None:
    """Security Invariant: Expired tokens must be rejected."""
    client = TestClient(auth_guard_app)
    settings = get_settings()
    test_uid = str(uuid.uuid4())
    token = _create_jwt(
        test_uid,
        "student@adypu.edu.in",
        secret=settings.supabase_jwt_secret,
        expires_in_seconds=-60,
    )

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401
    assert "expired" in response.json()["detail"].lower()


def test_invalid_signature_rejected() -> None:
    client = TestClient(auth_guard_app)
    test_uid = str(uuid.uuid4())
    token = _create_jwt(
        test_uid,
        "student@adypu.edu.in",
        secret="wrong-secret-signature-key-at-least-32-chars",
    )

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_valid_jwt_returns_user() -> None:
    client = TestClient(auth_guard_app)
    settings = get_settings()
    test_uid = str(uuid.uuid4())
    token = _create_jwt(
        test_uid,
        "student@adypu.edu.in",
        secret=settings.supabase_jwt_secret,
        expires_in_seconds=3600,
    )

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["auth_uid"] == test_uid
    assert data["email"] == "student@adypu.edu.in"
    assert data["is_confirmed"] is True
