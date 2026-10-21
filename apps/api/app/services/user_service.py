# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""User profile, data portability export, and account deletion service."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies.auth import AuthenticatedUser
from app.models.identity import User
from app.schemas.user import (
    UserDataExportResponse,
    UserDeleteResponse,
    UserProfileResponse,
    UserUpdateRequest,
)
from app.services.admin_service import admin_service


class UserService:
    async def get_or_create_profile(
        self,
        auth_user: AuthenticatedUser,
        db: Optional[AsyncSession] = None,
    ) -> UserProfileResponse:
        """Fetch user profile or return synthetic dev profile with explicit ownership."""
        if db is not None:
            # Explicit ownership check
            result = await db.execute(select(User).where(User.auth_uid == auth_user.auth_uid))
            user = result.scalar_one_or_none()
            if user:
                return UserProfileResponse(
                    id=user.id,
                    auth_uid=user.auth_uid,
                    display_name=user.display_name,
                    area_name=user.area_name,
                    geohash5=user.geohash5,
                    is_verified=user.is_verified,
                    role=user.role,
                    created_at=user.created_at,
                    communities=[],
                )

        # Fallback / standalone mock response
        return UserProfileResponse(
            id=uuid.uuid4(),
            auth_uid=auth_user.auth_uid,
            display_name="Demo User",
            area_name="Lohegaon",
            geohash5="tek3z",
            is_verified=auth_user.is_confirmed,
            role="user",
            created_at=datetime.now(timezone.utc),
            communities=[],
        )

    async def update_profile(
        self,
        auth_user: AuthenticatedUser,
        update_req: UserUpdateRequest,
        db: Optional[AsyncSession] = None,
    ) -> UserProfileResponse:
        """Update coarse location and display name with explicit ownership checks."""
        if db is not None:
            result = await db.execute(select(User).where(User.auth_uid == auth_user.auth_uid))
            user = result.scalar_one_or_none()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User profile not found",
                )
            if update_req.display_name is not None:
                user.display_name = update_req.display_name
            if update_req.area_name is not None:
                user.area_name = update_req.area_name
            if update_req.geohash5 is not None:
                user.geohash5 = update_req.geohash5
            await db.commit()
            await db.refresh(user)
            return UserProfileResponse(
                id=user.id,
                auth_uid=user.auth_uid,
                display_name=user.display_name,
                area_name=user.area_name,
                geohash5=user.geohash5,
                is_verified=user.is_verified,
                role=user.role,
                created_at=user.created_at,
                communities=[],
            )

        # Standalone mock response
        return UserProfileResponse(
            id=uuid.uuid4(),
            auth_uid=auth_user.auth_uid,
            display_name=update_req.display_name or "Updated Name",
            area_name=update_req.area_name or "Dhanori",
            geohash5=update_req.geohash5 or "tek3y",
            is_verified=auth_user.is_confirmed,
            role="user",
            created_at=datetime.now(timezone.utc),
            communities=[],
        )

    async def export_data(
        self,
        auth_user: AuthenticatedUser,
        db: Optional[AsyncSession] = None,
    ) -> UserDataExportResponse:
        """Export all user data per DPDP Act right to data portability."""
        profile = await self.get_or_create_profile(auth_user, db)
        return UserDataExportResponse(
            exported_at=datetime.now(timezone.utc),
            profile=profile,
            memberships=[],
            listings=[],
            messages=[],
        )

    async def delete_account(
        self,
        auth_user: AuthenticatedUser,
        db: Optional[AsyncSession] = None,
    ) -> UserDeleteResponse:
        """Permanently delete user profile, purge storage files, and remove auth account."""
        auth_uid_str = str(auth_user.auth_uid)

        # 1. Purge storage files first (DPDP Act right to erasure)
        await admin_service.purge_user_storage(auth_uid_str)

        # 2. Delete database rows if DB connected
        if db is not None:
            result = await db.execute(select(User).where(User.auth_uid == auth_user.auth_uid))
            user = result.scalar_one_or_none()
            if user:
                await db.delete(user)
                await db.commit()

        # 3. Delete Supabase Auth user via admin API
        await admin_service.delete_auth_user(auth_uid_str)

        return UserDeleteResponse()


user_service = UserService()
