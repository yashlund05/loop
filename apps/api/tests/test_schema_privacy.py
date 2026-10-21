# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for schema privacy invariants: no exact address fields and hashed secrets."""

from app.models.identity import Community, Membership, User


def test_no_exact_address_fields() -> None:
    """Verify that no identity table stores exact addresses or coordinates."""
    prohibited_substrings = [
        "address",
        "street",
        "house",
        "postal",
        "pincode",
        "pin_code",
        "zip",
        "flat",
        "apartment",
        "exact",
    ]

    models = [User, Community, Membership]
    for model in models:
        for column_name in model.__table__.columns.keys():
            for prohibited in prohibited_substrings:
                assert (
                    prohibited not in column_name.lower()
                ), f"Prohibited address field '{column_name}' found in model {model.__name__}"


def test_coarse_location_fields_exist() -> None:
    """Verify that only coarse location fields exist on User."""
    user_columns = User.__table__.columns.keys()
    assert "area_name" in user_columns
    assert "geohash5" in user_columns

    geohash_col = User.__table__.columns["geohash5"]
    assert geohash_col.type.length == 5, "geohash5 length must be exactly 5"


def test_community_join_code_is_hashed() -> None:
    """Verify that Community stores join_code_hash and never plaintext join_code."""
    community_columns = Community.__table__.columns.keys()
    assert "join_code_hash" in community_columns
    assert "join_code" not in community_columns, "Plaintext join_code must not exist in schema"
