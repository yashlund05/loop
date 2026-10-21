# Phase 1: Foundation and Tooling Implementation Plan (Approved)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Establish a runnable monorepo with a FastAPI backend (`/health`), Next.js App Router PWA skeleton, Docker Compose configuration (web + api only), Alembic migration tooling, linters/type-checkers, pre-commit with copyright verification, GitHub Actions CI, legal docs, pinned lockfiles, and a concise setup README.

**Architecture:** Monorepo hosting `apps/api` (FastAPI, Python 3.11) and `apps/web` (Next.js, TypeScript, Tailwind PWA), containerized via `docker-compose.yml` (web and api only; local Supabase managed via Supabase CLI per `docs/ARCHITECTURE.md` §8), schema migrations via Alembic, automated CI via GitHub Actions, and strict pre-commit hooks enforcing formatting, linting, and copyright headers.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, pytest, ruff, black, mypy, Node.js 22, Next.js (App Router), TypeScript, Tailwind CSS, ESLint, Prettier, Docker Compose, GitHub Actions.

---

### Approved Parameters & Constraints

1. **Copyright Header Format:**
   `Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.`
2. **Docker Compose:**
   Compose contains `web` and `api` only. No hand-written Supabase services. Local Supabase is managed via Supabase CLI (`supabase init` / `supabase start`) and configured through `.env.example`.
3. **Docker CLI Availability:**
   If Docker is unavailable in the environment, report "docker compose up serves web and API" as **NOT VERIFIED** (needs manual action) and validate compose syntax via `docker compose config` if available.
4. **Licensing & Pinning:**
   Pin all dependency versions in lockfiles (`requirements.txt` / `package-lock.json`). Log every runtime dependency and licence in `THIRD_PARTY_LICENSES.md`. Strict prohibition against AGPL/GPL packages.
5. **Git Hygiene:**
   Maintain a strict `.gitignore` preventing commits of `.env`, `node_modules`, `__pycache__`, datasets, and models.
6. **Superpowers Log:**
   Document Superpowers in `THIRD_PARTY_LICENSES.md` and explicitly flag `ayush-frontend` and `single-flow-task-execution` as skills found in `.agent/` with unknown source for user review.
7. **Review Gates:**
   - Review Gate 1: After Task 4 (Frontend skeleton).
   - Review Gate 2: After Task 8 (Verification & completion).

---

### Roadmap Acceptance Checks to Verify

1. `docker compose up` configuration serves web and API: verified via GitHub Actions CI job `docker-compose-test` (builds images, starts containers, and verifies HTTP 200 on `/health` and `/`); Docker/WSL is optional locally.
2. `GET /health` returns HTTP 200 `{"status": "healthy"}`.
3. CI is green on an empty/baseline test suite: **PARTIAL** (local equivalents passed; GitHub Actions run pending owner push of the branch).
4. README explains local setup in under 10 commands (including Supabase CLI).
5. All new source files contain the required copyright header.
6. `THIRD_PARTY_LICENSES.md` logs all runtime dependencies and Superpowers skills.

---

## Tasks

### Task 0: Comprehensive .gitignore

- Prevent committing `.env`, `node_modules`, `__pycache__`, `.pytest_cache`, `.next`, `dist`, `ml/data/` (except manifests), and weights.

### Task 1: Repository Structure & Legal Foundation Files

- Create directory layout per `AGENTS.md` §4.
- Create `LICENSE` ("All rights reserved" placeholder).
- Create `NOTICE`.
- Create `THIRD_PARTY_LICENSES.md` logging runtime dependencies and Superpowers skills (with unknown source flags).

### Task 2: Backend Skeleton (`apps/api`), `/health` Endpoint & Tests

- TDD Red-Green: Failing test for `/health` first.
- Implement FastAPI app, config, router, and schemas.
- Pinned requirements lockfile.
- Verify tests pass with `py -3.11 -m pytest`.

### Task 3: Alembic Database Migrations Setup (`apps/api`)

- Alembic configuration dynamically reading `DATABASE_URL` from settings.
- Verify configuration.

### Task 4: Frontend Skeleton (`apps/web`), Tailwind CSS & PWA Manifest

- Next.js App Router, TypeScript, Tailwind CSS.
- PWA manifest (`manifest.webmanifest` / `app/manifest.ts`).
- Mobile-first responsive layout (360px viewport).
- Pinned `package-lock.json`.
- Verify build / lint / type-check.
- **[STOP FOR REVIEW GATE 1]**

### Task 5: Linters, Formatters, Type-checkers & Copyright Pre-Commit Hook

- Ruff, black, mypy configuration.
- ESLint, Prettier configuration.
- Copyright header check script (`scripts/check_copyright_headers.py`).
- `.pre-commit-config.yaml`.

### Task 6: Docker Compose & Environment Configuration

- `.env.example` (web, api, supabase variables).
- `Dockerfile` for API (Python 3.11) and Web (Node 22 multi-stage).
- `docker-compose.yml` (web and api services only).

### Task 7: GitHub Actions CI Pipeline & Setup README (< 10 Commands)

- `.github/workflows/ci.yml`.
- `README.md` with < 10 commands setup including Supabase CLI.

### Task 8: Verification of Acceptance Checks & Reporting

- Execute linting, typing, tests, copyright check.
- Compile acceptance report.
- **[STOP FOR REVIEW GATE 2]**
