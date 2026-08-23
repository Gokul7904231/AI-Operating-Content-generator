# 🏭 FactoryOS — AI Short-Form Video Factory

> **One topic in. One viral Short out.** FactoryOS turns any idea into a publish-ready 1080×1920 YouTube Short — script, voice, images, subtitles, and muxing — fully automated.

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/FFmpeg-007808?style=for-the-badge&logo=ffmpeg&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
</p>

<p align="center">
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-project-hierarchy">Hierarchy</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-deployment">Deploy</a>
</p>

---

## ✨ What It Does

| Content Type | Pipeline | Output |
|---|---|---|
| **Motivational Shorts** | LLM script → FLUX AI images → `edge-tts` voice → `faster-whisper` subtitles → FFmpeg | 45s · 30fps · 1080×1920 · voice + 3 AI images + SRT |
| **Quiz Shorts** | Timed Q&A engine → countdown bar, SFX (pop/ding), BGM, per-question reveal, watermark, flag background | Same spec — game-show style |

Every video is **9:16**, **subtitled**, and **thumbnailed** before it hits Cloudinary + Firestore.

```
Topic: "5 Mind-Blowing Facts About Space"
  → 45s video, 1080×1920, voice + 3 AI images + SRT → Cloudinary in ~50s
```

---

## 🧠 How It Works — The Factory Pipeline

```
                    ┌─────────────────────────────────┐
                    │   Control Plane  (gen-v)         │
                    │   Next.js 16 · React 19          │
                    │   Clerk + Firebase Auth          │
                    └────────┬────────────────────────┘
                             │ 1. Generate script
                             │    Gemini / Groq / OpenRouter / Ollama
                             ▼
                    ┌─────────────────────────────────┐
                    │  Validation Gate  (floors/       │
                    │  floor07_compliance)             │
                    │  FastAPI · Postgres · Redis      │
                    │  FactWorker · PolicyWorker       │
                    │  RiskWorker → HMAC-SHA256 Cert   │  ← archived, see archive/
                    └────────┬────────────────────────┘
                             │ 2. POST /v1/validate
                             │    Certificate or rejection
                             ▼
                    ┌─────────────────────────────────┐
                    │  Rendering Workers               │
                    │  vps-rendering-engine  (FastAPI) │
                    │  basic_render_worker  (warm pool)│
                    │  edge-tts · faster-whisper       │
                    │  Pillow · FFmpeg (libx264)       │
                    │  → Cloudinary + Firestore        │
                    └────────┬────────────────────────┘
                             │ 3. POST /render-video
                             │ 4. GET /job-status/{id}  (poll)
                             │ 5. GET /logs/stream      (SSE)
                             ▼
                    ┌─────────────────────────────────┐
                    │  Delivery                        │
                    │  Cloudinary CDN · Firebase       │
                    │  Google Drive (optional)         │
                    └─────────────────────────────────┘
```

**Auth between services:** `HTTPBearer` with `INTERNAL_API_SECRET_KEY` · `timingSafeEqual` on callbacks · `jobId ^[a-zA-Z0-9_-]{8,64}$` validated at API boundary + worker re-validated with `realpath` prefix check.

---

## 🗂️ Project Hierarchy

