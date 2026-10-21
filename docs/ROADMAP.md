# ROADMAP: LOOP (18 phases)

How agents use this file: do phases in order, one task at a time. Each task lists **Acceptance** checks; the task is done only when they pass (see AGENTS.md §7). Phases are not dated; the owner adds dates. Phase 2 (data) runs **in parallel** with Phases 3 to 7 because data collection is the real bottleneck and no agent can do it.

**Milestones**

- **M1 Vertical slice** (end of Phase 11): photo → on-device check → scrub → AI draft → publish → search → chat works end to end (handover arrives in Phase 13).
- **M2 Trust and safety** (end of Phase 14).
- **M3 Research features** (end of Phase 17).
- **M4 Submission** (Phase 18): paper draft, user study done, copyright filing package ready.

**Stub-first rule:** from Phase 4, `/ai/analyze-photos` exists and returns a fixed, schema-correct response. Phases 8 to 11 replace stubs with real models so the app is always runnable.

**If behind, cut in this order:** Phase 17 price-drop → image search (P12) → saved-search alerts (P12) → impact dashboard (P16) → smart autofill (P11). Never cut: baselines, frozen test sets, active learning (P15), user study (P18).

---

## Phase 1: Foundation and tooling

**Goal:** a runnable monorepo with CI.

- Create the repo layout from AGENTS.md §4; Docker Compose (web, api, local Supabase); `.env.example`.
- FastAPI skeleton with `/health`; Next.js skeleton with PWA manifest; Alembic initialised; ruff/black/mypy/ESLint/Prettier; pre-commit.
- GitHub Actions: lint, type-check, tests on push.
- Copy the 8 docs into `docs/`; create `docs/plans/`.
- Install Superpowers skills (see PROMPTS.md §0), pin the version, and log it in `THIRD_PARTY_LICENSES.md`.
- Create `LICENSE` (placeholder until the owners decide), `NOTICE`, `THIRD_PARTY_LICENSES.md`; add a copyright-header check to pre-commit.
- Keep the repo private.

**Acceptance:** `docker compose up` serves web and API; `/health` returns 200; CI is green on an empty test suite; README explains setup in <10 commands.

## Phase 2: Data collection and labelling pipeline (parallel track)

**Goal:** datasets and splits exist before model work begins.

- **Ethics approval (or written exemption) and consent forms before any collection** (IP_AND_COMPLIANCE §3); settle ownership/authorship agreement (§1).
- Photo-collection protocol and consent form; image upload form for volunteers (can be a simple Supabase Storage bucket + Google Form).
- Annotation setup (Label Studio or CSV viewer); labelling guide for condition grades with example images.
- Scripts: ingest, dedupe (perceptual hash), stratified split by listing, manifest with file hashes; `ml/data/manifests/`.
- Price data: ingest public datasets (check licences, record in `ml/data/LICENSES.md`); template for manual local price observations.
- Write the 50 search queries (English + Hinglish) and the relevance-judgement template; staged scrub-set protocol (consenting volunteers, mock IDs/plates).
- Collect continuously through Phase 12; target counts in ML_SPEC §1.

**Acceptance:** ethics approval or exemption on file; ownership agreement recorded; consent form and labelling guide exist; split script is deterministic (same hash twice); no near-duplicate across splits (test script); dataset statistics report generated; licences logged.

## Phase 3: Auth, profiles and community verification

- Supabase Auth integration (register/login/refresh); `users`, `communities`, `memberships`; RLS policies.
- `verify-community` via email domain or join code; Verified badge; coarse area on profile; account export/delete endpoints.
- Frontend: auth pages, profile page, consent screen.

**Acceptance:** anonymous requests to protected routes → 401; wrong join code rejected; no exact address field exists; delete removes user data (test); RLS test proves user A cannot read user B's private rows (RLS and auth tests run against the hosted dev project using a separate test schema or test users cleaned up after each run).

## Phase 4: Listings and image upload (with stubbed AI)

- Schema: `listings`, `listing_images`, enums, indexes; migrations.
- CRUD, status transitions (draft/active/reserved/completed), image upload with MIME/size validation and re-encode (strip EXIF).
- Constraint: cannot publish unless all images `scrubbed = true` (server-enforced).
- `/ai/analyze-photos` stub with correct schema and confidence fields; frontend sell flow (photos → AI draft form → edit → publish).
- `scripts/seed.py` with simulated listings (`data_origin='simulated'`).

**Acceptance:** valid image accepted, invalid rejected with a clear message; unscrubbed publish returns `LISTING_NOT_SCRUBBED`; listing persists across API restart; edits to AI fields are saved.

## Phase 5: Discovery: browse, filters, geo-search, map

- Category browse; filters (price, condition, distance via PostGIS, type); pagination; map view (Leaflet/MapLibre with coarse points).
- Listing detail page; "fair-deal badge" placeholder wired to price fields.

**Acceptance:** filter combinations return correct results (tests with seeded data); distance filter uses coarsened location; map shows area-level markers only; list loads <2 s on seeded 1k listings (to be measured, not assumed).

