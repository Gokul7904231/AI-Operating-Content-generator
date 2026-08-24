# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FactoryOS — AI Operating Content Generator. Enterprise microservice suite for automated short-form video generation, compliance vetting, and rendering. Three decoupled services communicate over HTTPS + bearer-token auth (`INTERNAL_API_SECRET_KEY`):

- **Control Plane** (`apps/web/`) — Next.js 16 dashboard / orchestrator
- **Compliance Gate** (`archive/floor07_compliance_2026-08-23/`) — FastAPI quality gate — **archived, not in live path** (must issue a signed certificate before any content renders when enabled)
- **Rendering Engine** (`services/rendering-engine/`) — FastAPI worker for MoviePy + FFmpeg compilation
- **Pipeline Stages** (`services/pipeline/floor01_*` … `floor06_*` + `guardian/`) — domain slices of the video assembly line

Flow: `apps/web` generates draft → (archived) `POST /v1/validate` on floor07 → (Fact/Policy/Risk/Certificate workers) → if approved, `POST /render-video` or `POST /api/render/jobs` on rendering engine → FFmpeg/MoviePy + edge-tts → Cloudinary/Firebase.

Live path today: `apps/web` → `services/rendering-engine` directly (floor07 archived at `archive/floor07_compliance_2026-08-23/` — see [Archived Components in docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Repository Structure

```
aishorts/
├── apps/
│   └── web/                          # Next.js Control Plane (root for npm)
│       ├── app/                      # App Router pages (landing, login, new-ui, prototypes)
│       │   └── (os)/                 # Authenticated OS shell (dashboard, factory, media, overseer)
│       ├── factoryos/                # FactoryOS framework: capability router, agents, evals
│       │   └── tests/                # Vitest tests (scoped to this dir)
│       ├── components/, lib/, rag/, ai/, content-engines/, publishing/, storage/
│       ├── middleware.ts             # Clerk auth middleware
│       ├── vitest.config.ts          # include: factoryos/tests/**/*.test.ts, node env
│       └── tsconfig.factoryos.json   # strict build for factoryos/ only
├── services/
│   ├── rendering-engine/             # Rendering worker (FastAPI)
│   │   ├── main.py                   # FastAPI app: /render-video, /job-status/{id}, /logs/stream (SSE)
│   │   ├── basic_render_api.py       # Warm Basic pool :8100
│   │   ├── basic_render_worker.py    # Async worker (queue, isolated workspaces, ffprobe)
│   │   ├── scripts/create_short.py   # MoviePy/FFmpeg pipeline (spawned via subprocess)
│   │   ├── assets/{backgrounds,audio}/
│   │   └── output/jobs/              # Persistent job manifests (JSON per jobId)
│   └── pipeline/                     # Domain slices — video assembly line
│       ├── floor01_strategy/
│       ├── floor02_scripting/
│       ├── floor03_asset_realization/
│       ├── floor04_media_synthesis/
│       ├── floor05_timeline_composition/
│       ├── floor06_rendering/
│       └── guardian/                 # Autonomous watchdog & self-healing telemetry
├── docs/
│   ├── ARCHITECTURE.md               # Full 512-line system design (previous README body)
│   ├── akb/                          # Architecture Knowledge Base (docs/ADRs) — moved from floors/factoryos-akb
│   ├── deployment/README.md          # Deployment guides
│   └── factoryos/                    # FactoryOS frontier progress docs
├── archive/
│   └── floor07_compliance_2026-08-23/ # Archived Compliance Gate (Poetry, Hexagonal)
│       ├── app/{api,core,domain,application,infrastructure,workers,pipelines,schemas,security}
│       ├── data/policies/            # default.json, youtube.json policy packs
│       ├── migrations/               # Alembic
│       ├── tests/{unit,integration,api}/
│       └── docker-compose.yml        # api + postgres:16 + redis:7 + migrate
├── .github/workflows/                # ci.yml, factoryos-render-worker.yml (1-min dispatcher), factoryos-basic-render.yml
├── firebase.json                     # Hosting: public=firebase-hosting
├── vercel.json                       # Now at apps/web/vercel.json (crons)
└── LICENSE                           # MIT
```

Legacy physical dirs `gen-v/` and `floors/` may remain on disk (ignored via `.gitignore`) until manual cleanup — canonical tracked paths are `apps/web` and `services/*` (verified via `git ls-files`).

## Commands

### Control Plane (`apps/web/`) — Node 20+, npm 10+
```bash
cd apps/web
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

### Compliance Gate (`archive/floor07_compliance_2026-08-23/`) — Python 3.12, Poetry, Docker — ARCHIVED
```bash
cd archive/floor07_compliance_2026-08-23
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

### Rendering Engine (`services/rendering-engine/`) — Python 3.11+, FFmpeg on PATH
```bash
cd services/rendering-engine
python -m venv venv; source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8080
# Warm Basic pool:
python -m uvicorn basic_render_api:app --port 8100
# Alternative worker entry (loads apps/web/.env):
python start_worker.py

# Manual validation:
curl http://localhost:8080/job-status/<jobId>
curl http://localhost:8080/logs/stream   # SSE log stream
```

No formal test harness in this service; job manifests persist to `output/jobs/<jobId>.json`.

### Pipeline Stages (`services/pipeline/*`) — Python 3.11+
Each floor is a domain slice (strategy → scripting → asset realization → media synthesis → timeline composition → rendering) plus `guardian/` watchdog. See `services/pipeline/<floor>/README.md` and `docs/akb/`.

## Architecture

### Control Plane (`apps/web/`)
- **Next.js 16 / React 19 / Tailwind v4 / Framer Motion**, `reactCompiler: true`, Turbopack. Path alias `@/*` → `./*`.
- **Auth**: Clerk (`@clerk/nextjs`, `middleware.ts`). **Data**: `firebase-admin` + `firebase` (Firestore), `mongodb` driver, `better-sqlite3` for local telemetry/benchmarks, `cloudinary` CDN.
- **AI Router** (`factoryos/` + `ai/` + `lib/`): binds capabilities (`SCRIPT v1`, `QUIZ v2`) to providers (Gemini via `@ai-sdk/google`, Groq, OpenRouter, local Ollama/LM Studio). See `apps/web/factoryos/README.md`.
- **Rendering**: calls `NEXT_PUBLIC_RENDER_ENGINE_URL` if set; otherwise falls back to Next.js API routes requiring local FFmpeg. `ENABLE_LOCAL_RENDER` controls the local background worker. Warm pool at `BASIC_RENDER_API_URL` (`services/rendering-engine` :8100) for sub-60s path.
- **Vitest** is scoped strictly to `factoryos/tests/` (node env, 60s timeout); do not expect it to run `app/` or `tests/` suites.

### Compliance Gate (`archive/floor07_compliance_2026-08-23/`) — Hexagonal / Clean Architecture — ARCHIVED
```
POST /v1/validate → app/api/v1/validation.py → ValidationPipeline (app/pipelines/validation_pipeline.py)
                                           ├─ FactWorker       (app/workers/fact_worker.py) — hallucination/confidence
                                           ├─ PolicyWorker     (app/workers/policy_worker.py) — platform rules from data/policies/
                                           ├─ RiskWorker       (app/workers/risk_worker.py) — LOW/MEDIUM/HIGH/CRITICAL
                                           └─ CertificateWorker(app/workers/certificate_worker.py) — HMAC-SHA256 via app/security/signing.py → Postgres
```
Layers: `app/domain` (entities: certificate/validation_run/audit_log, value_objects: risk_rating/decision/platform) → `app/application` (use_cases/commands/dto) → `app/infrastructure` (SQLAlchemy async + asyncpg, Redis asyncio, repos) → `app/api`. Cross-cutting: `app/core/config/settings.py` (pydantic-settings), `app/core/exceptions.py`, `app/logging/setup.py` (structlog json), `app/security/auth.py`, middleware `request_id` + `error_handler`. Metrics via `prometheus-client`, serialization via `orjson`. Not in live request path — see `docs/ARCHITECTURE.md` Archived Components.

### Rendering Engine (`services/rendering-engine/`)
- FastAPI (`main.py` :8080 + `basic_render_api.py` :8100) with `ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS)` and `HTTPBearer` auth. Warm pool `basic_render_worker.py` with isolated workspaces and `ffprobe` validation.
- `POST /render-video` writes `output/jobs/<jobId>.json` (queued) → `executor.submit(execute_render_task)` → spawns `scripts/create_short.py` as subprocess with a temp payload JSON → on success writes `output/<jobId>/final.mp4` + `thumbnail.png` + `subtitles.srt` + `result.json`, updates manifest to `completed` (or `failed`). On startup, re-queues any `queued`/`processing` jobs. Basic pool: `POST /api/render/jobs` with `executionToken` + `timingSafeEqual`.
- `GET /job-status/{jobId}` returns `videoUrl`/`thumbnailUrl`/`subtitlesUrl` as absolute `/static/...` URLs. `GET /logs/stream` is SSE over an in-memory `deque(500)` fed by a `_DequeHandler`.

### Pipeline Stages (`services/pipeline/*`)
- `floor01_strategy` → `floor02_scripting` → `floor03_asset_realization` → `floor04_media_synthesis` → `floor05_timeline_composition` → `floor06_rendering` + `guardian` (watchdog, self-healing, Decision Ledger, CircuitBreaker). Each floor is a domain slice with `app/` hexagonal layout. Knowledge base at `docs/akb/`.

## Environment

Each service has its own `.env` (all gitignored; see `*.example`):

- `archive/floor07_compliance_2026-08-23/.env` — `DATABASE_URL` (asyncpg), `REDIS_URL`, `SIGNING_SECRET_KEY` (hex 32 bytes), `POLICY_DATA_DIR`, `LOG_LEVEL`/`LOG_FORMAT`, `RISK_*_THRESHOLD`, `API_HOST`/`API_PORT` — archived, not required to run.
- `apps/web/.env` — `GEMINI_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `DEFAULT_LLM_PROVIDER`, `NEXT_PUBLIC_RENDER_ENGINE_URL`, `ENABLE_LOCAL_RENDER`, `TOGETHER_API_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`/`CLERK_SECRET_KEY`, `FIREBASE_*`, `CLOUDINARY_*`, `INTERNAL_API_SECRET_KEY`, `BASIC_RENDER_API_URL`, `MONGODB_URI`.
- `services/rendering-engine/.env` (or `apps/web/.env` via `start_worker.py`) — `CLOUDINARY_*`, `INTERNAL_API_SECRET_KEY`, `BASIC_RENDER_API_SECRET`, `MAX_CONCURRENT_JOBS`, `CONTROL_PLANE_URL`.

Host requirement: system `ffmpeg` on PATH for both `apps/web` local rendering and `services/rendering-engine`.

## Git & CI

- Main branch: `main`. Remote: `https://github.com/Gokul7904231/AI-Operating-Content-generator`.
- Workflows: `ci.yml` (Build & TypeCheck at `apps/web`), `factoryos-render-worker.yml` (cron `* * * * *` — claims queued jobs via `POST /api/rendering/claim` and dispatches `factoryos-basic-render.yml`); `factoryos-basic-render.yml` (per-job: `services/rendering-engine/scripts/create_short.py`).