```
AI-Operating-Content-generator/
│
├── gen-v/                          # 🎛️ Control Plane — Next.js 16 App Router
│   ├── app/
│   │   ├── (os)/                   # Authenticated OS shell (factory layout)
│   │   │   ├── layout.tsx          # Sidebar + TopNav + MobileBottomNav + quota polling
│   │   │   ├── dashboard/          # Role-aware dashboard (BasicUser vs Admin/Owner)
│   │   │   ├── engines/            # Engine catalog — quiz / facts / motivational
│   │   │   ├── factory/            # Operator views: jobs, queue (Kanban), scheduler, workflows
│   │   │   ├── media/              # library · assets · drive · cloudinary
│   │   │   ├── overseer/           # AI overseer presence (eye system + status ring)
│   │   │   ├── publishing/         # drive · youtube · tiktok · instagram
│   │   │   ├── analytics/          # Metrics & insights
│   │   │   ├── ai/                 # AI hospital / profiler
│   │   │   ├── admin/              # User & telemetry admin
│   │   │   └── settings/           # API keys & provider config
│   │   ├── api/                    # ~45 route handlers
│   │   │   ├── auth/               # login · session
│   │   │   ├── generate-video/     # Main entry — validates, enqueues, dispatches
│   │   │   ├── job-status/[id]/    # Polling — queued → processing → completed/failed
│   │   │   ├── rendering/          # claim · callback (worker ↔ control plane)
│   │   │   ├── library/            # User video library
│   │   │   ├── quiz/               # geo · draft · generate · compile · verify
│   │   │   ├── engines/            # Engine discovery & registry
│   │   │   ├── drive/              # Google Drive connect/callback/connection
│   │   │   ├── factory-state/      # Live SRE metrics + SSE stream
│   │   │   ├── overseer/           # chat · command · presence
│   │   │   └── ...                 # storage, publishing, scheduler, sre, etc.
│   │   ├── landing/                # Public marketing landing
│   │   ├── login/                  # Auth entry
│   │   └── globals.css · providers.tsx · middleware.ts
│   ├── components/
│   │   ├── QuickGenerateOverlay.tsx # 4-step wizard: IDEA → REVIEW → RENDER → READY
│   │   ├── Sidebar.tsx · TopNav.tsx · MobileBottomNav.tsx
│   │   ├── dashboard/BasicUserDashboard.tsx
│   │   ├── creator/CreateHero.tsx · CreatorEmptyState.tsx
│   │   ├── landing/                # Hero, pipeline, proof, depth sections
│   │   └── overseer/presence/      # OverseerEyeSystem, OverseerStatusRing
│   ├── lib/
│   │   ├── auth/                   # Firebase + Clerk, HMAC session, roles, audit
│   │   ├── quota/quota-service.ts  # Atomic reservation — 5-video hard limit
│   │   ├── core/                   # RouteRegistry · EngineRegistry · ServiceRegistry · SQLiteRenderQueue
│   │   ├── factory-store.ts        # Zustand factory state + SSE
│   │   ├── observability/event-center.ts
│   │   ├── overseer/               # Agent + tool gateway + registry
│   │   └── rendering/RenderQueueManager.ts
│   ├── factoryos/                  # 🧩 Internal kernel (Vitest, 180+ tests)
│   │   ├── core/                   # Workflow runtime, missions, guardian, NLI, adapters
│   │   │   └── database/MongoDBClient.ts  # MongoDB 7 — cases/leases/memories/DAGs/decisions (MONGODB_URI, db factoryos) + InMemory fallback
│   │   ├── tests/                  # api-config, auth, overseer, production-system, creator-flow (incl. mongo-persistence)
│   │   └── evals/ · benchmarks/ · reports/
│   ├── rag/ · ai/ · publishing/ · storage/ · content-engines/
│   ├── middleware.ts               # Auth gate — "/" authed→/dashboard, /landing→307 "/"
│   ├── next.config.mjs             # sharp/sqlite3 externals, Turbopack
│   └── vitest.config.ts            # node env, factoryos/tests only
│
├── vps-rendering-engine/           # 🎬 Rendering Workers — FastAPI + FFmpeg
│   ├── main.py                     # POST /render-video · GET /job-status/{id} · GET /logs/stream (SSE)
│   ├── basic_render_api.py         # Warm Basic pool — POST /api/render/jobs (port 8100)
│   ├── basic_render_worker.py      # Async warm worker — queue, isolated workspaces, ffprobe, callbacks
│   ├── scripts/create_short.py     # Core pipeline: Pillow 1080×1920, 30fps, edge-tts, faster-whisper
│   ├── assets/{backgrounds,audio}/ # Bundled backgrounds & SFX
│   ├── output/jobs/                # Persistent job manifests (JSON per jobId)
│   ├── start_worker.py             # Alt entry — loads gen-v/.env
│   └── requirements.txt
│
├── floors/
│   └── floor07_compliance/         # 🛡️ Validation Gate — FastAPI (archived)
│       ├── app/{api,core,domain,application,infrastructure,workers,pipelines,schemas,security}
│       ├── data/policies/          # default.json · youtube.json
│       ├── migrations/ (Alembic)  · tests/{unit,integration,api}/ · docker-compose.yml
│       └── (archived → archive/floor07_compliance_2026-08-23/)
│
├── archive/
│   └── floor07_compliance_2026-08-23/  # Archived ghost service + provenance README
│
├── hybrid-video/scripts/           # Alternate pipeline variant
│
├── .github/workflows/
│   ├── factoryos-render-worker.yml # Dispatcher — cron "* * * * *" + repository_dispatch
│   └── factoryos-basic-render.yml  # Basic runner — checkout → setup-python → FFmpeg 6.1.1 → create_short.py
│
├── firebase.json · .firebaserc     # Hosting: public=firebase-hosting
├── .gitignore
└── README.md
```

