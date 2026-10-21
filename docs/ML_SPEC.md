# ML_SPEC: LOOP

All metrics below are **targets to be measured**. Never write a number into a doc, README, or figure unless it came from a logged run. Unmeasured = `TBD (not yet measured)`.

## 0. Global rules

- Every model: **baseline + improved model + frozen test set + model card + ONNX export + confidence threshold**.
- Splits: train / val / test = 70 / 15 / 15, stratified; test frozen by file-hash manifest (`ml/data/manifests/`). Deduplicate across splits using perceptual hash (Hamming ≤ 6) so near-identical photos never straddle splits. For multi-photo listings, split **by listing**, not by photo.
- Seeds: 3 seeds minimum for the main models; report mean ± std.
- Compute: Colab/Kaggle GPU; models small enough to serve on CPU (target p95 server inference < 1 s per listing for the whole analyze call; to be measured).
- Honest labels: rule-based features are never described as ML.
- Licences: every model, pretrained checkpoint and dataset must be permissively licensed and logged in `THIRD_PARTY_LICENSES.md` (no AGPL/GPL, e.g. no Ultralytics YOLOv8). Verify at time of use.
- Fairness check: report metrics per category and per price band.
- Model cards (`ml/model_cards/<name>.md`): data, intended use, limits, failure cases, metrics, version.

## 1. Datasets

| Dataset     | Source                                                                                                                         | Size target              | Labels                                                        | Notes                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| LOOP-Images | Own consented photos (volunteers, hostels, societies)                                                                          | ~1,500 to 3,000          | category, subtype, brand (where visible), condition (ordinal) | ≥2 annotators; third resolves ties; report Cohen's kappa (weighted for condition)   |
| LOOP-Price  | Public used-goods datasets for pipeline dev + several hundred to ~1,000 manually observed local listings                       | as available             | price, attributes, age, condition                             | store only price + text features; no personal data or copied images; check licences |
| LOOP-Search | Hand-written queries                                                                                                           | ~50 (English + Hinglish) | relevance 0/1/2 per candidate                                 | pool top-20 from baseline and improved system for judging                           |
| LOOP-Scrub  | Photos with sensitive regions (staged: faces of consenting volunteers, mock ID cards, plates, printed phone numbers/addresses) | ~300 to 500 images       | boxes + class                                                 | **recall is the key metric**; use only staged/consented content                     |
| LOOP-Scam   | Synthetic + hand-labelled chat/listing texts                                                                                   | few hundred              | scam / not scam                                               | labelled `simulated` where synthetic                                                |
| LOOP-Sim    | Output of `sim/`                                                                                                               | any                      | n/a                                                           | always `data_origin = simulated`                                                    |

Annotation tooling: Label Studio (local) or a simple CSV + image viewer; export to `ml/data/processed/*.parquet`.

## 2. Product recognition

- **Task:** photo(s) → category (4), subtype (~20 to 40 classes), brand/model (best effort).
- **Baseline:** CLIP zero-shot (ViT-B/32) with text prompts per class.
- **Improved:** CLIP image embeddings + linear probe; alternative: fine-tuned EfficientNet-B0 / ConvNeXt-Tiny. Choose by val performance and CPU latency.
- **Multi-photo:** average embeddings (or max-confidence).
- **Brand/model:** zero-shot against a candidate list + OCR text on the photo (reuse scrubber OCR); present as suggestion only.
- **Metrics:** top-1, top-5, macro-F1, per-class F1, confusion matrix, calibration (ECE).
- **Threshold:** below `T_cat` (set so val precision ≥ 0.9 on accepted predictions) → ask the user, show top-3.
- **Export:** ONNX; verify vs PyTorch.

## 3. Condition grading

- **Labels:** ordinal 0..3 (Poor, Fair, Good, Like New).
- **Baseline:** plain CNN (cross-entropy), same backbone.
- **Improved:** ordinal approach (CORAL / cumulative-link or expected-value regression with rounding) + Grad-CAM heatmap.
- **Metrics:** accuracy, **quadratic weighted kappa**, MAE on grade, confusion matrix, human annotator agreement as the ceiling reference.
- **Limit (state in UI):** some defects are not visible; grade is editable.
- **Explainability check:** on ~50 images, manually judge whether heatmaps overlap visible wear (report the fraction; do not call it "faithful" without this check).

## 4. Price estimation