## Phase 6: Realtime chat and notifications

- `messages` table; Supabase Realtime subscription; per-listing threads; unread indicators; basic in-app notifications.
- Rate limiting on send; block/report (writes a `manual_report` flag).

**Acceptance:** two users exchange messages in real time and history persists; non-participants cannot read the thread (RLS test); rate limit triggers at 60/min.

## Phase 7: On-device quality check and photo privacy scrubber

- Browser: `onnxruntime-web` integration, model loader with caching, Web Worker for inference.
- Baseline heuristics (Laplacian variance, luminance); MobileNetV3-Small quality model trained on LOOP-Images + synthetic degradations (Colab) → ONNX.
- Scrubber: face detector, plate/ID detector (**permissive-licence model only; not YOLOv8**; log in `THIRD_PARTY_LICENSES.md`), OCR + regex for phone/address; canvas pixelation; preview UI with add/resize/remove boxes.
- Server `/scrub-verify` safeguard using the same detectors.
- **Experiment:** on-device vs server for the quality model (accuracy parity, latency p50/p95 on ≥2 devices, size, bytes saved). Save to `ml/reports/ondevice_vs_server/`.

**Acceptance:** blurred image is what gets uploaded (test: original never reaches Storage); per-class recall/precision computed on LOOP-Scrub (recall reported first); residual leak rate computed; ONNX output matches PyTorch within 1e-3; latency table exists; `/scrub-verify` blocks a deliberately unblurred test face.

## Phase 8: Product recognition model

- CLIP zero-shot baseline → linear probe (and/or fine-tuned EfficientNet/ConvNeXt-Tiny) → ONNX; multi-photo aggregation; threshold `T_cat` chosen on val.
- Brand/model suggestion (zero-shot list + OCR text).
- Wire into `/ai/analyze-photos`; model card; MLflow runs.

**Acceptance:** baseline and improved scored on the frozen test set (top-1, top-5, macro-F1, confusion matrix, ECE); ONNX parity; low-confidence returns top-3 and `needs_confirmation`; model card complete.

## Phase 9: Condition grader with Grad-CAM

- Plain-CNN baseline; ordinal model (CORAL or expected-value) → ONNX; Grad-CAM heatmap endpoint and overlay in UI.
- Annotator agreement (weighted kappa) computed and reported.
- Manual heatmap sanity check on ~50 images.

**Acceptance:** QWK, accuracy, MAE, confusion matrix vs baseline on frozen test; heatmap displays and is dismissible; grade editable; limitation text visible in UI; model card complete.

## Phase 10: Price estimator and fair-deal badge

- Baselines (category median, linear, random forest) → LightGBM quantile + split-conformal intervals; SHAP reasons in plain language.
- Fair-deal badge logic; fallback widening for unknown subtypes; seller guidance text when ask is far above range.

**Acceptance:** MAE/MAPE/coverage/width vs baselines, per category and price band; coverage reported against nominal 80%; SHAP top-3 shown in UI; badge unit-tested on boundaries; model card complete.

## Phase 11: Snap-to-List integration (M1 vertical slice)

- Replace the stub: single `/ai/analyze-photos` call returns category/subtype/brand, condition + heatmap, price range + reasons, draft title/description (template-based from attributes; optional small LLM only if free and local).
- Frontend: end-to-end flow with confirm-on-low-confidence; **write `corrections` rows** when the seller edits any AI field (prepares Phase 15).
- Smart autofill (P1): specs/defects from recognition + templates.
- Instrument listing time (client timestamps) for the user study.

**Acceptance:** full slice runs on a phone-size viewport: photo → quality → scrub → AI draft → edit → publish → appears in browse; editing category/condition/price creates `corrections`; p95 analyze latency measured and logged; Playwright E2E for the slice passes.

## Phase 12: Semantic multilingual search, image search, saved searches

- Embedding worker (text 384-d, image 512-d) into pgvector HNSW; query parser (price ceiling, place) + embedding retrieval + SQL filters; `mode=fts` baseline.
- Evaluation on the 50-query set (English vs Hinglish): Recall@k, NDCG@10, MRR, latency.
- Search by image; "similar items" on detail pages; saved searches with alert matching (P1; first to cut if behind).

**Acceptance:** semantic ≥ FTS baseline on the primary metric (or the honest result is reported); Hinglish results reported separately; a query such as "study table under 3000 near Wakad" applies price and place filters; new listing becomes searchable after the embedding job.

## Phase 13: Handover, reviews and trust score

- `handover_events`; meetup-point suggestions (curated list of public campus/society spots); QR/OTP generation with expiry and attempt limits; both-sides confirmation; status → completed.
- Reviews gated on completed handover; trust score (formula in ML_SPEC §8) with visible breakdown; trust badge in UI.
- Chat-safety warnings (scam keyword rules → classifier in Phase 14); negotiation helper (rule-based from price range).