### Layer Responsibilities

| Layer | Owns | Never Does |
|---|---|---|
| **Control Plane `gen-v/`** | UX, auth, orchestration, quota, polling, delivery | Heavy FFmpeg/CUDA work |
| **Rendering Workers `vps-rendering-engine/`** | TTS, transcription, frame rendering, muxing, uploads, callbacks | Auth decisions, quota |
| **Validation Gate `floors/floor07_compliance/`** | Policy & fact checks, signed certificates | Rendering |

---

## 🧰 Tech Stack

| Concern | Choices |
|---|---|
| **Frontend** | Next.js 16 (Turbopack, `reactCompiler: true`), React 19, Tailwind v4, Framer Motion 12, Zustand 5, lucide-react, recharts, sharp, zod, @tanstack/react-query 5 |
| **Data** | **Firestore** (`firebase-admin` 13 / `firebase` 12) — quotas, videos, quizzes · **MongoDB 7** (`mongodb` 7.5, `MONGODB_URI`, db `factoryos` via `factoryos/core/database/MongoDBClient.ts` — cases, leases, memories, DAGs, decisions, with graceful InMemory fallback) · **SQLite** (`better-sqlite3` 12) — `SQLiteRenderQueue` (`data/shortfactory.db`) · **PostgreSQL 16 + Redis 7** — validation gate only (archived, `floors/floor07_compliance`) |
| **Auth** | Clerk (`@clerk/nextjs` 6) + Firebase Auth — `__session` HMAC-SHA256 via `INTERNAL_API_SECRET_KEY`, role hierarchy `OWNER > ADMIN > EDITOR > USER > VIEWER`; `nodemailer` 9 for mail |
| **Validation** | FastAPI, Pydantic, SQLAlchemy 2 + asyncpg, Alembic, Redis (asyncio), structlog, orjson, prometheus-client |
| **Rendering** | FastAPI, MoviePy 2, Pillow 10, FFmpeg 6.1.1 (`imageio-ffmpeg` 0.4.8), `edge-tts` 7 / `@travisvn/edge-tts`, `faster-whisper` 0.10, `mutagen` 1.47, Cloudinary 2.5, `APScheduler` 3.10, `google-api-python-client` + `google-auth` |
| **AI** | `ai` 7 (Vercel AI SDK) + `@ai-sdk/google` 4 + `@ai-sdk/openai` 4, `@google/genai` 2.9, `groq-sdk` 1.2 (`llama-3.1-8b-instant`), Together AI `FLUX.1-schnell`, `@xenova/transformers` 2.17, OpenRouter, Ollama / LM Studio fallback |
| **Services** | `googleapis` 173 (Drive/YouTube), `cloudinary` 2.5, `firebase-admin` 13 |
| **Infra** | Docker & Compose, GitHub Actions, Firebase Hosting, Vercel |
| **Tooling** | Poetry, Vitest 4, Ruff, Black, mypy (strict), ESLint 9, TypeScript 6, Alembic |

---

## 🚀 Quick Start

**Prerequisites:** Node 20+ · Python 3.11+ · Docker & Compose · FFmpeg on PATH

### 1 — Control Plane

```bash
cd gen-v
npm install
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # production build
npm run factoryos:test      # Vitest — factoryos/tests/**
npm run factoryos:typecheck # tsc --project tsconfig.factoryos.json --noEmit
```

### 2 — Rendering Workers

```bash
cd vps-rendering-engine
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8080           # main worker
python -m uvicorn basic_render_api:app --port 8100        # warm Basic pool (alt: python start_worker.py)
# health:  http://localhost:8080/health   /   http://localhost:8100/health
# ready:   http://localhost:8100/ready
```

### 3 — Validation Gate (archived — optional, Docker)

```bash
cd archive/floor07_compliance_2026-08-23   # or floors/floor07_compliance if restored
cp .env.example .env   # set DATABASE_URL, REDIS_URL, SIGNING_SECRET_KEY
docker compose up --build -d
# docs at http://localhost:8000/docs — health at /health
```

---

## 🔐 Environment Variables

Each service has its own `.env` (gitignored — see `*.example`):

