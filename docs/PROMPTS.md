# PROMPTS: Building LOOP in Google Antigravity

## 0. One-time setup (you do this, not the agent)

1. Create an empty folder `loop/` and open it in Antigravity (File → Add Folder to Workspace).
2. Put `AGENTS.md` in the project root and the other 8 files in `loop/docs/` (`PRD`, `ARCHITECTURE`, `DATA_MODEL_AND_API`, `ML_SPEC`, `ROADMAP`, `PAPER_PLAN`, `IP_AND_COMPLIANCE`, `PROMPTS`). Create an empty `loop/docs/plans/` folder.

Folder after this step:

```
loop/
  AGENTS.md
  docs/
    PRD.md  ARCHITECTURE.md  DATA_MODEL_AND_API.md  ML_SPEC.md
    ROADMAP.md  PAPER_PLAN.md  IP_AND_COMPLIANCE.md  PROMPTS.md
    plans/
```

3. Settings: use **Agent-assisted development** (agent decides when to ask you), keep terminal commands on a review/allow-list policy, and use **Planning** mode for anything bigger than a small fix. Check current option names in the app; they change between versions.
4. Rule file size limit: each Rules/Workflow file is capped at about 12,000 characters. `AGENTS.md` fits. Do not paste the long docs into rules; the agent reads `docs/` on demand.
5. `git init`, keep the repo **private**, commit after every accepted phase.
6. **Install Superpowers** (obra/superpowers, a skills framework: plan, test-first, debug, verify, review). I could not read its README directly, so follow the install steps in the official README for Antigravity. If it does not support Antigravity, use a community port (for example `npx agy-superpowers@latest init`, which creates the `.agent/` skills, workflows and an always-on rule). Then: pin the version, skim the skills you installed, do not auto-update during the project, and log it in `THIRD_PARTY_LICENSES.md`. Ask the agent "list the superpowers skills you can use" to confirm it loaded.
7. Keep one agent per phase on the main branch. Parallel agents (Manager view) are fine only for independent work (for example Phase 2 data tooling alongside Phase 3 auth). Never run two agents that edit the same files.

> Tip: if your Antigravity version supports `.agents/workflows/` (or `.agent/workflows/`), you can save the **Master template** below as a workflow and call it per phase. Folder names differ between versions, so check yours.

## 1. Master template (use for every phase)

Replace `{N}` and the extra docs.

```
You are working on the LOOP project. First read AGENTS.md fully.
Then read docs/ROADMAP.md, Phase {N}, and these docs: {list}.
The docs are the spec: do not re-brainstorm the design. AGENTS.md and docs/
override any skill if they conflict.

Step 1 (plan only, do not code yet): use the writing-plans skill to produce a
short plan saved in docs/plans/phase-{NN}.md with the tasks, the files you will
create or change, the tests you will write, and any assumption or question for
me. List the acceptance checks from the roadmap that you will verify. Stop and
wait for my approval.

Step 2 (after I approve): use executing-plans with test-driven-development, in
small batches on the branch phase-{NN}/<short-name>, with a review point
between batches. Follow the stub-first rule and the licence rule in AGENTS.md.
Add the copyright header to every new file. Use systematic-debugging for any
failure.

Step 3 (verify): use verification-before-completion. Run lint, type-check and
tests. Run the acceptance checks one by one and show the evidence (command
output, test names, screenshots if UI).

Step 4 (report): list what is done, what is NOT done, any metric that is
TBD (not yet measured), anything that needs my manual action (data,
Colab training, approvals), and the exact next step. Do not claim a metric
you did not measure.
```

## 2. Utility prompts

**Session start (new chat / after a break)**

```
Read AGENTS.md and docs/ROADMAP.md. Check the git log and the repo state, then
tell me which phase we are in, which acceptance checks already pass, and what is
left. Do not change any code.
```

**Fix a bug**

```
Bug: <describe, with steps, expected and actual>. Reproduce it with a failing
test first. Then fix it with the smallest change, show the test passing, and
confirm no other tests broke. Do not refactor unrelated code.
```

