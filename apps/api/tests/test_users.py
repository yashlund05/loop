# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for user profile, data export, and DPDP Act deletion with storage purge."""

import uuid
from unittest.mock import AsyncMock, patch

import jwt
from fastapi.testclient import TestClient

from app.config import get_settings
from app.main import app
from app.services.admin_service import admin_service

client = TestClient(app)


def _make_user_token(auth_uid: str, email: str = "user@example.com") -> str:
    settings = get_settings()
    payload = {
        "sub": auth_uid,
        "email": email,
        "aud": "authenticated",
        "iss": settings.supabase_issuer or f"{settings.supabase_url}/auth/v1",
        "role": "authenticated",
        "iat": 1700000000,
        "exp": 1800000000,
        "email_confirmed_at": "2026-10-22T00:00:00Z",
    }
    return jwt.encode(payload, key=settings.supabase_jwt_secret, algorithm="HS256")


def test_get_profile_anonymous_returns_401() -> None:
    response = client.get("/api/v1/users/me")
    assert response.status_code == 401


def test_get_profile_authenticated() -> None:
    uid = str(uuid.uuid4())
    token = _make_user_token(uid)
    response = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["auth_uid"] == uid
    assert "geohash5" in data


def test_update_profile_coarse_location() -> None:
    uid = str(uuid.uuid4())
    token = _make_user_token(uid)
    response = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"display_name": "Updated Name", "area_name": "Dhanori", "geohash5": "tek3y"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Updated Name"
    assert data["geohash5"] == "tek3y"


def test_update_profile_invalid_geohash_rejected() -> None:
    uid = str(uuid.uuid4())
    token = _make_user_token(uid)
    response = client.patch(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"geohash5": "tek3y99"},  # Precision > 5
    )
    assert response.status_code == 422


def test_export_data_dpdp_act() -> None:
    uid = str(uuid.uuid4())
    token = _make_user_token(uid)
    response = client.get("/api/v1/users/me/export", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert "exported_at" in data
    assert data["profile"]["auth_uid"] == uid


def test_delete_user_invokes_storage_purge_and_auth_cleanup() -> None:
    uid = str(uuid.uuid4())
    token = _make_user_token(uid)

    with (
        patch.object(admin_service, "purge_user_storage", new_callable=AsyncMock) as mock_purge,
        patch.object(admin_service, "delete_auth_user", new_callable=AsyncMock) as mock_del,
    ):
        mock_del.return_value = True

        response = client.delete("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 200
        assert response.json()["status"] == "account_deleted"

        # Verify storage purge was invoked
        mock_purge.assert_awaited_once_with(uid)
        mock_del.assert_awaited_once_with(uid)
