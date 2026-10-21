# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for JWT authentication dependency and route protection.

Roadmap Acceptance Check:
- Anonymous requests to protected routes return HTTP 401 Unauthorized.
"""

import base64
import hashlib
import hmac
import json
import time
import uuid

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.config import get_settings
from app.dependencies.auth import AuthenticatedUser, get_current_user

# Create a minimal app to test the auth guard dependency
test_app = FastAPI()


@test_app.get("/api/v1/protected-test")
async def protected_endpoint(
    user: AuthenticatedUser = Depends(get_current_user),
) -> dict[str, object]:
    return {
        "status": "ok",
        "auth_uid": str(user.auth_uid),
        "email": user.email,
        "is_confirmed": user.is_confirmed,
    }


def _create_test_jwt(
    auth_uid: str,
    email: str,
    secret: str,
    expires_in_seconds: int = 3600,
    email_confirmed_at: str | None = "2026-10-22T00:00:00Z",
) -> str:
    """Helper to generate a signed HS256 JWT for testing."""
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": auth_uid,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + expires_in_seconds,
    }
    if email_confirmed_at:
        payload["email_confirmed_at"] = email_confirmed_at

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    h_str = b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_str = b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{h_str}.{p_str}".encode("utf-8")
    sig = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    s_str = b64url(sig)
    return f"{h_str}.{p_str}.{s_str}"


def test_anonymous_request_returns_401() -> None:
    client = TestClient(test_app)
    response = client.get("/api/v1/protected-test")
    assert response.status_code == 401
    assert "detail" in response.json()


def test_malformed_auth_header_returns_401() -> None:
    client = TestClient(test_app)
    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": "NotBearer xyz"},
    )
    assert response.status_code == 401


def test_invalid_jwt_signature_returns_401() -> None:
    client = TestClient(test_app)
    test_uid = str(uuid.uuid4())
    token = _create_test_jwt(test_uid, "student@adypu.edu.in", secret="wrong-secret-key")

    response = client.get(
        "/api/v1/protected-test",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


def test_expired_jwt_returns_401() -> None:
    client = TestClient(test_app)
    settings = get_settings()
    test_uid = str(uuid.uuid4())
    token = _create_test_jwt(
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


def test_valid_jwt_returns_user() -> None:
    client = TestClient(test_app)
    settings = get_settings()
    test_uid = str(uuid.uuid4())
    token = _create_test_jwt(
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
