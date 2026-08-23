# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FactoryOS — AI Operating Content Generator. Enterprise microservice suite for automated short-form video generation, compliance vetting, and rendering. Three decoupled services communicate over HTTPS + bearer-token auth (`INTERNAL_API_SECRET_KEY`):

- **Control Plane** (`gen-v/`) — Next.js 16 dashboard / orchestrator
- **Compliance Gate** (`floors/floor07_compliance/`) — FastAPI quality gate (must issue a signed certificate before any content renders)
- **Rendering Engine** (`vps-rendering-engine/`) — FastAPI worker for MoviePy + FFmpeg compilation

Flow: `gen-v` generates draft → `POST /v1/validate` on floor07 → (Fact/Policy/Risk/Certificate workers) → if approved, `POST /render-video` on rendering engine → FFmpeg/MoviePy + edge-tts → Cloudinary/Firebase.

## Repository Structure

```
aishorts/
├── gen-v/                          # Next.js Control Plane (root for npm)
│   ├── app/                        # App Router pages (landing, login, new-ui, prototypes)
│   ├── factoryos/                  # FactoryOS framework: capability router, agents, evals
│   ├── components/, lib/, rag/, ai/, content-engines/, publishing/, storage/
│   ├── factoryos/tests/            # Vitest tests (scoped to this dir)
│   ├── middleware.ts               # Clerk auth middleware
│   ├── vitest.config.ts            # include: factoryos/tests/**/*.test.ts, node env
│   └── tsconfig.factoryos.json     # strict build for factoryos/ only
├── floors/
│   ├── floor07_compliance/         # Compliance Gate service (Poetry)
│   │   ├── app/{api,core,domain,application,infrastructure,workers,pipelines,schemas,security}
│   │   ├── data/policies/          # default.json, youtube.json policy packs
│   │   ├── migrations/             # Alembic
│   │   ├── tests/{unit,integration,api}/
│   │   └── docker-compose.yml      # api + postgres:16 + redis:7 + migrate
│   └── factoryos-akb/              # Architecture Knowledge Base (docs/ADRs)
├── vps-rendering-engine/           # Rendering worker
│   ├── main.py                     # FastAPI app: /render-video, /job-status/{id}, /logs/stream (SSE)
│   ├── scripts/create_short.py     # MoviePy/FFmpeg pipeline (spawned via subprocess)
│   ├── assets/{backgrounds,audio}/
│   └── output/jobs/                # Persistent job manifests (JSON per jobId)
├── factoryos/                      # Top-level stub (nearly empty; real code is gen-v/factoryos/)
├── floors/                         # Duplicate? canonical floor07 is floors/floor07_compliance
├── .github/workflows/              # factoryos-render-worker.yml (5-min queue dispatcher), factoryos-basic-render.yml
└── firebase.json                   # Hosting: public=firebase-hosting
```

## Commands

### Control Plane (`gen-v/`) — Node 20+, npm 10+
```bash
cd gen-v
npm install
npm run dev          # Next.js dev on http://localhost:3000 (Turbopack)
npm run build        # next build
npm start            # next start
npm run lint         # eslint (eslint-config-next/core-web-vitals)
npm run factoryos:test              # vitest run --config vitest.config.ts (all FactoryOS tests)
npm run factoryos:typecheck         # tsc --project tsconfig.factoryos.json --noEmit (strict)
npm run factoryos:eval:rag          # vitest run factoryos/tests/rag-eval.test.ts
npm run factoryos:eval:quiz         # vitest run factoryos/tests/quiz-eval.test.ts
npx vite-node factoryos/demo.ts              # FactoryOS demo
npx vite-node factoryos/demo-production.ts   # production demo
# Single test file:
npx vitest run factoryos/tests/<name>.test.ts --config vitest.config.ts
```
Webpack ignores `venv/`, `data/`, `generated/`, `*.db` for watcher performance. `better-sqlite3` / `sqlite3` are server-only externals.

### Compliance Gate (`floors/floor07_compliance/`) — Python 3.12, Poetry, Docker
```bash
cd floors/floor07_compliance
cp .env.example .env   # then fill DATABASE_URL, REDIS_URL, SIGNING_SECRET_KEY, etc.

# Docker (preferred — includes Postgres + Redis)
docker compose up --build -d   # or: make up / make up-build
docker compose logs -f api     # or: make logs
docker compose down            # or: make down

# Local dev (requires Postgres + Redis running)
poetry install
poetry run alembic upgrade head        # or: make migrate
poetry run uvicorn main:app --reload --port 8000   # docs at /docs, health at /health

# Tests — pytest with --cov-fail-under=95
make test                          # poetry run pytest (all)
make test-unit                     # tests/unit
make test-integration              # tests/integration
make test-api                      # tests/api
poetry run pytest tests/unit/workers/test_fact_worker.py -v   # single file

# Quality
make lint          # ruff check app tests
make lint-fix      # ruff check --fix
make format        # black app tests main.py
make format-check  # black --check
make typecheck     # mypy app  (strict=true, pydantic plugin)
```

