# Third-Party Licenses

All dependencies, models, datasets, and tooling used in LOOP must adhere to permissive licenses (MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause, ISC, CC0, CC-BY) per `docs/IP_AND_COMPLIANCE.md` §4 and `AGENTS.md` §2. Copyleft/GPL/AGPL software is strictly prohibited.

---

## 1. Development & Agent Tooling

| Component | Version / Commit | License | Upstream Source | Purpose / Notes |
|---|---|---|---|---|
| Superpowers Skills | Local checkout in `.agent/` (Installed: 2026-10-10) | MIT (Upstream core) | `https://github.com/obra/superpowers` (port for Antigravity) | Agent execution workflows and skills |
| `ayush-frontend` skill | Local in `.agent/skills/ayush-frontend` | Unknown (FLAGGED) | Unknown / unverified source in `.agent/` | **[FLAGGED FOR OWNER REVIEW]**: Non-standard skill found in `.agent/`. Do not use for LOOP. |
| `single-flow-task-execution` skill | Local in `.agent/skills/single-flow-task-execution` | Unknown (FLAGGED) | Unknown / unverified source in `.agent/` | **[FLAGGED FOR OWNER REVIEW]**: Custom Antigravity workflow profile found in `.agent/`. |

---

## 2. Backend Runtime & Test Dependencies (`apps/api`)

| Package | Version | License | Upstream URL | Use |
|---|---|---|---|---|
| `fastapi` | 0.142.4 | MIT | `https://github.com/fastapi/fastapi` | Web API framework (audited & patched) |
| `starlette` | 1.7.0 | BSD-3-Clause | `https://github.com/encode/starlette` | ASGI toolkit |
| `pydantic` | 2.10.4 | MIT | `https://github.com/pydantic/pydantic` | Data validation and schemas |
| `pydantic-settings` | 2.7.0 | MIT | `https://github.com/pydantic/pydantic-settings` | Environment settings management |
| `uvicorn` | 0.34.0 | BSD-3-Clause | `https://github.com/encode/uvicorn` | ASGI web server |
| `sqlalchemy` | 2.0.36 | MIT | `https://github.com/sqlalchemy/sqlalchemy` | ORM & database query builder |
| `alembic` | 1.14.0 | MIT | `https://github.com/sqlalchemy/alembic` | Database migrations |
| `asyncpg` | 0.32.0 | Apache-2.0 | `https://github.com/MagicStack/asyncpg` | Async PostgreSQL driver |
| `httpx` | 0.28.1 | BSD-3-Clause | `https://github.com/encode/httpx` | HTTP client (tests & API calls) |
| `pytest` | 9.1.1 | MIT | `https://github.com/pytest-dev/pytest` | Test runner (audited & patched) |
| `pytest-asyncio` | 1.4.0 | Apache-2.0 | `https://github.com/pytest-dev/pytest-asyncio` | Async testing plugin |
| `ruff` | 0.8.4 | MIT / Apache-2.0 | `https://github.com/astral-sh/ruff` | Fast Python linter |
| `black` | 26.10.0 | MIT | `https://github.com/psf/black` | Python code formatter (audited & patched) |
| `mypy` | 1.14.0 | MIT | `https://github.com/python/mypy` | Static type checker |

---

## 3. Frontend Runtime & Build Dependencies (`apps/web`)

| Package | Version | License | Upstream URL | Use |
|---|---|---|---|---|
| `next` | 15.5.27 | MIT | `https://github.com/vercel/next.js` | React PWA framework (App Router, audited) |
| `react` | 19.0.0 | MIT | `https://github.com/facebook/react` | UI library |
| `react-dom` | 19.0.0 | MIT | `https://github.com/facebook/react` | DOM renderer for React |
| `tailwindcss` | 4.3.3 | MIT | `https://github.com/tailwindlabs/tailwindcss` | Utility-first CSS framework |
| `@tailwindcss/postcss` | 4.3.3 | MIT | `https://github.com/tailwindlabs/tailwindcss` | PostCSS plugin for Tailwind CSS |
| `lucide-react` | 0.468.0 | ISC | `https://github.com/lucide-icons/lucide` | Accessible icons |
| `typescript` | 5.7.2 | Apache-2.0 | `https://github.com/microsoft/TypeScript` | Static type checking |
| `eslint` | 9.39.1 | MIT | `https://github.com/eslint/eslint` | Linter |
| `eslint-config-next` | 15.5.27 | MIT | `https://github.com/vercel/next.js` | Next.js ESLint configuration |
| `prettier` | 3.4.2 | MIT | `https://github.com/prettier/prettier` | Code formatter |
