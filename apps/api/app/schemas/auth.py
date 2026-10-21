# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Pydantic schemas for authentication and community verification."""

import uuid
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


class RegisterRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=2, max_length=100)
    area_name: str = Field(min_length=2, max_length=100)
    geohash5: str = Field(min_length=5, max_length=5)

    @field_validator("geohash5")
    @classmethod
    def validate_geohash5(cls, v: str) -> str:
        if len(v) != 5:
            raise ValueError("geohash5 must have precision length of exactly 5")
        return v.lower()


class LoginRequest(BaseModel):
    email: str = Field(min_length=5, max_length=255, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class AuthUserResponse(BaseModel):
    id: uuid.UUID
    auth_uid: uuid.UUID
    display_name: str
    area_name: str
    geohash5: str
    is_verified: bool
    role: str

    model_config = ConfigDict(from_attributes=True)


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: AuthUserResponse


class VerifyCommunityRequest(BaseModel):
    method: str = Field(
        ...,
        description="Verification method: 'email_domain' or 'join_code'",
        pattern="^(email_domain|join_code)$",
    )
    join_code: Optional[str] = None
    community_id: Optional[uuid.UUID] = None


class VerifyCommunityResponse(BaseModel):
    is_verified: bool
    community_id: uuid.UUID
    community_name: str
    verification_method: str