### Rendering Engine (`vps-rendering-engine/`) — Python 3.11+, FFmpeg on PATH
```bash
cd vps-rendering-engine
python -m venv venv; source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8080
# Alternative worker entry (loads gen-v/.env):
python start_worker.py

# Manual validation:
curl http://localhost:8080/job-status/<jobId>
curl http://localhost:8080/logs/stream   # SSE log stream
```

No formal test harness in this service; job manifests persist to `output/jobs/<jobId>.json`.

## Architecture

### Control Plane (`gen-v/`)
- **Next.js 16 / React 19 / Tailwind v4 / Framer Motion**, `reactCompiler: true`, Turbopack. Path alias `@/*` → `./*`.
- **Auth**: Clerk (`@clerk/nextjs`, `middleware.ts`). **Data**: `firebase-admin` + `firebase` (Firestore), `mongodb` driver, `better-sqlite3` for local telemetry/benchmarks, `cloudinary` CDN.
- **AI Router** (`factoryos/` + `ai/` + `lib/`): binds capabilities (`SCRIPT v1`, `QUIZ v2`) to providers (Gemini via `@ai-sdk/google`, Groq, OpenRouter, local Ollama/LM Studio). See `gen-v/factoryos/README.md`.
- **Rendering**: calls `NEXT_PUBLIC_RENDER_ENGINE_URL` if set; otherwise falls back to Next.js API routes requiring local FFmpeg. `ENABLE_LOCAL_RENDER` controls the local background worker.
- **Vitest** is scoped strictly to `factoryos/tests/` (node env, 60s timeout); do not expect it to run `app/` or `tests/` suites.

### Compliance Gate (`floors/floor07_compliance/`) — Hexagonal / Clean Architecture
```
POST /v1/validate → app/api/v1/validation.py → ValidationPipeline (app/pipelines/validation_pipeline.py)
                                           ├─ FactWorker       (app/workers/fact_worker.py) — hallucination/confidence
                                           ├─ PolicyWorker     (app/workers/policy_worker.py) — platform rules from data/policies/
                                           ├─ RiskWorker       (app/workers/risk_worker.py) — LOW/MEDIUM/HIGH/CRITICAL
                                           └─ CertificateWorker(app/workers/certificate_worker.py) — HMAC-SHA256 via app/security/signing.py → Postgres
```
Layers: `app/domain` (entities: certificate/validation_run/audit_log, value_objects: risk_rating/decision/platform) → `app/application` (use_cases/commands/dto) → `app/infrastructure` (SQLAlchemy async + asyncpg, Redis asyncio, repos) → `app/api`. Cross-cutting: `app/core/config/settings.py` (pydantic-settings), `app/core/exceptions.py`, `app/logging/setup.py` (structlog json), `app/security/auth.py`, middleware `request_id` + `error_handler`. Metrics via `prometheus-client`, serialization via `orjson`.

### Rendering Engine (`vps-rendering-engine/`)
- Single-file FastAPI (`main.py`) with `ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)` and `HTTPBearer` auth.
- `POST /render-video` writes `output/jobs/<jobId>.json` (queued) → `executor.submit(execute_render_task)` → spawns `scripts/create_short.py` as subprocess with a temp payload JSON → on success writes `output/<jobId>/final.mp4` + `thumbnail.png` + `subtitles.srt` + `result.json`, updates manifest to `completed` (or `failed`). On startup, re-queues any `queued`/`processing` jobs.
- `GET /job-status/{jobId}` returns `videoUrl`/`thumbnailUrl`/`subtitlesUrl` as absolute `/static/...` URLs. `GET /logs/stream` is SSE over an in-memory `deque(500)` fed by a `_DequeHandler`.

## Environment

Each service has its own `.env` (all gitignored; see `*.example`):

- `floors/floor07_compliance/.env` — `DATABASE_URL` (asyncpg), `REDIS_URL`, `SIGNING_SECRET_KEY` (hex 32 bytes), `POLICY_DATA_DIR`, `LOG_LEVEL`/`LOG_FORMAT`, `RISK_*_THRESHOLD`, `API_HOST`/`API_PORT`.
- `gen-v/.env` — `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEFAULT_LLM_PROVIDER`, `NEXT_PUBLIC_RENDER_ENGINE_URL`, `ENABLE_LOCAL_RENDER`, `TOGETHER_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`, `FIREBASE_*`, `CLOUDINARY_*`, `INTERNAL_API_SECRET_KEY`.
- `vps-rendering-engine/.env` (or `gen-v/.env` via `start_worker.py`) — `CLOUDINARY_*`, `INTERNAL_API_SECRET_KEY`, `MAX_CONCURRENT_JOBS`.

Host requirement: system `ffmpeg` on PATH for both `gen-v` local rendering and `vps-rendering-engine`.

## Git & CI

- Main branch: `main`. Remote: `https://github.com/Gokul7904231/AI-Operating-Content-generator`.
- Workflows: `factoryos-render-worker.yml` (cron `*/5 * * * *` — claims queued jobs via `POST /api/rendering/claim` and dispatches `factoryos-basic-render.yml`); `factoryos-basic-render.yml`.
