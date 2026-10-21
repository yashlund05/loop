# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Authentication and community verification router."""

from typing import Any

from fastapi import APIRouter, Depends, Request, status

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    VerifyCommunityRequest,
    VerifyCommunityResponse,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(request: RegisterRequest) -> AuthResponse:
    return await auth_service.register(request)


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Log in user with email and password",
)
async def login(request: LoginRequest) -> AuthResponse:
    return await auth_service.login(request)


@router.post(
    "/refresh",
    summary="Refresh an expired access token",
)
async def refresh(request: RefreshTokenRequest) -> dict[str, Any]:
    return await auth_service.refresh_token(request)


@router.post(
    "/verify-community",
    response_model=VerifyCommunityResponse,
    summary="Verify community membership via email domain or hashed join code",
)
async def verify_community(
    request: VerifyCommunityRequest,
    http_request: Request,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> VerifyCommunityResponse:
    client_ip = http_request.client.host if http_request.client else None
    return await auth_service.verify_community(current_user, request, client_ip=client_ip)
