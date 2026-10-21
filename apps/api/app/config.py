# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Application configuration settings."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LOOP API"
    environment: str = "development"
    debug: bool = True
    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
