# ARCHITECTURE: LOOP

## 1. Design principles

1. Every AI output is editable and explained.
2. Every model has a low-confidence fallback.
3. Photos are quality-checked and scrubbed **on-device before upload**; the server re-verifies.
4. Heavy inference is asynchronous; light inference is on-device or small ONNX on CPU.
5. Coarse location only; minimal personal data.
6. Keep infrastructure small: Supabase + one FastAPI service + static frontend.

## 2. System diagram

```
┌─────────────────────────── Browser (Next.js PWA) ───────────────────────────┐
│ UI  │ onnxruntime-web: photo-quality model + scrubber (face/plate/ID detector)│
│     │ OCR (tesseract.js or small ONNX OCR) for phone numbers / addresses      │
└───────────────┬──────────────────────────────────────────────┬──────────────┘
        REST /api/v1 (JWT)                              Supabase Realtime (chat)
                │                                               │
┌───────────────▼───────────────┐                 ┌─────────────▼─────────────┐
│ FastAPI                        │                 │ Supabase                   │
│ routers → services → ml_runtime│◄───────────────►│ Postgres+PostGIS+pgvector  │
│ BackgroundTasks (Celery later) │                 │ Auth │ Storage │ Realtime  │
│ onnxruntime (CPU) models       │                 └───────────────────────────┘
└───────────────┬───────────────┘
                │ reads/writes
        ┌───────▼────────┐        ┌──────────────────────────────────────────┐
        │ ml/ (offline)  │        │ sim/ (offline) synthetic marketplace      │
        │ train → ONNX   │        │ evaluates swaps, trust, fraud, price-drop │
        │ MLflow (local) │        └──────────────────────────────────────────┘
        └────────────────┘
```

## 3. Components

| Component    | Responsibility                                                             | Notes                                   |
| ------------ | -------------------------------------------------------------------------- | --------------------------------------- |
| `apps/web`   | UI, PWA, on-device inference, QR display/scan                              | Next.js App Router, Tailwind            |
| `apps/api`   | Business logic, auth checks, AI endpoints, moderation                      | FastAPI, SQLAlchemy                     |
| `ml_runtime` | Loads ONNX models once at startup; exposes `predict_*` functions           | CPU, batch size 1                       |
| `workers`    | Embedding generation, alert matching, swap-cycle solve, retraining trigger | BackgroundTasks → Celery only if needed |
| `ml/`        | Dataset prep, training, evaluation, ONNX export, model cards               | Colab/Kaggle for GPU                    |
| `sim/`       | Agent-based marketplace simulator                                          | Deterministic by seed                   |
| Supabase     | DB, auth, object storage, realtime chat                                    | RLS enabled on all tables               |

## 4. Key data flows

### 4.1 Snap-to-List (the core flow)

1. User picks 1 to 5 photos in the browser.
2. **On-device:** quality check (blur/dark/clutter) → retake prompt if poor. Scrubber detects sensitive regions; user previews and adjusts boxes; blurred images are produced client-side.
3. Scrubbed images upload to Storage (`listing-images/`, re-encoded server-side; metadata stripped).
4. `POST /ai/analyze-photos` → server returns `{category, subtype, brand_model, condition, heatmap_url, price_range, shap_reasons, confidences, draft_title, draft_description}`.
5. Any field below its confidence threshold is flagged "please confirm".
6. User edits and publishes. **If any AI field was edited, a `corrections` row is written** (feeds active learning).
7. Background: image and text embeddings stored in pgvector; duplicate check runs; fraud flags created if needed.

### 4.2 Search

Query → language-agnostic embedding (multilingual sentence model) → pgvector ANN + SQL filters (price, condition, PostGIS distance) → rank. Baseline path (Postgres full-text) retained behind a flag for evaluation.

### 4.3 Handover

Buyer and seller agree on a meetup point → buyer generates short-lived QR/OTP → seller scans/enters → both confirm → listing `completed` → review unlocked → impact event recorded → trust score recomputed.

### 4.4 Swap cycles

Haves/wants → directed graph (user → user if A's item satisfies B's want) → solver finds disjoint cycles of length 2 to 3 maximising trades → proposals sent → all parties confirm → handovers per edge.

### 4.5 Active learning loop (offline, periodic)

`corrections` → export labelled set → dedupe vs test set (hash) → retrain candidate → evaluate on frozen test set → promote only if better (ML_SPEC §7) → new ONNX version → `model_versions` row → hot reload at API restart.

## 5. Model placement

| Model                          | Where it runs                                                      | Why                                                        |
| ------------------------------ | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| Photo-quality                  | Browser (ONNX Web)                                                 | Instant, private, no server cost                           |
| Privacy scrubber detector      | Browser (ONNX Web); server verifies with same model as a safeguard | Photos never leave device unscrubbed                       |
| Product recognition, condition | Server (ONNX CPU)                                                  | Larger; needs Grad-CAM                                     |
| Price (LightGBM)               | Server (ONNX/native)                                               | Tabular, tiny                                              |
| Text/image embeddings          | Server worker                                                      | Needed for pgvector writes                                 |
| Scam-text classifier           | Server                                                             | Small TF-IDF + LR baseline, then small transformer if time |