- **Features:** category, subtype, brand, model, condition, age, attributes (storage, material, edition...), text embedding (reduced via PCA), month.
- **Baselines:** (a) category-median lookup, (b) linear regression, (c) random forest.
- **Improved:** LightGBM quantile regression (q=0.1, 0.5, 0.9) + **conformal calibration** (split conformal on a calibration set) for interval coverage guarantees.
- **Explainability:** SHAP top-3 contributing features, shown as plain language ("brand and storage raised the estimate").
- **Metrics:** MAE, MAPE, median APE, interval coverage (target nominal 80%), mean interval width, per-category and per-price-band breakdown.
- **Fair-deal badge:** `price_ask < low` → "Great"; `low ≤ price_ask ≤ high` → "Fair"; `> high` → "Overpriced". Rule-based on model output.
- **Fallback:** when features are insufficient (unknown subtype), widen interval and mark "low confidence".

## 5. Semantic search and similar items

- **Text:** multilingual sentence embeddings (e.g. `paraphrase-multilingual-MiniLM-L12-v2`, 384-d) → pgvector. Hinglish handled by the multilingual model; evaluate Hinglish queries separately.
- **Image:** CLIP image embeddings (512-d) for search-by-image and duplicates.
- **Query parsing (rule-based):** extract price ceilings ("under 3000"), and place names, into SQL filters; remaining text embedded.
- **Baseline:** Postgres full-text search (`mode=fts`).
- **Metrics:** Recall@5/10, NDCG@10, MRR, split by English vs Hinglish. Also report latency p50/p95.
- **Ablation:** semantic only vs semantic + filters vs FTS.

## 6. On-device inference and the photo privacy scrubber (combined)

Goal: _photos never leave the phone unscrubbed._

### 6.1 Photo-quality check (on-device)

- **Task:** blur / too dark / cluttered / OK (multi-label or 4-class).
- **Baseline:** classical heuristics (variance of Laplacian for blur, mean luminance for darkness).
- **Model:** MobileNetV3-Small (or similar) fine-tuned on LOOP-Images with synthetic degradations (Gaussian blur, brightness) plus real labelled examples; export to ONNX; run via `onnxruntime-web` (WASM; WebGL/WebGPU if available).
- **Required experiment (one model only):** server ONNX CPU vs browser ONNX Web. Compare **accuracy (identical weights → expect equal within tolerance), latency p50/p95 on ≥2 device classes (a mid-range phone and a laptop), model size, upload bytes saved, server compute avoided.** Include network round-trip for server path.

### 6.2 Scrubber

- **Detect:** faces, ID cards, number plates, phone numbers, addresses.
- **Faces:** lightweight detector (e.g. YuNet/BlazeFace/Ultralight ONNX).
- **Plates and ID cards:** small object detector with a **permissive licence** (e.g. YOLOX-Nano/Tiny under Apache-2.0, or another Apache/MIT detector; verify the licence of the exact code and weights) fine-tuned on LOOP-Scrub + public plate/ID-like data whose licence allows it; export ONNX. **Do not use Ultralytics YOLOv8 (AGPL-3.0).**
- **Text (phone numbers/addresses):** OCR (tesseract.js or small ONNX OCR such as PaddleOCR det+rec) then regex for Indian phone numbers (`(\+91[\- ]?)?[6-9]\d{9}`) and address heuristics (PIN code `\b\d{6}\b`, tokens like "Flat", "Road", "Nagar"). Blur the OCR boxes of matches.
- **UX:** blurred preview; user can add, resize or remove boxes. The blurred pixels are applied client-side (canvas) with strong Gaussian/pixelation (irreversible: heavy pixelation, not light blur).
- **Server safeguard:** `/scrub-verify` reruns the detector on the uploaded image; if a high-confidence sensitive region is unblurred, publishing is blocked and the user is asked to fix.
- **Metrics:** per-class **recall** (primary), precision, IoU-matched; over-blur rate (blurred area fraction of non-sensitive objects); end-to-end "residual leak rate" (images with ≥1 missed sensitive region after scrubbing); on-device latency per image.
- **Limit (state in docs):** staged test set; real-world recall may differ.

## 7. Active learning loop (human-in-the-loop)

**Signal:** when a seller edits an AI-predicted category, subtype, condition or price, a `corrections` row stores `(image/listing, ai_value, user_value, confidence, model_version)`.

