# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for community verification rules and rate limiting.

Roadmap Acceptance Checks:
- Anonymous requests to protected routes return HTTP 401 Unauthorized.
- Unconfirmed email on college domain is rejected (requires confirmed email).
- Wrong join code is rejected (HTTP 400), and rate-limited after 5 failed attempts (HTTP 429).
- Valid confirmed college email or valid join code grants verification.
"""

import base64
import hashlib
import hmac
import json
import time
import uuid

from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.rate_limiter import join_code_rate_limiter

client = TestClient(app)


def _make_auth_token(
    email: str,
    auth_uid: str | None = None,
    confirmed: bool = True,
) -> str:
    """Helper to generate a valid test JWT with specified confirmation status."""
    settings = get_settings()
    uid = auth_uid or str(uuid.uuid4())
    header = {"alg": "HS256", "typ": "JWT"}
    now = int(time.time())
    payload = {
        "sub": uid,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iat": now,
        "exp": now + 3600,
    }
    if confirmed:
        payload["email_confirmed_at"] = "2026-10-22T00:00:00Z"

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")

    h_str = b64url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_str = b64url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(
        settings.supabase_jwt_secret.encode("utf-8"),
        f"{h_str}.{p_str}".encode("utf-8"),
        hashlib.sha256,
    ).digest()
    return f"{h_str}.{p_str}.{b64url(sig)}"


def test_verify_community_anonymous_returns_401() -> None:
    response = client.post("/api/v1/auth/verify-community", json={})
    assert response.status_code == 401


def test_unconfirmed_college_email_rejected() -> None:
    """Invariant: domain verification requires CONFIRMED email, never trusts raw address."""
    token = _make_auth_token("student@adypu.edu.in", confirmed=False)
    response = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "email_domain"},
    )
    assert response.status_code == 400
    assert "confirmed" in response.json()["detail"].lower()


def test_confirmed_college_email_verified() -> None:
    token = _make_auth_token("student@adypu.edu.in", confirmed=True)
    response = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "email_domain"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is True
    assert data["verification_method"] == "email_domain"
    assert "adypu" in data["community_name"].lower() or "ajeenkya" in data["community_name"].lower()


def test_wrong_domain_rejected_without_code() -> None:
    token = _make_auth_token("user@gmail.com", confirmed=True)
    response = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "email_domain"},
    )
    assert response.status_code == 400
    assert "domain" in response.json()["detail"].lower()


def test_valid_join_code_verified() -> None:
    token = _make_auth_token("user@gmail.com", confirmed=True)
    response = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "join_code", "join_code": "LOOP-DEMO-2026"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_verified"] is True
    assert data["verification_method"] == "join_code"


def test_invalid_join_code_rejected() -> None:
    user_uid = str(uuid.uuid4())
    token = _make_auth_token("user@gmail.com", auth_uid=user_uid, confirmed=True)
    response = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "join_code", "join_code": "WRONG-CODE"},
    )
    assert response.status_code == 400
    assert "invalid" in response.json()["detail"].lower()


def test_join_code_rate_limited_after_5_failures() -> None:
    """Roadmap Acceptance Check: 5 failed attempts trigger HTTP 429 Too Many Requests."""
    user_uid = str(uuid.uuid4())
    token = _make_auth_token("user@gmail.com", auth_uid=user_uid, confirmed=True)

    # Reset limiter for this user just in case
    join_code_rate_limiter.reset(user_uid)

    # 5 failed attempts
    for _ in range(5):
        res = client.post(
            "/api/v1/auth/verify-community",
            headers={"Authorization": f"Bearer {token}"},
            json={"method": "join_code", "join_code": "INCORRECT-CODE"},
        )
        assert res.status_code == 400

    # 6th attempt should be blocked by rate limiter with 429
    blocked_res = client.post(
        "/api/v1/auth/verify-community",
        headers={"Authorization": f"Bearer {token}"},
        json={"method": "join_code", "join_code": "LOOP-DEMO-2026"},
    )
    assert blocked_res.status_code == 429
    assert "too many" in blocked_res.json()["detail"].lower()
