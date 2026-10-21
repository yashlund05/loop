# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Pydantic schemas for user profile management, DPDP Act export, and account deletion."""

import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserProfileResponse(BaseModel):
    id: uuid.UUID
    auth_uid: uuid.UUID
    display_name: str
    area_name: str
    geohash5: str
    is_verified: bool
    role: str
    created_at: datetime
    communities: list[dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)


class UserUpdateRequest(BaseModel):
    display_name: Optional[str] = Field(None, min_length=2, max_length=100)
    area_name: Optional[str] = Field(None, min_length=2, max_length=100)
    geohash5: Optional[str] = Field(None, min_length=5, max_length=5)

    @field_validator("geohash5")
    @classmethod
    def validate_geohash5(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if len(v) != 5:
                raise ValueError("geohash5 must have precision length of exactly 5")
            return v.lower()
        return v


class UserDataExportResponse(BaseModel):
    exported_at: datetime
    profile: UserProfileResponse
    memberships: list[dict[str, Any]] = []
    listings: list[dict[str, Any]] = []
    messages: list[dict[str, Any]] = []


class UserDeleteResponse(BaseModel):
    status: str = "account_deleted"
    detail: str = "Account data and storage files have been permanently erased per DPDP Act."
