# IP_AND_COMPLIANCE: LOOP

This is an engineering checklist, not legal advice. Confirm all ownership, licensing and filing details with your university's IP cell or a qualified lawyer, and check the official Copyright Office portal for current requirements and fees.

## 1. Ownership and authorship (settle in writing BEFORE building further)
- [ ] Read the university's IP policy for student projects: who owns the work (students, university, or shared)?
- [ ] Written agreement between the two authors: joint or sole ownership, order of names, who can license, what happens to future development.
- [ ] Supervisor's role and any claim they or the university make.
- [ ] Anyone else who contributed code, labels, photos or designs: contribution terms or acknowledgement.
- [ ] Whether the project may be used in competitions, startups or commercial pilots.
Record the outcome here: `TBD`.

## 2. What copyright does and does not cover
- **Covered (as original written works):** source code, documentation, UI designs, original datasets (selection and arrangement), original images you took, written report.
- **Not covered:** ideas, algorithms, methods, and the product concept themselves.
- **Patent (separate and optional):** would address novel methods but requires novelty. Publishing a paper, posting the repo or presenting publicly **before** filing can destroy novelty. If a patent is even a possibility, decide this before any publication or public repo. If you only want copyright, publishing is fine.
Decision: `copyright only` / `patent considered` → `TBD`.

## 3. Ethics and consent (needed for the paper and good practice anyway)
- [ ] Ethics committee approval before data collection (Phase 2) and the user study (Phase 18), or a written exemption.
- [ ] Participant consent form for photos (people may appear; items may show personal info), including how data is used, stored, shared and deleted, and the right to withdraw.
- [ ] User-study consent form; anonymised data; no identifiers in analysis files.
- [ ] Volunteers' photos used only with explicit permission; faces and documents appear only in the staged LOOP-Scrub set from consenting volunteers.
- [ ] Align with the principles of India's Digital Personal Data Protection Act, 2023 (consent, purpose limitation, minimisation, deletion on request).
- [ ] Store consent records separately from datasets.

## 4. Third-party licence audit (agents must keep this current)
Rule: only permissive licences (MIT, BSD, Apache-2.0, ISC, CC0, CC-BY) for anything in the product or its distributed code. Anything else needs the owner's approval and a written reason. Log every dependency, model and dataset in `THIRD_PARTY_LICENSES.md` with: name, version, licence, URL, use, and whether it is bundled or only used offline.

**Known flags to resolve**
| Item | Issue | Action |
|---|---|---|
| YOLOv8 / Ultralytics | AGPL-3.0 (strong copyleft); can force the whole project open | **Do not use.** Use a permissively licensed detector (e.g. YOLOX Apache-2.0, or another Apache/MIT model); verify at the time of use |
| CLIP weights/code | Check the exact checkpoint's licence | Record in the log |
| Sentence-embedding models | Licences vary per model | Record; prefer Apache/MIT models |
| OCR (tesseract.js, PaddleOCR) | Typically Apache-2.0; verify | Record |
| Public price datasets | Dataset licences and terms vary (some non-commercial) | Record; do not redistribute if prohibited |
| Face/plate/ID datasets | Often restricted or non-commercial | Prefer your own staged data; record any external source |
| Superpowers skills (obra/superpowers or an Antigravity port) | Dev tooling, MIT per upstream (verify the exact repo/port you install) | Log name, version/commit and licence; pin the version; do not auto-update; skim skills before use since the agent obeys them |
| OpenStreetMap / map tiles | Attribution (ODbL) and tile-provider terms | Add attribution; use a permitted tile source |
| Emission factors (impact estimator) | Cite source and year | Log in `impact_factors.csv` |
Verify each licence against the upstream source at the time of use; do not rely on memory.

## 5. Project's own licence and headers
- [ ] Decide the project's licence after §1 and §2: copyright-reserved (all rights reserved), or an open-source licence. This choice is the owners', and an open licence affects later commercial options.
- [ ] Add to every source file: `Copyright (c) <year> <owner names>. <licence or "All rights reserved">`.
- [ ] `LICENSE` file and `NOTICE` (third-party attributions) in the repo root.
- [ ] Keep the repo **private** until the publish-versus-patent decision (§2) is made.

## 6. Copyright filing checklist (India; verify current process and fees)
- [ ] Ownership/authorship agreement (§1) completed.
- [ ] Work description: title, nature (computer software / literary work), language, year of creation, whether published.
- [ ] Source-code deposit prepared (commonly requested as excerpts of the first and last pages; confirm exact requirement), clean and consistently headed.
- [ ] Declaration of originality and list of third-party components and licences (§4).
- [ ] Applicant details, NOC from the university if required by its policy.
- [ ] Fee payment and filing through the official Copyright Office process.
- [ ] Keep dated archives: git history, release tags, signed snapshot of the filed version.
Separate registrations may be considered for the report and the dataset; confirm with the IP cell.

## 7. Release and publication gates
| Gate | Required before |
|---|---|
| Ownership agreement signed | Any filing, any public release |
| Licence audit clean | Public repo or filing |
| Ethics approval | Data collection and user study |
| Publish-vs-patent decision made | Posting repo, preprint, or submitting paper |
| Dataset release check (consent, scrubbed, licences) | Releasing any data |
| Claim audit (PAPER_PLAN §9) | Paper submission |

## 8. Agent rules (also in AGENTS.md)
- Before adding any dependency, model or dataset, check its licence against §4 and log it.
- Add the copyright header to every new source file.
- Never commit consent forms, participant data, or raw photos with people or documents.
- Never publish or push to a public remote without the owner's explicit approval.