| Service | Key Variables |
|---|---|
| `floors/floor07_compliance/.env` | `DATABASE_URL` (asyncpg), `REDIS_URL`, `SIGNING_SECRET_KEY` (`python -c "import secrets; print(secrets.token_hex(32))"`), `POLICY_DATA_DIR`, `LOG_LEVEL` |
| `gen-v/.env` | `GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `DEFAULT_LLM_PROVIDER` · `NEXT_PUBLIC_RENDER_ENGINE_URL` · `ENABLE_LOCAL_RENDER` · `TOGETHER_API_KEY` · `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `CLERK_SECRET_KEY` · `FIREBASE_*` · `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `MONGODB_URI` (→ `factoryos/core/database/MongoDBClient.ts`, db `factoryos`; optional — falls back to InMemory) · `BASIC_RENDER_API_URL` · `BASIC_RENDER_API_SECRET` · `GITHUB_PAT`/`GH_TOKEN` · `GITHUB_REPO` |
| `vps-rendering-engine/.env` | `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `BASIC_RENDER_API_SECRET` · `MAX_CONCURRENT_JOBS` · `CONTROL_PLANE_URL` · `BASIC_RENDER_PORT` · `BASIC_PERSISTENT_CACHE_DIR` · `BASIC_EPHEMERAL_WORKSPACE_ROOT` |

> System `ffmpeg` must be on PATH for both local rendering and the VPS engine.

---

## 📡 API Reference

```bash
# Validate content (quality gate — must pass before render)
curl -X POST http://localhost:8000/v1/validate \
  -H "Content-Type: application/json" \
  -d '{"title":"Python Variables Explained","script":"Variables store values...","platform":"youtube","language":"en","content_type":"educational_short"}'

# Render — Control Plane (orchestrated, quota-checked, dispatched to workers)
curl -X POST http://localhost:3000/api/generate-video \
  -H "Authorization: Bearer <session>" -H "Content-Type: application/json" \
  -d '{"topic":"Space Facts","contentType":"QUIZ_SHORTS","durationSeconds":45}'

# Render — direct to worker (bearer = INTERNAL_API_SECRET_KEY)
curl -X POST http://localhost:8080/render-video \
  -H "Authorization: Bearer $INTERNAL_API_SECRET_KEY" -H "Content-Type: application/json" \
  -d '{"topic":"Space Facts","contentType":"MOTIVATIONAL","scenes":[{"text":"Scene 1"}]}'

# Poll + stream
curl http://localhost:8080/job-status/<jobId>
curl http://localhost:8080/logs/stream          # SSE
curl http://localhost:3000/api/job-status/<id>  # via Control Plane
curl http://localhost:8100/api/render/jobs/<id> # Basic warm pool

# Warm Basic pool — submit (requires executionToken, tier=BASIC)
curl -X POST http://localhost:8100/api/render/jobs \
  -H "Authorization: Bearer $BASIC_RENDER_API_SECRET" -H "Content-Type: application/json" \
  -d '{"jobId":"job_abc12345","executionToken":"<token>","tier":"BASIC","topic":"Cats"}'
```

**Key routes (Control Plane `gen-v/app/api`):** `auth/login` · `auth/session` · `generate-video` · `job-status/[id]` · `rendering/claim` · `rendering/callback` · `library` · `quiz/geo|draft|generate|compile|verify` · `engines` · `drive/connect|callback|connection` · `factory-state` (+ `/sse`) · `overseer/*` · `storage/*` · `publishing/*` · `scheduler` · `sre/*` · `admin/*` · `user/quota|credentials` · `voice/registry` · `templates` · `provider-reliability` · `render-engine-health` · `selftest`.

---

## 🔄 Rendering Dispatch — Two Fast Paths

```
POST /api/generate-video  (Control Plane)
  ├─ reserveGenerationSlot (atomic, 5-video hard limit per user)
  ├─ saveJobManifest + SQLiteRenderQueue.enqueue
  ├─ executionToken = crypto.randomBytes(32).hex()  (never jobId)
  │
  ├─ if tier==BASIC && BASIC_RENDER_API_URL  ──→  POST {BASIC_RENDER_API_URL}/api/render/jobs
  │       (warm Basic FastAPI pool — sub-60s, direct, no cron wait)       ──► basic_render_worker
  │
  └─ else if targetWorkerPool==github-actions ──→  POST https://api.github.com/repos/{GITHUB_REPO}/dispatches
          event_type=factoryos_render_job {jobId, executionToken}          ──► factoryos-basic-render.yml
                checkout@SHA → setup-python@SHA → setup-ffmpeg@SHA (6.1.1, cached)
                → pip cache → create_short.py (timeout 360s) → ffprobe validate → callback

  Fallback: factoryos-render-worker.yml cron "* * * * *" claims via POST /api/rendering/claim
            (tier-isolated: azure ↔ ADMIN only, github-actions/basic-fastapi ↔ BASIC only)
```

