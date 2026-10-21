# Security Exceptions Log: LOOP

Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.

This document logs known security advisories that are accepted as non-blocking exceptions in the project, documenting the verified advisory ID, CVE ID, affected range, fix status, root cause, scope (production vs dev-only), justification, mitigation, and scheduled re-review date.

---

## Active Security Exceptions

### 1. `GHSA-vfj7-8cjw-p6xm` (`CVE-2026-93687`) — `braces`

| Field                            | Detail                                                                                                                                                                                                                                        |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Advisory ID**                  | `GHSA-vfj7-8cjw-p6xm`                                                                                                                                                                                                                         |
| **CVE ID**                       | `CVE-2026-93687` (Verified from GitHub Advisory API; distinct from older CVE-2024-4068 which was patched in 3.0.3)                                                                                                                            |
| **Summary**                      | Stack-exhaustion denial of service through deeply nested patterns in recursive AST walkers lacking depth guards                                                                                                                               |
| **Affected Package**             | `braces`                                                                                                                                                                                                                                      |
| **Vulnerable Range**             | `<= 3.0.3` (All published versions of `braces` through `3.0.3`)                                                                                                                                                                               |
| **First Patched Version**        | **None** (`first_patched_version: None` in GitHub Advisory database; no version $>3.0.3$ exists on npm)                                                                                                                                       |
| **Severity**                     | High (CVSS: 7.5 - `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:H`)                                                                                                                                                                             |
| **Dependency Path**              | `apps/web` (`devDependencies`) $\rightarrow$ `eslint-config-next@15.5.27` $\rightarrow$ `@next/eslint-plugin-next` $\rightarrow$ `fast-glob` $\rightarrow$ `micromatch` $\rightarrow$ `braces@3.0.3`                                          |
| **Dev-Only Scope**               | **YES** (Only used at build/lint time via Next.js ESLint plugin; never bundled into production client or server bundles)                                                                                                                      |
| **Downstream Impact**            | Triggers transitive npm audit warnings for parent packages: `micromatch`, `fast-glob`, `@next/eslint-plugin-next`, and `eslint-config-next` (accounting for all 5 reported high vulnerabilities in `npm audit`).                              |
| **`npm audit fix --force` Note** | Running `npm audit fix --force` **does not** patch `braces`; it merely forces a major downgrade of `eslint-config-next` to `14.2.35` (an older Next.js 14 release), breaking Next.js 15 App Router compatibility. It is not an authentic fix. |
| **Production Impact**            | **None.** Verified via `npm audit --omit=dev --audit-level=high` which returns **0 vulnerabilities**.                                                                                                                                         |
| **Justification**                | `braces` is invoked strictly by the Next.js ESLint runner during local development and CI lint steps to match static source file paths. It never parses untrusted user input or runs in production.                                           |
| **Review Date**                  | 2026-11-22 (Monthly audit check for any upstream `braces` release)                                                                                                                                                                            |

---

## Audit Policy in CI Pipeline

1. **Production Runtime Audit (Blocking):**
   - Backend: `pip-audit -r apps/api/requirements.txt` (must report 0 known vulnerabilities).
   - Frontend: `npm audit --omit=dev --audit-level=high` (must report 0 production vulnerabilities).
2. **Development Audit (Non-Blocking / Informational):**
   - Frontend: `npm audit` runs to monitor dev-dependency posture without blocking build pipelines for unpatched upstream dev tools.

---

## 4. Known Architectural Limitations

### 1. In-Memory Join-Code Rate Limiter (`apps/api/app/services/rate_limiter.py`)

- **Limitation:** The in-memory sliding-window state (`JoinCodeRateLimiter`) is single-instance only and resets upon application restart or worker respawn.
- **Scope:** Accepted for Phase 3 development, testing, and single-instance container deployments.
- **Production Migration Path:** For distributed, multi-instance production deployments behind a load balancer, the in-memory counter must be replaced with a Redis / Valkey sliding-window key or a PostgreSQL bucket using atomic transaction primitives.
