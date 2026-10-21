# AGENTS.md: LOOP

Read this file first, every session. Then read the doc relevant to your task (see "Where to look").

## 1. What LOOP is (one paragraph)

LOOP is a hyperlocal marketplace (campus / hostel / housing society) to sell, donate and swap pre-owned goods in four categories: Electronics, Furniture, Books, Hobbies & Recreation. **Thesis: a human-in-the-loop, explainable, privacy-preserving AI marketplace for local reuse.** It is a final-year CS project judged as both a working product and engineering research. Honest evaluation matters more than feature count.

## 2. Non-negotiable principles

1. **Every AI output is editable, explained, and has a low-confidence fallback.** Never auto-publish AI output without user confirmation.
2. **Photos are scrubbed (faces, ID cards, number plates, phone numbers, addresses) before they are published.** Scrubbing runs in the browser before upload where possible.
3. **Never over-claim.** Rule-based/algorithmic features (swap engine, trust score, impact, negotiation hints, price-drop heuristic) are labelled as such in UI and docs. Synthetic data is labelled synthetic everywhere (filenames, plots, docs, DB flags).
4. **Every ML model has a baseline, a metric, a frozen test set and a model card.** No model ships without all four.
5. **Privacy by default:** coarse location only (area / geohash precision ≤ 5), no public contact details, in-app chat only.
6. **Licences and IP:** only permissive licences (MIT/BSD/Apache-2.0/ISC/CC0/CC-BY) for dependencies, models and datasets. **Never use AGPL/GPL components (e.g. Ultralytics YOLOv8).** Log every dependency, model and dataset in `THIRD_PARTY_LICENSES.md` _before_ using it. See `docs/IP_AND_COMPLIANCE.md`.
7. **Research traceability:** every number or figure must come from a logged run (see `docs/PAPER_PLAN.md`). Save experiment outputs to the paths listed there.
8. **Scope discipline:** build in the order of `ROADMAP.md`. Do not build anything in the "Cut list" (PRD.md §6) unless the user explicitly asks.

## 3. Stack (fixed; do not swap without asking)

| Layer                          | Choice                                                                                               |
| ------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Frontend                       | Next.js (App Router) + TypeScript + Tailwind, installable PWA                                        |
| Backend                        | FastAPI (Python 3.11), Pydantic v2, SQLAlchemy 2 + Alembic                                           |
| DB / Auth / Storage / Realtime | Supabase (Postgres + PostGIS + pgvector, Auth, Storage, Realtime for chat)                           |
| Background work                | FastAPI `BackgroundTasks` first; add Celery + Redis **only** if a job exceeds ~30 s or needs retries |
| ML training                    | PyTorch (Colab/Kaggle GPU), exported to **ONNX**                                                     |
| ML serving                     | `onnxruntime` (CPU) in the API; `onnxruntime-web` in the browser                                     |
| Tree models                    | LightGBM (price quantiles), scikit-learn                                                             |
| Optimisation                   | OR-Tools (CP-SAT) or PuLP for swap cycles                                                            |
| Experiment tracking            | MLflow with local file store (`ml/mlruns`), no hosted server                                         |
| Tests                          | pytest, Playwright (E2E), Vitest (frontend units), Locust (load)                                     |
| CI                             | GitHub Actions: lint, type-check, tests on every push                                                |
| Containers                     | Docker Compose for local dev                                                                         |

## 4. Repository layout

```
loop/
  AGENTS.md  LICENSE  NOTICE  THIRD_PARTY_LICENSES.md
  docs/ (PRD, ARCHITECTURE, DATA_MODEL_AND_API, ML_SPEC, ROADMAP, PAPER_PLAN, IP_AND_COMPLIANCE, PROMPTS, plans/)
  apps/web/            # Next.js PWA
  apps/api/            # FastAPI service
    app/ routers/ services/ models/ schemas/ ml_runtime/ workers/
    tests/
  ml/
    data/              # raw/ interim/ processed/ (git-ignored except manifests)
    notebooks/ src/ configs/ exports/ (ONNX) reports/ (figures, tables)
    model_cards/
  sim/                 # marketplace simulator (see ML_SPEC §9)
  infra/               # docker-compose, supabase migrations, CI
  scripts/
```

## 5. Conventions