Benchmark of on-device vs server for the **photo-quality model** (one model only) is a required experiment (ML_SPEC §6).

## 6. Fallback behaviour

| Failure                          | Behaviour                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Model confidence below threshold | Ask user to confirm; show top-3 options                                                              |
| ML service error/timeout         | Manual listing form still works; banner explains                                                     |
| Browser lacks WASM/WebGL support | Skip on-device step; server does quality check; scrubbing falls back to server (user still previews) |
| Embedding job pending            | Item visible via filters; appears in semantic search when job completes                              |

## 7. Security and privacy

- **Database Connection Role & RLS Architecture:**
  - The API service connects to PostgreSQL via the connection pooler as the `postgres` database user.
  - In PostgreSQL, the `postgres` superuser / table owner role possesses `BYPASSRLS` privileges, meaning table-level RLS policies are **bypassed** on direct pooler connections.
  - **Defense-in-Depth Layer 1 (Application-Level Ownership):** Every request-path API route handler explicitly filters and enforces ownership checks using the authenticated user's claim (`where(User.auth_uid == current_user.auth_uid)`).
  - **Defense-in-Depth Layer 2 (PostgreSQL RLS & Force RLS):** All identity and user tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) with `FORCE ROW LEVEL SECURITY` applied where supported, ensuring direct client/PostgREST queries running under the Supabase `anon` or `authenticated` roles are strictly isolated.
  - **Defense-in-Depth Layer 3 (Isolated Admin Service):** All `service_role` operations (storage purge, admin user deletion) are restricted to `app/services/admin_service.py` and never imported into general request-path routers.
- Supabase Row Level Security on every table; the API uses the user's JWT, not the service key, except in admin/worker paths.
- HTTPS; short-lived JWT + refresh; rate limiting on auth, upload, chat, OTP endpoints.
- Upload validation (MIME, size ≤ 8 MB, dimensions), re-encode to strip EXIF/hidden payloads.
- Coarse location (geohash precision ≤ 5 or area name); contact details never public.
- DPDP-Act-aligned: consent screens, data export, account deletion (cascade + image purge).
- Threat model doc covers: account takeover, scam listings, fake reviews, upload abuse, correction poisoning (active learning).
- **Correction poisoning guard:** only corrections from verified users with at least one completed trade (or an admin-reviewed sample) enter retraining; outlier price corrections are capped by robust bounds.

## 8. Deployment

- Local dev: Native development with API (`uvicorn`) and Web (`next dev`), connecting to a dedicated hosted Supabase dev project (free tier, synthetic data only). Local Docker/WSL installation is optional; full container builds and inter-service smoke tests run in GitHub Actions CI.
- Hosted (free/low-cost): web on Vercel/Netlify, API on Render/Fly/Railway (CPU), Supabase free tier. Public demo URL with seeded data.
- CI: lint, types, unit tests, integration tests (against a Supabase test DB), build, and Docker Compose smoke tests on GitHub Actions. CD on `main`.
- Observability: structured logs, request latency, model confidence histogram, drift indicators (population stability index on embeddings and price features) surfaced in the admin dashboard.

## 9. Tech decisions log

| Decision                                            | Rationale                                                                                                                                                                                                                                                                        | Revisit if                                                       |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Supabase over self-managed Postgres+MinIO+Redis     | Fewer moving parts for vibecoding; pgvector/PostGIS/auth/realtime included                                                                                                                                                                                                       | Free-tier limits hit                                             |
| Hosted Supabase dev project over local Supabase CLI | Eliminates local Docker/WSL prerequisite for developer machines; avoids virtualization overhead on development environments; dev project is strictly restricted to synthetic/seed data                                                                                           | Offline development without internet access required             |
| BackgroundTasks before Celery                       | Simpler; most jobs are short                                                                                                                                                                                                                                                     | A job needs retries or >30 s                                     |
| ONNX for all served models                          | CPU-friendly, same format for browser and server                                                                                                                                                                                                                                 | Op not supported                                                 |
| Realtime chat via Supabase Realtime                 | No custom WebSocket server to maintain                                                                                                                                                                                                                                           | Need custom moderation hooks in-stream                           |
| MLflow local file store                             | No hosted server needed                                                                                                                                                                                                                                                          | Multi-user experiment tracking required                          |
| Tailwind CSS v4 (CSS-first config)                  | Resolves multiple high-severity PostCSS vulnerabilities present in legacy v3 pipelines (`postcss <=8.5.22` XSS and arbitrary file read), adopts modern CSS-first `@import "tailwindcss";` configuration without JS config overhead, and leverages the faster Oxide build engine. | Need complex JavaScript-based theme plugins not yet ported to v4 |
| Explicit Route Ownership + RLS Defense-in-Depth     | Backend connects as `postgres` role (which possesses `BYPASSRLS`); application-level queries explicitly filter by `current_user.auth_uid`, while PostgreSQL RLS provides outer boundary isolation for `authenticated` and `anon` clients.                                        | Switching to dynamic per-request database connection roles       |
