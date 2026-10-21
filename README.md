# LOOP: Hyperlocal AI Reuse Marketplace

LOOP is a hyperlocal marketplace for campus communities to sell, donate, and swap pre-owned goods across Electronics, Furniture, Books, and Hobbies with explainable, privacy-preserving AI assistance.

---

## Prerequisites: Hosted Supabase Dev Project

Development uses a dedicated, free-tier hosted Supabase project populated strictly with synthetic/seed data (no local Docker or WSL installation required):

1. Create a free account at [supabase.com](https://supabase.com) and create a project (e.g., `loop-dev`).
2. Go to **Project Settings $\rightarrow$ API** to copy your `Project URL`, `anon` key, and `service_role` key.
3. Go to **Project Settings $\rightarrow$ Database** to copy your PostgreSQL connection string.
4. Ensure no production or personal data is stored in the development project.

---

## Quickstart (Under 10 Commands)

Local development runs directly on native Python and Node.js without requiring Docker or WSL:

```bash
# 1. Clone repository and enter directory
git clone https://github.com/loop-marketplace/loop.git && cd loop

# 2. Copy environment template and fill in hosted Supabase credentials
cp .env.example .env

# 3. Create and activate Python 3.11 virtual environment for API
python3.11 -m venv apps/api/.venv && source apps/api/.venv/bin/activate  # Windows: apps\api\.venv\Scripts\activate

# 4. Install backend dependencies
pip install -r apps/api/requirements.txt

# 5. Run database migrations against your hosted dev project
cd apps/api && alembic upgrade head && cd ../..

# 6. Install frontend dependencies
npm --prefix apps/web ci

# 7. Start FastAPI backend (runs at http://localhost:8000)
cd apps/api && uvicorn app.main:app --reload --port 8000

# 8. In a separate terminal, start Next.js web frontend (runs at http://localhost:3000)
npm --prefix apps/web run dev
```

> **Note on Docker:** Docker and WSL are completely optional for local development. Docker images and container healthchecks are automatically built and smoke-tested on every push via GitHub Actions CI (`docker-compose-test` job). If you have Docker installed and prefer containerized workflows, you can optionally run `docker compose up`.

---

## Testing & Verification

```bash
# Run backend tests
cd apps/api && pytest -v

# Run frontend build & linting
npm --prefix apps/web run lint && npm --prefix apps/web run build
```

---

## License & Third-Party Attributions

All proprietary code is Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
Third-party permissive licenses and attributions are cataloged in [`THIRD_PARTY_LICENSES.md`](./THIRD_PARTY_LICENSES.md).
Security exceptions are documented in [`docs/SECURITY_EXCEPTIONS.md`](./docs/SECURITY_EXCEPTIONS.md).
