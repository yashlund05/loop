# PRD: LOOP

## 1. Summary
LOOP is a hyperlocal web/PWA marketplace where verified community members sell, donate and swap pre-owned goods (Electronics, Furniture, Books, Hobbies & Recreation). AI removes the tedious parts of reselling. **Thesis: a human-in-the-loop, explainable, privacy-preserving AI marketplace for local reuse.**

## 2. Problem
Listing is slow, pricing is guesswork, condition is opaque, trust is weak, and donation/exchange are under-served. Central question: *how can an AI-assisted local marketplace simplify resale and reuse while improving discovery, price transparency and trust?*

## 3. Goals and non-goals
**Goals**
1. A deployed marketplace with real accounts, database, realtime chat.
2. Listing in about 30 seconds via AI drafting (measured, not assumed).
3. Explainable condition and price guidance.
4. Semantic, multilingual (English + Hinglish) and image search.
5. Privacy-preserving photos (scrub before publish) and trust via verification, handover and fraud flags.
6. A system that learns from user corrections (active learning loop).
7. Every AI component evaluated against a baseline; whole system evaluated with a user study.

**Non-goals (v1):** real payments, native mobile app, courier logistics, multi-city federation, collaborative-filtering recommendations.

## 4. Personas
| Persona | Need |
|---|---|
| Student / hostel resident | Cheap goods; sell before moving out |
| Housing-society family | Declutter to neighbours safely |
| Donor | Give away usable items fairly |
| Moderator / admin | Review flags, keep platform safe |

## 5. Features and priorities
P0 = must ship. P1 = ships if on schedule. P2 = only after P0/P1 are stable. Each has acceptance criteria (AC).

### 5.1 Accounts, identity, trust
- **P0 Auth and profile.** Signup/login, coarse area. AC: protected routes reject anonymous users; no exact address stored.
- **P0 Community verification** via college email domain or society code; Verified badge. AC: wrong code rejected; verified flag visible on profile and listings.
- **P0 Reviews** only after a completed handover. AC: review endpoint returns 403 without a completed handover.
- **P1 Trust score** (rule-based) from verification, completed trades, response time, ratings; breakdown visible. AC: score recomputes after each trade; breakdown matches formula in ML_SPEC §8.

### 5.2 Listing creation
- **P0 Snap-to-List.** 1 to 5 photos → predicted category, sub-type, likely brand/model, draft title and description; user edits and confirms. AC: all AI fields editable; nothing publishes without confirm; low confidence prompts the user.
- **P0 Condition grader** (Like New / Good / Fair / Poor) with Grad-CAM heatmap; editable. AC: heatmap displayed; grade editable.
- **P0 Photo privacy scrubber.** Detect and blur faces, ID cards, number plates, phone numbers, addresses before publish. AC: user sees a preview with blurred regions and can add/remove boxes; the published image is the scrubbed one; original is never public.
- **P0 On-device photo-quality check** (blur, darkness, clutter) runs in browser before upload. AC: works offline after first load; reports latency.
- **P1 Smart autofill** of specs, approximate age, visible defects (from recognition + text templates, not a separate model).

### 5.3 Discovery
- **P0** Category browse, filters (price, condition, distance, type), map view.
- **P0 Semantic search** (English + Hinglish), e.g. "study table under 3000 near Wakad". AC: beats Postgres full-text baseline on the 50-query set (Recall@k, NDCG).
- **P1** Search by image. **P1** Saved searches with alerts. **P1** "Similar items" (embedding nearest neighbours; replaces full recommender).

### 5.4 Pricing intelligence
- **P0 Price estimator:** low / likely / high range with top reasons (SHAP). AC: interval coverage reported; reasons displayed.
- **P0 Fair-deal badge:** Great / Fair / Overpriced from the predicted range.
- **P2 Dynamic price-drop suggestions:** "No offers in 7 days; dropping to ₹X raises the chance of sale." Rule/hazard-based heuristic using listing age, views, saves and similar-item sale times. Labelled as a heuristic.

