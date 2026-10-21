# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Create identity tables (users, communities, memberships) with Row Level Security.

Revision ID: 0001_identity_and_rls
Revises:
Create Date: 2026-10-22
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_identity_and_rls"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("auth_uid", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=100), nullable=False),
        sa.Column("area_name", sa.String(length=100), nullable=False),
        sa.Column("geohash5", sa.String(length=5), nullable=False),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "trust_score",
            sa.Numeric(precision=4, scale=2),
            nullable=False,
            server_default=sa.text("0.0"),
        ),
        sa.Column("role", sa.String(length=20), nullable=False, server_default=sa.text("'user'")),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_users_auth_uid", "users", ["auth_uid"], unique=True)

    # 2. Create communities table
    op.create_table(
        "communities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("email_domain", sa.String(length=100), nullable=True),
        sa.Column("join_code_hash", sa.String(length=128), nullable=True),
    )

    # 3. Create memberships table
    op.create_table(
        "memberships",
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "community_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("communities.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "verified_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    # 4. Enable Row Level Security (RLS) on all three tables
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE communities ENABLE ROW LEVEL SECURITY;")
    op.execute("ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;")

    # 5. RLS Policies
    # Users policies
    op.execute("""
        CREATE POLICY "Users public profile viewable by authenticated users"
        ON users FOR SELECT
        USING (auth.role() = 'authenticated');
    """)
    op.execute("""
        CREATE POLICY "Users can insert their own profile"
        ON users FOR INSERT
        WITH CHECK (auth.uid() = auth_uid);
    """)
    op.execute("""
        CREATE POLICY "Users can update their own profile"
        ON users FOR UPDATE
        USING (auth.uid() = auth_uid);
    """)
    op.execute("""
        CREATE POLICY "Users can delete their own profile"
        ON users FOR DELETE
        USING (auth.uid() = auth_uid);
    """)

    # Communities policies
    op.execute("""
        CREATE POLICY "Communities viewable by authenticated users"
        ON communities FOR SELECT
        USING (auth.role() = 'authenticated');
    """)

    # Memberships policies
    op.execute("""
        CREATE POLICY "Memberships viewable by owning user"
        ON memberships FOR SELECT
        USING (auth.uid() IN (SELECT auth_uid FROM users WHERE id = user_id));
    """)
    op.execute("""
        CREATE POLICY "Memberships creatable by owning user"
        ON memberships FOR INSERT
        WITH CHECK (auth.uid() IN (SELECT auth_uid FROM users WHERE id = user_id));
    """)
    op.execute("""
        CREATE POLICY "Memberships deletable by owning user"
        ON memberships FOR DELETE
        USING (auth.uid() IN (SELECT auth_uid FROM users WHERE id = user_id));
    """)


def downgrade() -> None:
    op.drop_table("memberships")
    op.drop_table("communities")
    op.drop_index("ix_users_auth_uid", table_name="users")
    op.drop_table("users")