**Review before I accept a phase**

```
Use the requesting-code-review skill and act as a strict reviewer. Check the work of Phase {N} against its acceptance
checks in docs/ROADMAP.md and the rules in AGENTS.md. Look for: scope creep,
missing tests, unmeasured claims, licence issues (AGPL/GPL), missing copyright
headers, secrets or large files committed, privacy problems (exact location,
unscrubbed images, public contact info). Give a pass/fail per check with
evidence. Do not fix anything; list issues only.
```

**Phase checkpoint**

```
Summarise Phase {N} in a CHANGELOG entry, make sure docs reflect any contract
change (API, schema, model I/O), update THIRD_PARTY_LICENSES.md, then tag the
commit phase-{N}-done.
```

**Stuck or going off track**

```
Stop. You are drifting from the plan. Re-read AGENTS.md and the Phase {N}
acceptance checks, state in 5 lines what you were asked to do, what you did,
and what is wrong, then propose the smallest way to get back on track.
```

## 3. Phase prompts

Use the master template, filling the docs list as shown. The "You" lines are things only you can do.

### Phase 1: Foundation and tooling

Docs: ARCHITECTURE, IP_AND_COMPLIANCE (§5).

```
Do Phase 1. Create the monorepo layout from AGENTS.md §4, Docker Compose (web,
api, local Supabase), .env.example, a FastAPI skeleton with /health, a Next.js
App Router + TypeScript + Tailwind skeleton with a PWA manifest, Alembic init,
linters/formatters/type-checkers, pre-commit (including a copyright-header
check), and GitHub Actions CI. Create LICENSE (placeholder "All rights
reserved" until the owners decide), NOTICE and THIRD_PARTY_LICENSES.md. Write
a README with setup in under 10 commands.
```

You: confirm owner names for the copyright header.

### Phase 2: Data collection and labelling pipeline (parallel track)

Docs: ML_SPEC §1, IP_AND_COMPLIANCE §3.

```
Do Phase 2. Build the data tooling only. I handle ethics approval and consent
paperwork myself. Create: ingestion, perceptual-hash dedupe, stratified split
by listing with a hash manifest in ml/data/manifests/, a labelling guide
template for condition grades, a price-data ingestion script with a licence log
(ml/data/LICENSES.md), a template for the 50 search queries with relevance
judgements, and a dataset statistics report. Do not download or scrape any
dataset without telling me its licence first.
```

You: get ethics approval/exemption, write the consent form, start collecting photos, and label them (two annotators plus tie-breaker).

### Phase 3: Auth, profiles, community verification

Docs: DATA_MODEL_AND_API (Identity, Auth endpoints), ARCHITECTURE §7.

```
Do Phase 3. Integrate Supabase Auth, create users/communities/memberships with
RLS, verify-community (email domain or join code), the Verified badge,
coarse-location profile, account export and delete endpoints, and the frontend
auth/profile/consent pages. Write an RLS test proving one user cannot read
another's private rows.
```

### Phase 4: Listings and image upload (stubbed AI)

Docs: DATA_MODEL_AND_API (Listings, AI), ARCHITECTURE §4.1.

```
Do Phase 4. Create the listings and listing_images schema with migrations and
indexes, CRUD and status transitions, image upload with MIME/size validation and
EXIF-stripping re-encode, the server rule that blocks publishing unless all
images are scrubbed, a STUB /ai/analyze-photos returning the documented schema
with confidence fields, the sell-flow frontend, and scripts/seed.py with
simulated listings marked data_origin='simulated'.
```

### Phase 5: Discovery (browse, filters, geo, map)

Docs: DATA_MODEL_AND_API (Listings GET), PRD §5.3.

```
Do Phase 5. Category browse, filters (price, condition, distance via PostGIS,
type), cursor pagination, a map view with area-level markers only (no exact
points), and the listing detail page with a placeholder fair-deal badge.
```

