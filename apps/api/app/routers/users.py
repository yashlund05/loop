# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""User profile and DPDP Act endpoints router."""

from fastapi import APIRouter, Depends

from app.dependencies.auth import AuthenticatedUser, get_current_user
from app.schemas.user import (
    UserDataExportResponse,
    UserDeleteResponse,
    UserProfileResponse,
    UserUpdateRequest,
)
from app.services.user_service import user_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
async def get_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    return await user_service.get_or_create_profile(current_user)


@router.patch(
    "/me",
    response_model=UserProfileResponse,
    summary="Update coarse location and display name",
)
async def update_me(
    update_req: UserUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserProfileResponse:
    return await user_service.update_profile(current_user, update_req)


@router.get(
    "/me/export",
    response_model=UserDataExportResponse,
    summary="Export all personal data per DPDP Act",
)
async def export_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserDataExportResponse:
    return await user_service.export_data(current_user)


@router.delete(
    "/me",
    response_model=UserDeleteResponse,
    summary="Permanently delete account and purge stored files",
)
async def delete_me(
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> UserDeleteResponse:
    return await user_service.delete_account(current_user)
