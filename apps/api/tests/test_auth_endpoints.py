# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for user registration, login, and token refresh endpoints."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_register_success() -> None:
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
    assert "access_token" in data
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
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "testuser@adypu.edu.in",
            "password": "Password123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_token_success() -> None:
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "valid-mock-refresh-token"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