### Phase 6: Realtime chat and notifications

Docs: DATA_MODEL_AND_API (Chat), ARCHITECTURE §3.

```
Do Phase 6. Messages table with RLS, Supabase Realtime subscriptions,
per-listing threads, unread indicators, basic in-app notifications, send rate
limiting (60/min), and block/report writing a manual_report flag.
```

### Phase 7: On-device quality check and photo privacy scrubber

Docs: ML_SPEC §6, ARCHITECTURE §5, IP_AND_COMPLIANCE §4.

```
Do Phase 7. Integrate onnxruntime-web with a Web Worker and model caching.
Build the heuristic quality baseline and training code for a MobileNetV3-Small
quality model (training runs on my Colab; give me a notebook and config).
Build the scrubber: face detector, plate/ID detector, OCR with regex for Indian
phone numbers and PIN codes, irreversible pixelation on canvas, a preview UI to
add/resize/remove boxes, and the server /scrub-verify safeguard. Use ONLY
permissively licensed models; do NOT use Ultralytics YOLOv8; log every model in
THIRD_PARTY_LICENSES.md and ask me before choosing a detector. Write the
on-device vs server benchmark harness.
```

You: label the staged scrub set, run Colab training, measure latency on 2 devices.

### Phase 8: Product recognition model

Docs: ML_SPEC §0, §2.

```
Do Phase 8. Write the CLIP zero-shot baseline and the linear-probe (or
fine-tuned small CNN) pipeline with configs, seeds and MLflow logging, ONNX
export with a parity test, multi-photo aggregation, threshold selection on the
validation set, wiring into /ai/analyze-photos replacing the stub for category
and subtype, and the model card template filled with TBD where not measured.
Training happens on my Colab; give me the notebook and the exact commands.
```

### Phase 9: Condition grader with Grad-CAM

Docs: ML_SPEC §3.

```
Do Phase 9. Plain-CNN baseline, ordinal model, QWK/accuracy/MAE/confusion-
matrix evaluation, Grad-CAM heatmaps served and overlaid in the UI,
annotator-agreement computation, ONNX export with parity test, and a small tool
to review about 50 heatmaps manually. Show the limitation text in the UI.
```

### Phase 10: Price estimator and fair-deal badge

Docs: ML_SPEC §4.

```
Do Phase 10. Baselines (category median, linear, random forest), LightGBM
quantile models with split-conformal calibration, SHAP top-3 reasons in plain
language, the fair-deal badge logic with boundary tests, interval widening
fallback, and seller guidance when the ask is far above range. Report
MAE/MAPE/coverage/width per category and price band.
```

### Phase 11: Snap-to-List integration (milestone M1)

Docs: ARCHITECTURE §4.1, DATA_MODEL_AND_API (AI, corrections).

```
Do Phase 11. Replace the stub with the real /ai/analyze-photos combining
recognition, condition + heatmap, price range + reasons and template-based
draft title/description. Implement confirm-on-low-confidence in the UI and
write a corrections row whenever the seller edits an AI field. Add smart
autofill (P1) and client-side listing-time instrumentation. Write a Playwright
E2E for the full slice at a 360 px viewport and log p95 analyze latency.
```

### Phase 12: Semantic search, image search, saved searches

Docs: ML_SPEC §5, DATA_MODEL_AND_API (Search).

```
Do Phase 12. Embedding worker (text 384-d, image 512-d) into pgvector HNSW,
query parser for price ceilings and place names, semantic retrieval with SQL
filters, the mode=fts baseline, the evaluation script over the 50-query set
(Recall@k, NDCG@10, MRR, English vs Hinglish), search-by-image, similar items,
and saved-search alerts. Cut saved-search alerts first if time is short.
```

### Phase 13: Handover, reviews, trust score

Docs: DATA_MODEL_AND_API (Chat and transactions), ML_SPEC §8.