### 5.5 Transactions
- **P0** Sell and donate flows; status: active, reserved, completed.
- **P0 Safe handover:** suggested public meetup points; QR or OTP; trade completes only when both sides confirm.
- **P1 Swap engine:** declare haves/wants; find 2- and 3-party cycles using optimisation; every party must confirm. (4-party dropped.)

### 5.6 Chat
- **P0** Realtime chat per listing.
- **P1 Chat safety:** scam-pattern warnings (advance payment, off-platform). **P1 Negotiation helper:** counter-offer suggestions from the price range (rule-based).

### 5.7 Safety and moderation
- **P1** Duplicate / stolen-image detection (perceptual hash + embedding similarity). **P1** Price-anomaly flag. **P1** Scam-text classifier.
- **P1 Moderation queue:** AI flags with a reason, human decides; **P1 audit log** of every action.

### 5.8 Learning and research features
- **P1 Active learning loop.** Seller corrections (category, condition, price) are stored as labelled examples; models retrained periodically; a promoted model must beat the current one on the frozen test set. AC: accuracy-vs-corrections figure produced with a random-sampling baseline.
- **P1 Marketplace simulator** (synthetic, labelled) to evaluate swaps, trust score, fraud detection and price drops at scale. AC: reproducible from a seed; sensitivity analysis included.
- **P1 Impact dashboard:** CO₂ and e-waste avoided using cited emission factors; documented methodology; sensitivity analysis.

### 5.9 Admin
- **P1** Dashboard: listings, flags, users, funnel, model health (confidence, drift indicators). **P1** Audit log.

## 6. Cut list (do NOT build unless the owner asks)
Voice listing, payments sandbox, NGO pickup partners, Lend listings, leaderboards and monthly reports, auto-translation, 4-party swaps, full recommender, repair-to-resell hint, demand heatmap, moving-out bundles, background removal.
*If behind schedule, cut in this order:* price-drop suggestions → image search → saved-search alerts → impact dashboard → smart autofill. **Never cut:** baselines, frozen test sets, active-learning figure, user study.

## 7. Vertical slice (build this first, then widen)
photo → on-device quality check → scrub → category/condition/price → confirm and publish → search → chat → handover → review. Stubbed AI endpoints are acceptable until their phase.

## 8. Success metrics (targets, not claims; fill with measured values)
| Area | Metric | Target |
|---|---|---|
| Listing time | Median seconds with AI vs without | AI faster (paired test) |
| Category | Top-1 accuracy | beats CLIP zero-shot baseline |
| Condition | Quadratic weighted kappa | beats plain CNN baseline |
| Price | MAPE, 80% interval coverage | beats random forest baseline; coverage near 80% |
| Search | Recall@10, NDCG@10 | beats Postgres FTS |
| Scrubber | Recall of sensitive regions | prioritise recall; report precision |
| Active learning | Accuracy vs #corrections | rising curve; beats random sampling |
| Usability | SUS | report with n and CI |
All values start as `TBD (not yet measured)`.

## 9. User study (about 30 to 50 students)
Tasks: create a listing, find an item, negotiate, propose a swap. Measures: time with/without AI, SUS, trust and fairness ratings, with/without explanations. Paired t-test or Wilcoxon signed-rank. Written consent, anonymised data.

## 10. Risks
| Risk | Mitigation |
|---|---|
| Not enough real data | Start collection in Phase 2; pretrained baselines; disclose limits |
| Real corrections are sparse | Simulate corrections from held-out labels; add real ones as a bonus; say so |
| Simulator results reflect assumptions | Sensitivity analysis; calibrate on pilot data; label synthetic |
| Scope creep | Cut list and priority tiers |
| Free hosting too weak for models | Small ONNX models; async inference; on-device where possible |
| Cold start | Seed listings; community verification; campus pilot |

## 11. Research output and IP
The finished project will be written up as a research paper and filed for copyright. This adds requirements: ethics approval and consent before data collection and the user study, permissive-licence-only dependencies, traceable results, and a publish-versus-patent decision before any public release. See `PAPER_PLAN.md` and `IP_AND_COMPLIANCE.md`.