**Eligibility filter (anti-poisoning):** `eligible_for_training = true` only if the user is verified and has ≥1 completed trade, or an admin approved it; price corrections must lie within robust bounds of similar items (e.g. within 3× MAD of the category-condition median); conflicting corrections on the same listing keep the latest.

**Retraining:** periodic job (e.g. weekly or every N=50 new eligible corrections), `ml/src/active_learning/retrain.py`:

1. Merge new eligible corrections into the training set.
2. Retrain candidate (same architecture/hyperparams; fine-tune the linear head or last layers for recognition/condition; refit LightGBM for price).
3. Evaluate on the **frozen test set**.
4. **Promote only if** the candidate beats the active model on the primary metric by a margin and does not regress any class by more than a set tolerance. Else keep active model.
5. Write `model_versions`; export ONNX; keep rollback.

**Research experiment (the headline figure):**

- Start from a deliberately small seed training set (e.g. 20% of training data).
- Reveal the remaining labelled pool as simulated "corrections" in batches (0, 25, 50, 100, 200, 400, ...).
- Compare three acquisition strategies: **(a) random**, **(b) uncertainty sampling** (lowest confidence/entropy; i.e. the realistic case where low-confidence items get corrected), **(c) actual correction stream** (only items the model got wrong, which mirrors real seller behaviour).
- Plot test accuracy (recognition), QWK (condition) and MAPE (price) vs number of corrections, mean ± std over ≥5 seeds.
- Optional bonus: add real pilot corrections as a separate, clearly labelled curve.
- **State clearly:** simulated corrections assume users correct reliably; run a variant with 10% and 20% label noise to show robustness.

## 8. Fraud, duplicates, scam text, trust (mix of ML and rules)

| Feature         | Method                                                                                                                 | Label as    | Metrics                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| Duplicate image | perceptual hash (Hamming) → CLIP cosine similarity re-check                                                            | algorithmic | precision, recall on synthetic near-duplicates (crop, resize, JPEG, brightness) |
| Stolen image    | same, across different sellers                                                                                         | algorithmic | as above                                                                        |
| Price anomaly   | price < `0.4 × predicted low` or z-score on residuals                                                                  | rule-based  | precision/recall on injected anomalies                                          |
| Scam text       | baseline keyword rules → TF-IDF + logistic regression → (optional) small transformer                                   | ML          | precision, recall, FPR at fixed recall                                          |
| Trust score     | weighted sum, weights in config: verification, completed trades (log-scaled), response time, rating (Bayesian average) | rule-based  | sensitivity/robustness in simulator                                             |

Trust formula (default): `T = 100 × (0.25·V + 0.30·log1p(trades)/log1p(50) + 0.15·R_resp + 0.30·BayesRating/5)`, V∈{0,1}, R_resp∈[0,1]. Document and expose the breakdown.

## 9. Marketplace simulator (`sim/`)

**Purpose:** answer cold-start and scale questions; evaluate swap engine, trust score, fraud detection and price-drop heuristic at scale. **Everything it produces is synthetic and must be labelled so.**

### 9.1 Design (agent-based, discrete time)

- **Agents:** users (N = 100 → 10,000), types: student, family, donor, scammer (fraction `p_fraud`), reseller.
- **Attributes:** community, location (coarse grid), honesty, price sensitivity, responsiveness, patience, items owned (category, condition, true value), wishlist.
- **Step (one day):** agents list items (price = true_value × markup noise; scammers underprice and copy images), browse (search quality parameter), message, negotiate (accept if price ≤ willingness-to-pay), complete handovers (success prob depends on trust), leave ratings (honest users rate truthfully with noise; scammers may create fake reviews).
- **Seeds:** all randomness from a single seed; configs in `sim/configs/*.yaml`.
- **Calibration:** where pilot data exists (listing counts, price distributions, time-to-sale), fit the parameters; document which are assumed vs calibrated.

### 9.2 Experiments

