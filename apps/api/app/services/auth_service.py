# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Authentication and community verification business logic."""

import hashlib
import hmac
import uuid
from typing import Any, Optional, cast

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies.auth import AuthenticatedUser
from app.models.identity import Membership, User
from app.schemas.auth import (
    AuthResponse,
    AuthUserResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    VerifyCommunityRequest,
    VerifyCommunityResponse,
)
from app.services.rate_limiter import join_code_rate_limiter

DEFAULT_COLLEGE_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
DEFAULT_COLLEGE_NAME = "Ajeenkya D Y Patil University"


class AuthService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def hash_join_code(self, code: str) -> str:
        """Hash a join code using HMAC-SHA256 with server-side pepper."""
        pepper = self.settings.join_code_pepper.encode("utf-8")
        return hmac.new(pepper, code.strip().encode("utf-8"), hashlib.sha256).hexdigest()

    async def register(
        self, request: RegisterRequest, db: AsyncSession | None = None
    ) -> AuthResponse:
        """Register a new user with Supabase Auth and initialize local profile."""
        if not self.settings.supabase_url:
            synthetic_uid = uuid.uuid4()
            user_response = AuthUserResponse(
                id=uuid.uuid4(),
                auth_uid=synthetic_uid,
                display_name=request.display_name,
                area_name=request.area_name,
                geohash5=request.geohash5,
                is_verified=False,
                role="user",
            )
            return AuthResponse(
                access_token="dev-synthetic-access-token",
                refresh_token="dev-synthetic-refresh-token",
                user=user_response,
            )

        signup_url = f"{self.settings.supabase_url}/auth/v1/signup"
        headers = {
            "apikey": self.settings.supabase_anon_key,
            "Content-Type": "application/json",
        }
        payload = {
            "email": request.email,
            "password": request.password,
            "data": {
                "display_name": request.display_name,
                "area_name": request.area_name,
                "geohash5": request.geohash5,
            },
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(signup_url, headers=headers, json=payload)
            if res.status_code not in (200, 201):
                err_detail = "Registration failed"
                try:
                    err_json = res.json()
                    err_detail = (
                        err_json.get("msg") or err_json.get("error_description") or err_detail
                    )
                except Exception:
                    pass
                raise HTTPException(status_code=res.status_code, detail=err_detail)

            data = res.json()
            session = data.get("session") or {}
            auth_uid = uuid.UUID(data.get("id") or data.get("user", {}).get("id"))

            user_response = AuthUserResponse(
                id=uuid.uuid4(),
                auth_uid=auth_uid,
                display_name=request.display_name,
                area_name=request.area_name,
                geohash5=request.geohash5,
                is_verified=False,
                role="user",
            )

            return AuthResponse(
                access_token=session.get("access_token", "pending-email-confirmation"),
                refresh_token=session.get("refresh_token", ""),
                user=user_response,
            )

    async def login(self, request: LoginRequest) -> AuthResponse:
        """Authenticate user with email and password via Supabase Auth."""
        if not self.settings.supabase_url:
            synthetic_uid = uuid.uuid4()
            return AuthResponse(
                access_token="dev-synthetic-login-token",
                refresh_token="dev-synthetic-refresh-token",
                user=AuthUserResponse(
                    id=uuid.uuid4(),
                    auth_uid=synthetic_uid,
                    display_name="Demo User",
                    area_name="Lohegaon",
                    geohash5="tek3z",
                    is_verified=True,
                    role="user",
                ),
            )

        token_url = f"{self.settings.supabase_url}/auth/v1/token?grant_type=password"
        headers = {
            "apikey": self.settings.supabase_anon_key,
            "Content-Type": "application/json",
        }
        payload = {"email": request.email, "password": request.password}

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(token_url, headers=headers, json=payload)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid email or password",
                )
            data = res.json()
            user_meta = data.get("user", {}).get("user_metadata", {})
            auth_uid = uuid.UUID(data["user"]["id"])

            return AuthResponse(
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                user=AuthUserResponse(
                    id=uuid.uuid4(),
                    auth_uid=auth_uid,
                    display_name=user_meta.get("display_name", "User"),
                    area_name=user_meta.get("area_name", "Campus Area"),
                    geohash5=user_meta.get("geohash5", "tek3z"),
                    is_verified=False,
                    role="user",
                ),
            )

    async def refresh_token(self, request: RefreshTokenRequest) -> dict[str, Any]:
        """Refresh an expired access token."""
        if not self.settings.supabase_url:
            return {
                "access_token": "dev-refreshed-token",
                "refresh_token": request.refresh_token,
                "token_type": "bearer",
            }

        refresh_url = f"{self.settings.supabase_url}/auth/v1/token?grant_type=refresh_token"
        headers = {
            "apikey": self.settings.supabase_anon_key,
            "Content-Type": "application/json",
        }
        payload = {"refresh_token": request.refresh_token}

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(refresh_url, headers=headers, json=payload)
            if res.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired refresh token",
                )
            return cast(dict[str, Any], res.json())

    async def verify_community(
        self,
        current_user: AuthenticatedUser,
        request: VerifyCommunityRequest,
        client_ip: Optional[str] = None,
        db: AsyncSession | None = None,
    ) -> VerifyCommunityResponse:
        """Verify user's college community membership.

        Security Invariants:
        1. Email domain verification requires a CONFIRMED email address (never trust unconfirmed).
        2. Join code verification is rate limited per-user and per-IP (max 5 failures per hour).
        3. Join code comparison uses HMAC-SHA256 with server-side pepper and constant-time compare.
        """
        community_id = DEFAULT_COLLEGE_ID
        community_name = DEFAULT_COLLEGE_NAME

        if request.method == "email_domain":
            # Invariant 1: Email must be confirmed
            if not current_user.is_confirmed:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email address must be confirmed before domain verification",
                )

            email_domain = (
                current_user.email.split("@")[-1].lower() if "@" in current_user.email else ""
            )
            expected_domain = self.settings.college_domain.lower()

            if email_domain != expected_domain:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=(
                        f"Email domain '{email_domain}' does not match "
                        f"required college domain '{expected_domain}'"
                    ),
                )

            if db is not None:
                await self._persist_verification(current_user.auth_uid, community_id, db)

            return VerifyCommunityResponse(
                is_verified=True,
                community_id=community_id,
                community_name=community_name,
                verification_method="email_domain",
            )

        elif request.method == "join_code":
            user_key = str(current_user.auth_uid)

            # Invariant 2: Rate limit per-user and per-IP
            if join_code_rate_limiter.is_rate_limited(user_key, client_ip=client_ip):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many failed join code attempts. Please try again in an hour.",
                )

            if not request.join_code:
                join_code_rate_limiter.record_failure(user_key, client_ip=client_ip)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Join code is required",
                )

            # Invariant 3: HMAC-SHA256 with pepper & constant-time compare
            submitted_code_hash = self.hash_join_code(request.join_code)
            expected_code_hash = self.hash_join_code(self.settings.seed_join_code)

            if not hmac.compare_digest(submitted_code_hash, expected_code_hash):
                join_code_rate_limiter.record_failure(user_key, client_ip=client_ip)
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid join code provided",
                )

            # Success: reset failure counter
            join_code_rate_limiter.reset(user_key, client_ip=client_ip)

            if db is not None:
                await self._persist_verification(current_user.auth_uid, community_id, db)

            return VerifyCommunityResponse(
                is_verified=True,
                community_id=community_id,
                community_name=community_name,
                verification_method="join_code",
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported verification method",
        )

    async def _persist_verification(
        self, auth_uid: uuid.UUID, community_id: uuid.UUID, db: AsyncSession
    ) -> None:
        """Associate user with verified community and update verification flag in DB."""
        result = await db.execute(select(User).where(User.auth_uid == auth_uid))
        user = result.scalar_one_or_none()
        if user:
            user.is_verified = True
            membership_check = await db.execute(
                select(Membership).where(
                    Membership.user_id == user.id,
                    Membership.community_id == community_id,
                )
            )
            if not membership_check.scalar_one_or_none():
                membership = Membership(user_id=user.id, community_id=community_id)
                db.add(membership)
            await db.commit()


auth_service = AuthService()
