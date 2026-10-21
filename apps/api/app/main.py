# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Main entry point for LOOP FastAPI service."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, health, users


def create_app() -> FastAPI:
    """FastAPI application factory."""
    application = FastAPI(
        title=settings.app_name,
        description="LOOP Hyperlocal AI Reuse Marketplace API",
        version="0.1.0",
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(health.router)
    application.include_router(auth.router, prefix="/api/v1")
    application.include_router(users.router, prefix="/api/v1")

    return application


app = create_app()
