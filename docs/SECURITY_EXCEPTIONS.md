# Security Exceptions Log: LOOP

Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

This document logs known security advisories that are accepted as non-blocking exceptions in the project, documenting the advisory ID, root cause, scope (production vs dev-only), justification, mitigation, and scheduled re-review date.

---

## Active Security Exceptions

### 1. `GHSA-vfj7-8cjw-p6xm` (`braces`)

| Field                 | Detail                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Advisory ID**       | `GHSA-vfj7-8cjw-p6xm` (CVE-2024-4068)                                                                                                                                                          |
| **Affected Package**  | `braces` (`<=3.0.3`)                                                                                                                                                                           |
| **Severity**          | High (CVSS: 7.5)                                                                                                                                                                               |
| **Dependency Path**   | `apps/web` $\rightarrow$ `eslint-config-next` $\rightarrow$ `@next/eslint-plugin-next` $\rightarrow$ `fast-glob` $\rightarrow$ `micromatch` $\rightarrow$ `braces`                             |
| **Dev-Only**          | **YES** (Only installed during development/linting; never bundled in client or server production builds)                                                                                       |
| **Downstream Impact** | Also triggers transitive advisories for parent dev-packages: `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, and `eslint-config-next` (5 reported high vulnerabilities in `npm audit`). |
| **Patched Version**   | None. The latest release on npm is `3.0.3`, which remains the latest upstream release.                                                                                                         |
| **Production Impact** | **None.** Verified via `npm audit --omit=dev --audit-level=high` which returns **0 vulnerabilities**.                                                                                          |
| **Justification**     | `braces` is only invoked locally or during CI when Next.js ESLint parses file globs for linting. It is never exposed to untrusted external user input at runtime.                              |
| **Review Date**       | 2026-11-22 (Monthly audit check)                                                                                                                                                               |

---

## Audit Policy in CI Pipeline

1. **Production Runtime Audit (Blocking):**
   - Backend: `pip-audit -r apps/api/requirements.txt` (must report 0 known vulnerabilities).
   - Frontend: `npm audit --omit=dev --audit-level=high` (must report 0 production vulnerabilities).
2. **Development Audit (Non-Blocking / Informational):**
   - Frontend: `npm audit` runs to monitor dev-dependency posture without blocking build pipelines for unpatched upstream dev tools.