```
Do Phase 13. Handover events with curated public meetup points, short-lived
QR/OTP with attempt limits, both-sides confirmation, reviews gated on completed
handover, the trust score with a visible breakdown (formula in ML_SPEC §8),
the rule-based negotiation helper, and chat-safety keyword warnings. Extend the
Playwright E2E through handover and review.
```

### Phase 14: Fraud, duplicates, scam text, moderation

Docs: ML_SPEC §8, PRD §5.7.

```
Do Phase 14. Duplicate/stolen-image detection (phash then CLIP re-check),
price-anomaly rule, scam-text baseline then TF-IDF + logistic regression, flags
with human-readable reasons, the moderator dashboard with audit log and
model-health page. Evaluate on synthetic near-duplicates and labelled scam
texts, always labelled synthetic. No automatic removal without a human decision.
```

### Phase 15: Active learning loop

Docs: ML_SPEC §7, PAPER_PLAN §4.

```
Do Phase 15. Implement the eligibility and anti-poisoning filters, retrain.py
for recognition, condition and price, model_versions with gated promotion on
the frozen test set and rollback, and the experiment: accuracy/QWK/MAPE vs
number of corrections for random, uncertainty and correction-stream strategies,
at least 5 seeds, plus 10% and 20% label-noise variants. Save figures with
captions marking simulated corrections to ml/reports/active_learning/. Add
tests proving a worse candidate is not promoted and no test item leaks into
training.
```

### Phase 16: Swap engine and impact dashboard

Docs: ML_SPEC §10, §12.

```
Do Phase 16. Wishlists, graph builder, cycle enumeration up to length 3 with
set-packing via CP-SAT, the greedy 2-way baseline, proposals needing all-party
confirmation, per-edge handovers, then the impact estimator using a cited
factor table (ask me before adding any emission factor without a source), ranges
and sensitivity analysis, docs/IMPACT_METHOD.md, and the dashboards. Label the
swap engine and impact estimator as algorithmic in the UI.
```

### Phase 17: Marketplace simulator and price-drop suggestions

Docs: ML_SPEC §9, §11, PAPER_PLAN §4.

```
Do Phase 17. Build sim/ as an agent-based simulator with seeds and YAML
configs, all outputs flagged simulated. Run the swap scaling (100 to 10k
users), 2-vs-3 cycle, trust-score AUC and fake-review-ring, fraud PR, cold-
start experiments and the sensitivity analysis. Then implement the price-drop
heuristic with the 15% step cap and floor, compare against no-drop and fixed
schedule, and add the UI card. Add a test that the same seed gives identical
results. State the assumed-buyer-behaviour limitation in the report text.
```

### Phase 18: Validation, hardening, user study, submission

Docs: PRD §9, PAPER_PLAN (all), IP_AND_COMPLIANCE (all).

```
Do Phase 18 in parts, and ask me before starting each part. Part A: tests and
coverage, E2E for list, find/buy, swap and moderation, Locust load test with
p50/p95, security and dependency audit, accessibility pass. Part B: deployment
with seeded data and evaluator accounts, backups, monitoring. Part C: user-
study tooling (consent screen, task timer, SUS form, anonymised export) and the
analysis script (paired t-test or Wilcoxon, effect sizes, CIs). Part D: ablations
and make_figures.py generating every paper figure from logged runs. Part E:
licence audit (no AGPL/GPL), copyright headers, and the claim audit from
PAPER_PLAN §9.
```

You: run the study, write the paper, ethics approval, ownership agreement, publish-vs-patent decision, copyright filing.

## 4. Working rhythm that avoids pain

1. One phase at a time; accept only after the review prompt passes.
2. Ask for the plan first, read it, and cut anything outside the phase.
3. Commit often; tag each finished phase.
4. Run the training notebooks yourself on Colab, then give the agent the metrics files to wire in. Never let an agent invent results.
5. If the agent's context gets long or confused, start a new chat with the **Session start** prompt.
6. Re-read `docs/IP_AND_COMPLIANCE.md` §7 gates before making the repo public or posting anything.
