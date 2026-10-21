# LOOP: Hyperlocal AI Reuse Marketplace

LOOP is a hyperlocal marketplace for campus communities to sell, donate, and swap pre-owned goods across Electronics, Furniture, Books, and Hobbies with explainable, privacy-preserving AI assistance.

---

## Quickstart (Under 10 Commands)

Follow these steps to run the complete local development environment:

```bash
# 1. Clone the repository and enter directory
git clone https://github.com/loop-marketplace/loop.git && cd loop

# 2. Copy the environment configuration template
cp .env.example .env

# 3. Initialize and start local Supabase services (Auth, Postgres, Storage)
supabase init && supabase start

# 4. Create and activate Python 3.11 virtual environment for API
python3.11 -m venv apps/api/.venv && source apps/api/.venv/bin/activate  # on Windows: apps/api/.venv/Scripts/activate

# 5. Install backend dependencies and run database migrations
pip install -r apps/api/requirements.txt && cd apps/api && alembic upgrade head && cd ../..

# 6. Install frontend dependencies
npm --prefix apps/web ci

# 7. Start both services via Docker Compose (or run individually)
docker compose up
```

To run without Docker:

- API: `cd apps/api && uvicorn app.main:app --reload --port 8000`
- Web: `npm --prefix apps/web run dev`

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
