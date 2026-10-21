# Phase 3: Auth, Profiles and Community Verification Implementation Plan (Approved)

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement Supabase Auth integration, user profiles with coarse location privacy, community verification (confirmed college email domain or hashed join code with rate limiting), account export/deletion (DPDP Act aligned with storage purge hook), Row Level Security policies, and mobile-first frontend pages.

**Architecture:**

- Database: Alembic migration creating `users`, `communities`, and `memberships` tables with PostgreSQL Row Level Security (RLS) enabled. Join codes are stored strictly as salted/hashed values, never in plaintext.
- API: FastAPI routers (`/api/v1/auth` and `/api/v1/users`). Request handlers execute strictly under the authenticated user's JWT context. The `service_role` key is isolated to a dedicated admin service (`app/services/admin_service.py`), strictly restricted to `DELETE /users/me` and test fixtures. A static lint test verifies no standard request router imports the admin service.
- Privacy & Location: Enforce coarse location only (`area_name` and `geohash5` with precision <= 5); exact address fields are strictly prohibited across all schemas.
- Verification Logic: Community email verification verifies that the email is CONFIRMED in Supabase Auth before granting verification. Join code attempts are rate-limited to 5 failures per hour per user.
- Frontend: Lean, accessible, mobile-first Next.js PWA pages for Sign-up, Sign-in, DPDP Consent, and Profile/Community Verification.

**Tech Stack:** Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Supabase Auth / PyJWT, Next.js 15, Tailwind CSS v4, pytest, pre-commit.

---

### Approved Parameters & Constraints

1. **Seed Community:**
   - Name: `Ajeenkya D Y Patil University`
   - Type: `college`
   - Allowed Domain: `adypu.edu.in`
   - Demo Join Code: `LOOP-DEMO-2026` (stored hashed in DB, read from `SEED_JOIN_CODE` in `.env`, never committed).
2. **Email Confirmation Requirement:**
   - Email domain verification requires that the user's email is confirmed in Supabase Auth (`email_confirmed_at is not None`). Plain input email text alone is never trusted.
3. **Rate Limiting:**
   - Maximum 5 failed join-code attempts per hour per user on `/auth/verify-community`. Returns 429 Too Many Requests when exceeded.
4. **Service Role Key Isolation:**
   - Single isolated module: `app/services/admin_service.py`.
   - Used only by `DELETE /users/me` (account purge) and test fixtures.
   - Enforced by automated test ensuring no request router imports it.
5. **Storage Cleanup on Delete:**
   - `DELETE /users/me` includes a hook to purge all user-associated files in storage buckets before account removal.
6. **Secret Hygiene:**
   - Passwords, JWTs, API keys, and join codes are never printed or logged.
7. **Review Gates:**
   - Review Gate 1: After Task 3 (Auth & Community Verification).
   - Review Gate 2: After Task 7 (Full verification & acceptance report).

---

### Roadmap Acceptance Checks to Verify

1. **Anonymous requests to protected routes return HTTP 401 Unauthorized.**
2. **Wrong join code is rejected** (HTTP 400), and rate-limited after 5 failed attempts (HTTP 429).
3. **Unconfirmed email on college domain is rejected** (requires confirmed email).
4. **No exact-address field exists in the schema** (verified via schema reflection test).
5. **Deleting a user removes user data and invokes storage purge.**
6. **RLS test proves user A cannot read user B's private rows.**
7. **Service role key is isolated and never imported into normal request paths.**
8. **Tests run against synthetic test users and clean up after themselves.**

---

## Tasks

### Task 1: Alembic Migration for Identity Tables & RLS

**Files:**

- Create: `apps/api/app/models/identity.py`
- Create: `apps/api/alembic/versions/0001_identity_and_rls.py`
- Create: `apps/api/tests/test_schema_privacy.py`

**Steps:**

- Define SQLAlchemy models for `users`, `communities`, `memberships` (with join code hash).
- Write migration with RLS enabled on all three tables and policies defined.
- Test that no exact-address fields exist in models or tables.
- Verify migration via `alembic upgrade head --sql`.
- Commit.

### Task 2: Supabase JWT Dependency, Rate Limiter & Admin Isolation

**Files:**

- Create: `apps/api/app/dependencies/auth.py`
- Create: `apps/api/app/services/admin_service.py`
- Create: `apps/api/app/services/rate_limiter.py`
- Create: `apps/api/tests/test_auth_guard.py`
- Create: `apps/api/tests/test_admin_isolation.py`

**Steps:**

- TDD: Test anonymous request to protected route returns 401.
- TDD: Test that verifies no file in `apps/api/app/routers` imports `admin_service`.
- Implement JWT decode and current user dependency using public key / JWT secret.
- Implement in-memory/cache rate limiter for join code attempts.
- Commit.

### Task 3: Auth Endpoints & Community Verification

**Files:**

- Create: `apps/api/app/routers/auth.py`
- Create: `apps/api/app/services/auth_service.py`
- Create: `apps/api/app/schemas/auth.py`
- Create: `apps/api/tests/test_community_verification.py`

**Steps:**

- TDD: Write tests for community verification:
  - Confirmed college email -> success and verified badge.
  - Unconfirmed college email -> 400 error requiring email confirmation.
  - Valid join code -> success and verified badge.
  - Invalid join code -> 400 error.
  - 5 failed join-code attempts -> 429 Too Many Requests.
- Implement `/auth/register`, `/auth/login`, `/auth/refresh`, and `/auth/verify-community`.
- Mount router in `apps/api/app/main.py`.
- **[STOP FOR REVIEW GATE 1]**

### Task 4: User Profile, Export & Deletion with Storage Hook

**Files:**

- Create: `apps/api/app/routers/users.py`
- Create: `apps/api/app/schemas/users.py`
- Create: `apps/api/tests/test_users_lifecycle.py`

**Steps:**

- TDD: Test profile retrieval, coarse geohash validation (length <= 5), data export, and deletion.
- Implement `/users/me` GET/PATCH, `/users/me/export`, and `/users/me` DELETE.
- Wire storage purge hook into deletion flow.
- Commit.

### Task 5: RLS Multi-Tenant Privacy Isolation Test

**Files:**

- Create: `apps/api/tests/test_rls_isolation.py`

**Steps:**

- Synthetic test fixtures creating User A and User B.
- Test verifies User A cannot access or mutate User B's private data via database policies.
- Teardown fixture cleans up all synthetic users.
- Commit.

### Task 6: Mobile-First Frontend Pages (Sign-up, Login, Consent, Profile)

**Files:**

- Create: `apps/web/app/login/page.tsx`
- Create: `apps/web/app/register/page.tsx`
- Create: `apps/web/app/consent/page.tsx`
- Create: `apps/web/app/profile/page.tsx`
- Create: `apps/web/components/VerifiedBadge.tsx`

**Steps:**

- Implement responsive, mobile-first pages with accessibility down to 360px viewport.
- Verify with `npm run type-check`, `npm run lint`, and `npm run build`.
- Commit.

### Task 7: Full Verification, Security Audits & Acceptance Report

**Steps:**

- Run pre-commit, linters, mypy strict, pytest.
- Run pip-audit and production npm audit.
- Compile acceptance check evidence report.
- **[STOP FOR REVIEW GATE 2]**
