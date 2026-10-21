# Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
"""Script to verify and enforce copyright headers on all source files."""

import sys
from pathlib import Path

REQUIRED_NOTICE = "Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved."

COMMENT_PATTERNS = {
    ".py": ("#", "#"),
    ".sh": ("#", "#"),
    ".ts": ("//", "/*"),
    ".tsx": ("//", "/*"),
    ".js": ("//", "/*"),
    ".mjs": ("//", "/*"),
    ".css": ("/*", "/*"),
}

EXCLUDED_DIRS = {
    ".git",
    ".venv",
    ".agent",
    "node_modules",
    ".next",
    "dist",
    "build",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
}

EXCLUDED_FILES = {
    "next-env.d.ts",
}


def check_file(path: Path) -> bool:
    """Check if a file contains the required copyright notice in the first 5 lines."""
    try:
        content = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return True

    lines = content.splitlines()[:5]
    for line in lines:
        if REQUIRED_NOTICE in line:
            return True
    return False


def main() -> int:
    files_to_check = sys.argv[1:]

    if not files_to_check:
        root = Path.cwd()
        all_candidates = []
        for ext in COMMENT_PATTERNS:
            all_candidates.extend(root.rglob(f"*{ext}"))
        files_to_check = [str(f) for f in all_candidates]

    missing = []
    for file_str in files_to_check:
        path = Path(file_str)
        if not path.is_file():
            continue

        if any(part in EXCLUDED_DIRS for part in path.parts):
            continue

        if path.name in EXCLUDED_FILES:
            continue

        if path.suffix in COMMENT_PATTERNS:
            if not check_file(path):
                missing.append(path)

    if missing:
        print("ERROR: Missing copyright header in:")
        for p in missing:
            print(f"  - {p}")
        print(f"\nRequired notice:\n  {REQUIRED_NOTICE}")
        return 1

    print("All checked files contain valid copyright headers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
