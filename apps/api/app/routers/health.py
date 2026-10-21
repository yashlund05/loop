# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Health check router."""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["Health"])


class HealthResponse(BaseModel):
    status: str


@router.get("/health", response_model=HealthResponse)
async def get_health() -> HealthResponse:
    """Return system health status."""
    return HealthResponse(status="healthy")
