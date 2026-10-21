# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for user registration, login, and token refresh endpoints (unit-tested with mocks)."""

from unittest.mock import AsyncMock, patch

import httpx
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_success() -> None:
    mock_response = httpx.Response(
        status_code=200,
        json={
            "id": "11111111-2222-3333-4444-555555555555",
            "session": {
                "access_token": "mock-access-token",
                "refresh_token": "mock-refresh-token",
            },
        },
        request=httpx.Request("POST", "http://test/signup"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        response = client.post(
            "/api/v1/auth/register",
            json={
                "email": "testuser@adypu.edu.in",
                "password": "Password123!",
                "display_name": "Test User",
                "area_name": "Lohegaon",
                "geohash5": "tek3z",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["access_token"] == "mock-access-token"
        assert data["user"]["display_name"] == "Test User"
        assert data["user"]["geohash5"] == "tek3z"


def test_register_invalid_geohash_length_rejected() -> None:
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "testuser@adypu.edu.in",
            "password": "Password123!",
            "display_name": "Test User",
            "area_name": "Lohegaon",
            "geohash5": "tek3z99",  # Precision > 5 not allowed!
        },
    )
    assert response.status_code == 422


def test_login_success() -> None:
    mock_response = httpx.Response(
        status_code=200,
        json={
            "access_token": "mock-login-access-token",
            "refresh_token": "mock-login-refresh-token",
            "user": {
                "id": "11111111-2222-3333-4444-555555555555",
                "user_metadata": {
                    "display_name": "Test User",
                    "area_name": "Lohegaon",
                    "geohash5": "tek3z",
                },
            },
        },
        request=httpx.Request("POST", "http://test/token"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        response = client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@adypu.edu.in",
                "password": "Password123!",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "mock-login-access-token"
        assert data["refresh_token"] == "mock-login-refresh-token"


def test_refresh_token_success() -> None:
    mock_response = httpx.Response(
        status_code=200,
        json={
            "access_token": "mock-refreshed-access-token",
            "refresh_token": "mock-new-refresh-token",
            "token_type": "bearer",
        },
        request=httpx.Request("POST", "http://test/token"),
    )

    with patch.object(httpx.AsyncClient, "post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "valid-mock-refresh-token"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["access_token"] == "mock-refreshed-access-token"