- GH workflow `factoryos-basic-render.yml` validates `INPUT_JOB_ID ^[a-zA-Z0-9_-]{8,64}$`, fail-closed on missing `INPUT_EXEC_TOKEN`, SHA-pinned actions, `permissions: contents: read`.
- Worker callbacks `POST /api/rendering/callback` use `timingSafeEqual` against `RENDER_WORKER_SECRET` or per-job `executionToken`, idempotent on `completed`.

---

## 🧪 Tests & Quality

```bash
cd gen-v
npm run factoryos:test              # Vitest — factoryos/tests/** (node env, 60s timeout)
npx vite-node factoryos/demo.ts              # FactoryOS demo
npx vite-node factoryos/demo-production.ts   # production demo
npx vitest run factoryos/tests/<name>.test.ts --config vitest.config.ts  # single file
npm run factoryos:typecheck         # tsc --project tsconfig.factoryos.json --noEmit
npm run factoryos:eval:rag          # RAG eval
npm run factoryos:eval:quiz         # Quiz eval
npm run lint                        # eslint (next/core-web-vitals)
npm run build                       # next build (Turbopack) — 77 routes

cd floors/floor07_compliance        # if restored from archive
make test && make test-unit && make test-integration && make test-api  # pytest --cov-fail-under=95
make lint && make format && make typecheck   # ruff + black + mypy (strict)

cd vps-rendering-engine
python -m py_compile basic_render_worker.py basic_render_api.py  # syntax gate
# no formal test harness — manifests persist to output/jobs/<jobId>.json
```

Brand-new creator E2E (measured, not a build gate): **landing → login → dashboard → Create Video → Enter Idea → Generate Draft → Review → Render → Library/Drive** should be **< 90s to first render** (desktop + mobile).

---

## ☁️ Deployment

| Service | Target | Notes |
|---|---|---|
| **Control Plane** | Vercel / Firebase Hosting (`firebase.json` → `firebase-hosting/`) | `NEXT_PUBLIC_*` baked at build time |
| **Rendering Workers** | Docker Compose on VPS / Azure VM | `BASIC_RENDER_API_URL` points Control Plane → warm pool |
| **Dispatcher** | GitHub Actions | `factoryos-render-worker.yml` every minute + `repository_dispatch`; `factoryos-basic-render.yml` per job |

---

## 🔒 Security Notes

- **Auth:** Clerk + Firebase (`__session` HMAC-SHA256 via `INTERNAL_API_SECRET_KEY`), `middleware.ts` fail-closed `401` for `/api/*`, role hierarchy `OWNER > ADMIN > EDITOR > USER > VIEWER`.
- **OAuth:** state `HMAC(nonce)` + `timingSafeEqual` + cookie 600s binding.
- **Cron/worker:** `Bearer CRON_SECRET || INTERNAL_API_SECRET_KEY || x-vercel-cron`, GH dispatch via `GITHUB_PAT` with strong `crypto.randomBytes(32)` per-job `executionToken`, `timingSafeEqual` in `claim`/`callback`.
- **Worker filesystem:** `jobId` validated `^[a-zA-Z0-9_-]{8,64}$` at API boundary and re-validated in worker before any `Path` use; `resolve()` + `startswith(allowed_root + os.sep)` traversal guard; `topic` sanitized for FFmpeg `drawtext` (whitelist + escape `\` `'` `:`).
- **GH Actions:** `env: INPUT_*` indirection (no direct `${{ }}` interpolation), SHA-pinned (`checkout`, `setup-python`, `setup-ffmpeg`, `cache`), `permissions: contents: read`.

---

## 🗺️ Roadmap

- [ ] Postgres-backed job queue with retries + DLQ (replace file-based `output/jobs/*.json` + `ThreadPoolExecutor`)
- [ ] External fact grounding (vector RAG) for the validation gate
- [ ] Split `scripts/create_short.py` into `tts.py` / `renderer.py` / `uploader.py` + integration tests
- [ ] Presigned Cloudinary uploads + per-tenant rate limits
- [ ] `strict: true` across app `tsconfig.json` (today strict only in `tsconfig.factoryos.json`)

---

## 🤝 Contributing

PRs welcome. Please keep service boundaries clean — Control Plane never does heavy FFmpeg work, workers never make auth/quota decisions. Run `npm run build` + `npm run factoryos:test` before pushing.

---

## 📄 License

MIT — see [LICENSE](LICENSE) if present.

---

<p align="center"><em>Built by a solo full-stack developer learning to ship end-to-end. Feedback and PRs welcome.</em></p>
