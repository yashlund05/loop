# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Multi-tenant Row Level Security (RLS) isolation integration test.

Roadmap Acceptance Check:
- RLS test proves user A cannot read user B's private rows.
- Test connects as 'authenticated' role with request.jwt.claims set.
- Runs against live dev DB when reachable with two synthetic test users.
- Clean up guaranteed in a finally block.
"""

import uuid

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings


@pytest.mark.asyncio
async def test_rls_isolation_between_authenticated_users() -> None:
    settings = get_settings()
    db_url = settings.database_url

    engine = create_async_engine(db_url, echo=False)

    try:
        async with engine.connect() as conn:
            # Check connection
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        pytest.skip(
            f"Hosted Supabase PostgreSQL unreachable ({type(exc).__name__}); "
            "marked as unit-tested with mocks until real-database run passes."
        )

    user_a_id = uuid.uuid4()
    user_a_auth = uuid.uuid4()
    user_b_id = uuid.uuid4()
    user_b_auth = uuid.uuid4()

    try:
        async with engine.begin() as conn:
            # 1. Insert synthetic test users as postgres admin
            insert_stmt = text("""
                INSERT INTO users
                (id, auth_uid, display_name, area_name, geohash5, is_verified, role)
                VALUES
                (:id_a, :auth_a, 'Synthetic User A', 'Lohegaon', 'tek3z', false, 'user'),
                (:id_b, :auth_b, 'Synthetic User B', 'Dhanori', 'tek3y', false, 'user')
                ON CONFLICT (auth_uid) DO NOTHING
                """)
            await conn.execute(
                insert_stmt,
                {
                    "id_a": user_a_id,
                    "auth_a": user_a_auth,
                    "id_b": user_b_id,
                    "auth_b": user_b_auth,
                },
            )

            # 2. Simulate User A session as 'authenticated' role
            await conn.execute(text("SET LOCAL ROLE authenticated"))
            await conn.execute(text(f"SET LOCAL \"request.jwt.claim.sub\" = '{user_a_auth}'"))
            await conn.execute(
                text(
                    'SET LOCAL "request.jwt.claims" = '
                    f'\'{{"sub": "{user_a_auth}", "role": "authenticated"}}\''
                )
            )

            # User A should be able to read their own profile
            query_stmt = text("SELECT id, display_name FROM users WHERE auth_uid = :uid")
            res_a = await conn.execute(query_stmt, {"uid": user_a_auth})
            rows_a = res_a.fetchall()
            assert len(rows_a) == 1, "User A must be able to read their own row under RLS"

            # 3. Simulate User B session attempting to access User A's row
            await conn.execute(text(f"SET LOCAL \"request.jwt.claim.sub\" = '{user_b_auth}'"))
            await conn.execute(
                text(
                    'SET LOCAL "request.jwt.claims" = '
                    f'\'{{"sub": "{user_b_auth}", "role": "authenticated"}}\''
                )
            )

            # User B must NOT be able to read User A's profile
            res_b = await conn.execute(query_stmt, {"uid": user_a_auth})
            rows_b = res_b.fetchall()
            assert (
                len(rows_b) == 0
            ), "RLS Isolation Breach: User B was able to read User A's private row!"

            # User B must NOT be able to update User A's profile
            await conn.execute(
                text("UPDATE users SET display_name = 'Hacked' WHERE auth_uid = :uid"),
                {"uid": user_a_auth},
            )

            # Reset back to table owner / superuser to verify row was unmodified
            await conn.execute(text("RESET ROLE"))
            verify_res = await conn.execute(
                text("SELECT display_name FROM users WHERE auth_uid = :uid"),
                {"uid": user_a_auth},
            )
            unmodified_row = verify_res.fetchone()
            assert unmodified_row is not None
            assert (
                unmodified_row[0] == "Synthetic User A"
            ), "RLS Breach: User B modified User A's row!"

    finally:
        # Guaranteed cleanup in finally block
        try:
            async with engine.begin() as conn:
                await conn.execute(text("RESET ROLE"))
                await conn.execute(
                    text("DELETE FROM users WHERE auth_uid IN (:auth_a, :auth_b)"),
                    {"auth_a": user_a_auth, "auth_b": user_b_auth},
                )
        except Exception:
            pass
        await engine.dispose()