| Experiment        | Question                                                                                                         | Output                                                |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Swap scaling      | How do trades enabled and solve time grow with N (100 → 10k) and wishlist density? ILP vs greedy 2-way           | table + log-log plot of solve time; trades enabled    |
| Swap cycle length | Gain from allowing 3-party vs 2-party                                                                            | bar chart                                             |
| Trust score       | Does the score separate honest users from scammers over time? Resilience to fake-review rings                    | AUC of trust vs scammer label; sensitivity to weights |
| Fraud detection   | Precision/recall at scale as `p_fraud` varies; effect on time-to-detect                                          | PR curves                                             |
| Price drop        | Does the heuristic reduce time-to-sale without lowering revenue too much vs no-drop and fixed-schedule baselines | time-to-sale CDF; revenue ratio                       |
| Cold start        | Time to first match vs number of seeded listings and community size                                              | heatmap                                               |

### 9.3 Validity rules

- Run **sensitivity analysis** on every key assumption (±50% on behavioural parameters) and report which conclusions are robust.
- Do not claim real-world performance from the simulator; say "under the simulated assumptions".
- Where the same assumption drives both the system and the evaluation (e.g. buyer demand in price-drop), say so explicitly as a limitation.

## 10. Swap engine (algorithmic, not ML)

- **Graph:** nodes = users; edge A→B if A's listed swap item satisfies B's want (category match + embedding similarity ≥ τ + price within tolerance δ).
- **Solver:** maximise number of users in disjoint cycles of length 2 to 3 (CP-SAT/ILP; enumerate cycles ≤3 then set-packing). Greedy 2-way as baseline.
- **Fairness constraint:** value mismatch within δ per edge (configurable) so no one is forced into a bad trade; all parties must confirm.
- **Metrics:** trades enabled, users matched %, solve time, value imbalance.

## 11. Dynamic price-drop suggestions (P2, heuristic)

- **Features:** listing age, views, saves, chats started, ask/predicted-likely price ratio, category, similar-item time-to-sale (from `price_history`/completed trades).
- **Model:** survival/hazard-style: estimate `P(sale within 7 days | features, price ratio)` via logistic regression or Cox model on (simulated + any pilot) data. Suggest a drop to the lowest-regret price `p*` that raises `P` by at least Δ, never below a floor (e.g. `0.6 × predicted_low`) and never more than 15% per step.
- **Trigger:** e.g. ≥7 days active and views above the category median but zero offers → "No offers in 7 days; dropping to ₹X raises the chance of sale."
- **Baselines:** no suggestion; fixed schedule (-10% every 7 days).
- **Metrics:** time-to-sale, sale rate within 30 days, revenue ratio (sale price / initial ask), acceptance rate of suggestions (pilot only).
- **Limitation (always state):** if evaluated on the simulator, buyer behaviour is assumed; validate on pilot data when available.

## 12. Impact estimator (algorithmic)

- Lookup table: category/subtype → embodied emissions (kg CO₂e) and weight (kg), from **cited** sources (e.g. published LCA/manufacturer product environmental reports); store in `ml/data/impact_factors.csv` with `source`, `year`, `confidence`.
- Avoided CO₂ = `embodied_CO2 × reuse_displacement_factor` (assumption: fraction of purchases displaced; default range 0.3 to 0.8 with sensitivity analysis).
- Show ranges, not false precision. Document methodology in `docs/IMPACT_METHOD.md`.

## 13. Evaluation checklist per model (copy into each model card)

- [ ] Baseline implemented and scored
- [ ] Frozen test set hash recorded
- [ ] Primary + secondary metrics, mean ± std over seeds
- [ ] Per-category / price-band breakdown
- [ ] Error analysis with ≥10 failure examples
- [ ] Calibration / confidence threshold chosen on val, not test
- [ ] ONNX exported and parity-checked
- [ ] Latency (p50/p95) measured on target hardware
- [ ] Limits and intended use written

## 14. Ablations to run (for the report)

Remove: semantic search (→ FTS), AI listing draft (→ manual), explanations (SHAP/Grad-CAM), scrubber, active-learning updates; measure the effect on search metrics, listing time, user trust (user study) and accuracy over time.

## 15. Figures the report must contain

1. Active learning: accuracy vs corrections (3 strategies, error bands)
2. On-device vs server latency (box plot) + size/upload trade-off
3. Scrubber per-class recall/precision + residual leak rate
4. Price: predicted vs actual, interval coverage plot, SHAP example
5. Condition: confusion matrix + example Grad-CAM
6. Search: Recall@k/NDCG vs baseline, English vs Hinglish
7. Simulator: swap scaling, trust AUC, fraud PR curves, price-drop time-to-sale
8. User study: time with/without AI, SUS, trust with/without explanations