- **Python:** ruff + black, mypy (strict on `apps/api/app`), type hints everywhere, docstrings on public functions.
- **TypeScript:** strict mode, ESLint + Prettier, no `any` without a comment explaining why.
- **Git:** small commits, conventional messages (`feat:`, `fix:`, `docs:`, `test:`, `chore:`, `ml:`), one branch per roadmap task (`phase-07/scrubber-onnx`).
- **Config:** all secrets via environment variables; `.env.example` kept up to date; never commit secrets, datasets, or model weights >50 MB (use `ml/exports/` + release assets or Supabase Storage).
- **API:** REST + OpenAPI; versioned under `/api/v1`; errors as `{"error": {"code", "message"}}`; pagination via `limit`/`cursor`.
- **DB:** all schema changes through Alembic migrations; never edit applied migrations.
- **Reproducibility:** every training script takes a config YAML and a seed; log params, metrics and data-manifest hash to MLflow.
- **Copyright header:** every new source file starts with `Copyright (c) <year> <owner names>. <licence or "All rights reserved">` (owners and licence per `docs/IP_AND_COMPLIANCE.md` §5).
- **Public release:** never push to a public remote, publish data, or post a preprint without the owner's explicit approval.
- **Determinism for evaluation:** test sets are frozen by file hash in `ml/data/manifests/`; never train on them; never tune on them.

## 6. How to work (agent workflow)

**Superpowers skills are installed.** They decide _how_ you work (plan, test-first, debug, verify, review); these docs decide _what_ to build. **If a skill conflicts with AGENTS.md or `docs/`, AGENTS.md and `docs/` win.** The design is already settled in `docs/`: do not re-brainstorm it. Use brainstorming only for small open decisions inside a phase. Save plans to `docs/plans/phase-NN.md` and wait for approval before executing.

Steps for every task:

1. State which roadmap phase and task you are doing.
2. Re-read the acceptance checks for that task before coding.
3. Write or update tests first when the logic is non-trivial.
4. Implement the smallest change that meets the acceptance checks.
5. Run lint, types, tests locally. Fix before reporting done.
6. Update docs if you changed a contract (API, schema, model I/O).
7. Report: what changed, how you verified, what is left, any assumptions.

## 7. Definition of done (for any task)

- Acceptance checks in `ROADMAP.md` pass.
- Tests added or updated, and CI green.
- No new lint or type errors; no secrets or large files committed.
- For ML tasks: metrics logged vs baseline on the frozen test set, model card updated, ONNX export verified against the PyTorch output (max abs diff < 1e-3).
- UI: works at 360 px width, keyboard accessible, shows loading and error states.

## 8. Do / Don't

**Do**

- Stub an AI endpoint first (fixed plausible response + correct schema), then replace with the real model. This keeps the end-to-end flow running at all times.
- Show confidence and a reason for every AI suggestion; ask the user to confirm when confidence is below the configured threshold (`ml/configs/thresholds.yaml`).
- Ask the user when requirements are ambiguous instead of inventing them.

**Don't**

- Don't add features outside the PRD or phases not yet reached.
- Don't fabricate metrics, dataset sizes or results. If a number was not measured, write `TBD (not yet measured)`.
- Don't train or evaluate on the same data; don't leak test items into train (check duplicates via perceptual hash).
- Don't store exact addresses, raw phone numbers, or unscrubbed images publicly.
- Don't call external paid APIs in the core path; the product must run on free-tier infra with small CPU models.
- Don't use real personal data in the simulator or tests.
- Don't add a dependency, model or dataset without checking and logging its licence.
- Don't commit consent forms, participant data, or raw photos that show people or documents.

## 9. Where to look

| Need                                                            | File                         |
| --------------------------------------------------------------- | ---------------------------- |
| What to build, priorities, acceptance criteria                  | `docs/PRD.md`                |
| Components, data flow, deployment                               | `docs/ARCHITECTURE.md`       |
| Tables, endpoints, schemas                                      | `docs/DATA_MODEL_AND_API.md` |
| Models, datasets, metrics, simulator, scrubber, active learning | `docs/ML_SPEC.md`            |
| What to do next, in order                                       | `docs/ROADMAP.md`            |
| Paper structure, figures, reproducibility                       | `docs/PAPER_PLAN.md`         |
| Ownership, ethics, licences, copyright filing                   | `docs/IP_AND_COMPLIANCE.md`  |

## 10. Open assumptions (confirm with the owner; update here when resolved)

- GPU: free Colab/Kaggle only. Models must be small enough to train in a session and serve on CPU.
- Deadline: unspecified. The roadmap is in phases, not dates; the owner assigns dates.
- Pilot community: one campus group (Ajeenkya D Y Patil University, Pune) is assumed.
