# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Application configuration settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "LOOP API"
    environment: str = "development"
    debug: bool = True
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:54322/postgres"

    # Supabase configuration
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = "dev-jwt-secret-do-not-use-in-production-needs-32-chars"
    supabase_service_role_key: str = ""

    # Identity and community verification settings
    seed_join_code: str = "LOOP-DEMO-2026"
    college_domain: str = "adypu.edu.in"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
