# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Tests for schema privacy invariants: exact deny-list of prohibited address columns
and hashed secrets.
"""

from app.models.identity import Community, Membership, User

# Exact deny-list of prohibited column names
PROHIBITED_EXACT_COLUMNS = {
    "address",
    "street",
    "street_address",
    "street_name",
    "house_number",
    "house_no",
    "door_no",
    "flat_no",
    "apartment",
    "building",
    "room_no",
    "postal_code",
    "pincode",
    "pin_code",
    "zip",
    "zip_code",
    "exact_location",
    "latitude",
    "longitude",
    "lat",
    "lng",
    "coordinates",
    "gps",
    "join_code",
}


def test_exact_deny_list_columns_not_present() -> None:
    """Verify that no identity table contains any exact deny-listed columns."""
    models = [User, Community, Membership]
    for model in models:
        for column_name in model.__table__.columns.keys():
            normalized_name = column_name.lower().strip()
            assert (
                normalized_name not in PROHIBITED_EXACT_COLUMNS
            ), f"Prohibited column '{column_name}' found in model {model.__name__}"


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
