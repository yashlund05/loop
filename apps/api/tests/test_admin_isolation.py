# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Test ensuring service role key and admin service are strictly isolated.

Roadmap Acceptance Check:
- Service role key is isolated to admin_service.py and never imported into normal request paths.
- No module in app/routers/ may import app.services.admin_service or reference the service role key.
"""

import ast
from pathlib import Path


def test_admin_service_not_imported_in_routers() -> None:
    """Ensure no router module imports admin_service."""
    routers_dir = Path(__file__).resolve().parent.parent / "app" / "routers"
    router_files = list(routers_dir.glob("*.py"))
    assert len(router_files) > 0, "Router files should exist"

    for file_path in router_files:
        tree = ast.parse(file_path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    assert (
                        "admin_service" not in alias.name
                    ), f"Forbidden import of admin_service in {file_path.name}"
            elif isinstance(node, ast.ImportFrom):
                module = node.module or ""
                assert (
                    "admin_service" not in module
                ), f"Forbidden import from admin_service in {file_path.name}"
                for alias in node.names:
                    assert (
                        "admin_service" not in alias.name
                    ), f"Forbidden import of admin_service symbol in {file_path.name}"


def test_service_role_key_reference_isolated() -> None:
    """Ensure supabase_service_role_key is only accessed in admin_service.py or config.py."""
    app_dir = Path(__file__).resolve().parent.parent / "app"
    allowed_files = {"config.py", "admin_service.py"}

    for file_path in app_dir.rglob("*.py"):
        if file_path.name in allowed_files:
            continue
        content = file_path.read_text(encoding="utf-8")
        assert (
            "supabase_service_role_key" not in content
        ), f"Forbidden reference to supabase_service_role_key in {file_path.relative_to(app_dir)}"
