# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Isolated administrative service for Supabase service-role actions.

CRITICAL SECURITY REQUIREMENT:
- This module is the ONLY module permitted to reference supabase_service_role_key.
- Used strictly by DELETE /users/me (account deletion + storage purge) and test fixtures.
- Never log or expose secrets, service role keys, or credentials.
"""

import logging
from typing import Any, Optional, cast

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class SupabaseAdminService:
    """Administrative service interacting with Supabase Admin Auth & Storage APIs."""

    def __init__(self) -> None:
        self.settings = get_settings()

    def _get_headers(self) -> dict[str, str]:
        # Uses service_role_key strictly for administrative tasks
        key = self.settings.supabase_service_role_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

    async def purge_user_storage(self, auth_uid: str) -> None:
        """Purge all storage files and assets belonging to the user.

        Hook for DPDP Act right to erasure compliance across all buckets.
        """
        if not self.settings.supabase_url or not self.settings.supabase_service_role_key:
            logger.info("Storage purge hook invoked for user [SCRUBBED] (offline/mock mode)")
            return

        buckets = ["avatars", "listing-images"]
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            for bucket in buckets:
                try:
                    # List files in the user's folder
                    list_url = f"{self.settings.supabase_url}/storage/v1/object/list/{bucket}"
                    res = await client.post(
                        list_url,
                        headers=headers,
                        json={"prefix": f"{auth_uid}/", "limit": 100},
                    )
                    if res.status_code == 200:
                        files = res.json()
                        file_paths = [f"{auth_uid}/{f['name']}" for f in files if "name" in f]
                        if file_paths:
                            delete_url = f"{self.settings.supabase_url}/storage/v1/object/{bucket}"
                            await client.request(
                                "DELETE",
                                delete_url,
                                headers=headers,
                                json={"prefixes": file_paths},
                            )
                except Exception as exc:
                    logger.warning(
                        "Error during storage purge for user [SCRUBBED] in bucket %s: %s",
                        bucket,
                        type(exc).__name__,
                    )

    async def delete_auth_user(self, auth_uid: str) -> bool:
        """Permanently delete a user from Supabase Auth via Admin API."""
        if not self.settings.supabase_url or not self.settings.supabase_service_role_key:
            logger.info("Mock delete auth user [SCRUBBED]")
            return True

        admin_url = f"{self.settings.supabase_url}/auth/v1/admin/users/{auth_uid}"
        headers = self._get_headers()

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.delete(admin_url, headers=headers)
            return res.status_code in (200, 204)

    async def delete_user_completely(self, auth_uid: str) -> bool:
        """Purge storage files and delete auth account."""
        await self.purge_user_storage(auth_uid)
        return await self.delete_auth_user(auth_uid)

    async def create_test_auth_user(
        self, email: str, password: str, email_confirm: bool = True
    ) -> Optional[dict[str, Any]]:
        """Create a synthetic test user via Supabase Admin API (for test fixtures only)."""
        if not self.settings.supabase_url or not self.settings.supabase_service_role_key:
            return None

        admin_url = f"{self.settings.supabase_url}/auth/v1/admin/users"
        headers = self._get_headers()
        payload = {
            "email": email,
            "password": password,
            "email_confirm": email_confirm,
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(admin_url, headers=headers, json=payload)
            if res.status_code in (200, 201):
                return cast(dict[str, Any], res.json())
            return None


admin_service = SupabaseAdminService()