**Acceptance:** trade completes only after both confirm; expired/incorrect OTP rejected and rate-limited; review without completed handover → 403; trust breakdown sums to the displayed score; full vertical slice incl. handover and review passes E2E.

## Phase 14: Fraud, duplicates, scam text and moderation

- Duplicate/stolen-image detection (phash → CLIP re-check); price-anomaly rule; scam-text baseline rules → TF-IDF + LR; flags created with a human-readable reason.
- Moderator dashboard: flag queue with evidence, actions (uphold/dismiss/remove/warn), audit log; model-health page (confidence histograms, drift indicators).
- Evaluate on synthetic near-duplicates and labelled scam texts; label clearly as synthetic.

**Acceptance:** precision/recall/FPR reported with data origin labelled; every moderation action writes an audit log row; a flagged listing shows the reason; no auto-removal without human decision.

## Phase 15: Active learning loop (human-in-the-loop)

- Eligibility filter and anti-poisoning rules; `retrain.py` for recognition, condition, price; `model_versions` and gated promotion on frozen test set; rollback.
- **Experiment:** accuracy/QWK/MAPE vs number of corrections for random, uncertainty, and correction-stream strategies; ≥5 seeds; plus 10% and 20% label-noise variants. Optional: add real pilot corrections as a separate curve.
- Admin view of corrections stats and model versions.

**Acceptance:** figure produced with error bands and a clearly labelled "simulated corrections" caption; a candidate that fails to beat the active model is **not** promoted (test); no test-set item appears in retraining data (hash check test); retrain runs end-to-end from `corrections` rows.

## Phase 16: Swap engine and impact dashboard

- Wishlists; graph builder (category + embedding + price tolerance); cycle enumeration ≤3 + set-packing via CP-SAT; greedy 2-way baseline; proposals; all-party confirmation; per-edge handovers.
- Impact estimator with cited factor table, ranges, sensitivity analysis; dashboard per user and community; `docs/IMPACT_METHOD.md`.
- Label the swap engine and impact estimator as algorithmic in UI.

**Acceptance:** cycles are valid (each user gives one and receives one; value within tolerance); proposals confirm only when all confirm (test); impact values trace to factor sources; sensitivity table generated.

## Phase 17: Marketplace simulator and price-drop suggestions

- `sim/` agent-based simulator (ML_SPEC §9): agents, behaviours, scammers, seeds, configs, outputs flagged `simulated`.
- Run experiments: swap scaling (100 → 10k users), 2- vs 3-cycle, trust-score AUC and fake-review ring resilience, fraud PR vs `p_fraud`, cold-start, sensitivity analysis.
- Price-drop heuristic (P2): hazard-style `P(sale ≤7d)`; trigger and floor rules; compare vs no-drop and fixed-schedule baselines on simulated (and pilot, if any) data; UI card on the seller's listing.

**Acceptance:** same seed → identical results (test); sensitivity analysis included; all figures captioned "synthetic"; price-drop never suggests below the floor or beyond 15% per step (tests); limitation about assumed buyer behaviour written into the report.

## Phase 18: Validation, hardening, user study and submission

- **Testing:** coverage report; integration + E2E for the 3 main journeys (list, find/buy, swap) + moderation; Locust/k6 load test with p50/p95 and throughput; security checks (threat model, rate limits, upload abuse, RLS review, dependency audit); accessibility pass.
- **Deployment:** free-tier hosting; public demo URL with seeded data and evaluator accounts; backups; monitoring.
- **User study (30 to 50 students):** ethics/consent, tasks (create listing, find item, negotiate, propose swap), measures (time with/without AI, SUS, trust with/without explanations), paired t-test or Wilcoxon, anonymised data.
- **Ablations** (ML_SPEC §14) and final figure set (ML_SPEC §15).
- **Write-up:** limitations, model cards, honest comparison with existing platforms (re-check OLX/Quikr features before submission), future scope.
- **Paper:** assemble per `PAPER_PLAN.md`; run the claim audit (§9) and reproducibility checklist (§5).
- **IP and release:** final licence audit; confirm no AGPL/GPL components; add copyright headers; decide publish-versus-patent; prepare the copyright filing (IP_AND_COMPLIANCE §6); tag `paper-v1` and archive the filed snapshot.
- **Ethics for the user study:** approval and consent confirmed before recruiting.

**Acceptance:** ethics approval covers the study; licence audit clean (no AGPL/GPL); every source file has a copyright header; filing package prepared; public URL works; all P0 acceptance checks pass in CI; every figure and number in the report traces to a logged run; user-study analysis script reproducible; README + demo script + model cards complete; any metric not measured is marked `TBD` or removed.

---

## Appendix: phase dependency map

```
1 → 3 → 4 → 5 → 6
        4 → 7 → 8 → 9 → 10 → 11 (M1)
2 ─────────→ 7, 8, 9, 10 (data needed)
11 → 12 → 13 → 14 (M2) → 15 → 16 → 17 (M3) → 18 (M4)
```
