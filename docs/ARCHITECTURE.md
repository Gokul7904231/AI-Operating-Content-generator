# ShortForge — Forge viral Shorts

> **One topic in. One viral Short out.** ShortForge turns any idea into a publish-ready 1080×1920 YouTube Short — script, voice, images, subtitles, and muxing — fully automated.

<p align="center">
  <a href="https://github.com/Gokul7904231/AI-Shorts-Maker/actions/workflows/ci.yml"><img src="https://github.com/Gokul7904231/AI-Shorts-Maker/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Strict%20Passed-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeCheck" />
  <img src="https://img.shields.io/badge/Vitest-720%2B%20Passed-brightgreen?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Next.js-16%20Control%20Plane-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-Python%203.11+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="#-demo--deliverables"><strong>🎬 Live Demo & Video</strong></a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-pipeline-stages--the-floors-architecture">Floors / Pipeline</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-deployment">Deployment</a>
</p>

> 🎬 **Demo & Deliverables:**
> - **Interactive Control Plane:** `gen-v` (Next.js 16 App Router · Turbopack · React 19)
> - **Sample Rendered Video:** [`gen-v/public/demo-short.mp4`](file:///c:/Users/ASUS/OneDrive/Desktop/123/aishorts/gen-v/public/demo-short.mp4) (1080×1920 9:16 Shorts with dynamic captions & audio muxing)
> - **Render Throughput:** Idea Brief → AI Script → Scene Extraction → TTS Synthesis → FFmpeg Video in **< 60s**.

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

## 🧠 How It Works — End-to-End Pipeline

```
  User topic ("5 Mind-Blowing Facts About Space")
       │
       ▼
  ┌─────────────────────────────────────────────────┐
  │  Control Plane  (gen-v)  — Next.js 16 · React 19 │
  │  Clerk + Firebase Auth · Zustand + SSE          │
  │  • quota: Firestore 5-video atomic reservation   │
  │  • engines: quiz / facts / motivational          │
  │  • queue: SQLiteRenderQueue + ServiceRegistry    │
  └──────┬──────────────────────────────────────────┘
         │ 1. AI script  (Groq llama-3.1-8b / Gemini / OpenRouter / FLUX)
         │ 2. saveJobManifest (Firestore) + enqueue (SQLite)
         │ 3. executionToken = crypto.randomBytes(32).hex()
         ▼
  ┌─────────────────────────────────────────────────┐
  │  Dispatcher                                      │
  │  warm pool → POST {BASIC_RENDER_API_URL}/api/render/jobs    (sub-60s)
  │  fallback  → POST /api/rendering/claim + GH repository_dispatch
  └──────┬──────────────────────────────────────────┘
         │  jobId ^[a-zA-Z0-9_-]{8,64}$ + timingSafeEqual token
         ▼
  ┌─────────────────────────────────────────────────┐
  │  Rendering Workers  (vps-rendering-engine)       │
  │  basic_render_api :8100 ─▶ basic_render_worker ─▶ scripts/create_short.py │
  │  main.py :8080 (fallback pool)                   │
  │  Pillow 1080×1920 · 30fps · edge-tts · faster-whisper · FFmpeg libx264 │
  │  ffprobe validate → Cloudinary + Firestore (+ optional Drive)
  └──────┬──────────────────────────────────────────┘
         │ 4. GET /api/job-status/{id}  (poll)  +  GET /logs/stream (SSE)
         ▼
  ┌─────────────────────────────────────────────────┐
  │  Delivery                                        │
  │  Cloudinary CDN · Firestore library · Google Drive (optional) │
  │  Library / Drive / Publish  — 1080×1920 9:16, subtitled, thumbnailed │
  └─────────────────────────────────────────────────┘
```

> `floors/floor07_compliance` (Validation Gate — `POST /v1/validate` → Fact/Policy/Risk → HMAC cert) is **archived** at `archive/floor07_compliance_2026-08-23/` and **not in the live path**. See [Archived Components](#-archived-components) — do not wire it without a dedicated branch.

**Auth between services:** `HTTPBearer` with `INTERNAL_API_SECRET_KEY`/`BASIC_RENDER_API_SECRET`/`CRON_SECRET` · `timingSafeEqual` on callbacks · `jobId ^[a-zA-Z0-9_-]{8,64}$` validated at API boundary and re-validated in worker with `realpath` + `startswith(root+os.sep)` traversal guard; `topic` sanitized for FFmpeg `drawtext`.

---

## 🏭 Pipeline Stages — The "Floors" Architecture

ShortForge models autonomous short-form media generation as an **industrial manufacturing assembly line (DAG)**. Each *Floor* represents a decoupled, specialized stage of the multi-modal synthesis pipeline:

| Floor / Stage | Pipeline Responsibility | Worker & Runtime Stack | Control Plane Route (`gen-v/app`) |
|---|---|---|---|
| **Floor 01: Strategy** | Topic clustering, viral archetype matching, hook scoring | LLM Prompt Engine (Groq / Gemini) | `/dashboard`, `/analytics/hooks` |
| **Floor 02: Scripting** | Multi-beat script drafting, timed quiz Q&A structuring | Structured JSON Schema Generator | `/factory/templates`, Quick Gen Modal |
| **Floor 03: Asset Realization** | Prompt-to-visual mapping, scene asset curation | FLUX / Stock Asset Caching | `/media/assets` |
| **Floor 04: Media Synthesis** | Voice synthesis, speech timing calculation | `edge-tts` / Supertonic Voice Engine | `/dashboard/voice-registry` |
| **Floor 05: Timeline Composition** | Word-level subtitle alignment & visual layout | `faster-whisper` + SRT timestamp aligner | Dynamic Engine Runner |
| **Floor 06: Video Rendering** | High-throughput video assembly & muxing | MoviePy + FFmpeg (H.264, 1080×1920) | `/media/library`, Real-time SSE |
| **Floor 07: Compliance Gate** | Fact check, policy enforcement, HMAC certificate | FastAPI quality gate (archived service) | `/dashboard/ai-hospital` |
| **Guardian / Overseer** | Telemetry watchdog, automatic failure recovery | EventBus + Observability state store | `/overseer` Presence HUD |

---

## 🏗️ Architecture — Full System Design

### System Overview

```
                              ┌──────────────────────────────┐
                              │        Browser / Client       │
                              │  landing → login → dashboard  │
                              │  Create Video wizard (4-step) │
                              └──────────────┬───────────────┘
                                             │ HTTPS + __session (HMAC)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  Control Plane  gen-v  (Next.js 16 App Router, Turbopack, React 19)    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │  App Router  │ │  Middleware  │ │  Components  │ │   ShortForge  │  │
│  │  (os) shell  │ │  auth gate   │ │  wizard/SSE  │ │  kernel      │  │
│  │  landing/    │ │  /→dashboard │ │  QuickGen    │ │  missions/   │  │
│  │  dashboard/  │ │  /landing→307│ │  TopNav etc  │ │  guardian/   │  │
│  │  media/ etc  │ │  fail-closed │ │              │ │  NLI/adapters│  │
│  └──────┬───────┘ └──────────────┘ └──────────────┘ └──────┬───────┘  │
│         │                                                   │           │
│  ┌──────▼───────────────────────────────────────────────────▼──────┐   │
│  │  lib/  auth · quota · core · factory-store · observability    │   │
│  │  • RouteRegistry / EngineRegistry / ServiceRegistry            │   │
│  │  • SQLiteRenderQueue (better-sqlite3, data/shortfactory.db)   │   │
│  │  • quota-service (atomic 5-video limit, Firestore)            │   │
│  │  • MongoDBClient (factoryos db, InMemory fallback)            │   │
│  └──────┬────────────────────────────────────────────────────────┘   │
│         │  /api/*  (~45 routes)                                     │
│  ┌──────▼──────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────┐  │
│  │ generate-   │ │ job-     │ │ rendering│ │ library │ │ quiz/  │  │
│  │ video       │ │ status   │ │ claim/   │ │ drive/  │ │ engines│  │
│  │ (entry)     │ │ (poll)   │ │ callback │ │ factory-│ │ overseer│  │
│  └──────┬──────┘ └──────────┘ └────┬─────┘ │ state   │ └────────┘  │
└─────────┼───────────────────────────┼────────┴─────────┴─────────────┘
          │ enqueue + token           │ claim (tier-isolated)
          ▼                           ▼
┌─────────────────────┐     ┌──────────────────────────────────────┐
│  Data Layer         │     │  Workers  vps-rendering-engine       │
│  • Firestore        │     │  • basic_render_api :8100 (warm)     │
│    quotas/videos    │     │  • basic_render_worker (async queue, │
│  • MongoDB factoryos│     │    isolated workspaces, ffprobe)     │
│    cases/leases/    │     │  • main.py :8080 (fallback pool)     │
│    memories/DAGs    │     │  • scripts/create_short.py           │
│  • SQLite queue     │     │    Pillow + edge-tts + whisper +    │
│  • Cloudinary CDN   │     │    FFmpeg → Cloudinary/Firestore/   │
│  • Firebase Hosting │     │    Drive (googleapis)               │
└─────────────────────┘     └──────────────┬───────────────────────┘
                                           │  GitHub Actions
                                           ▼
                                ┌──────────────────────┐
                                │ factoryos-render-    │
                                │ worker.yml (cron * ) │
                                │ factoryos-basic-     │
                                │ render.yml (per-job) │
                                └──────────────────────┘
```

### Request Lifecycle (the only live path)

1. **Create** — User hits `POST /api/generate-video` (session + `verifyWritePermission`). Zod validates, `reserveGenerationSlot` atomically enforces **5-video hard limit** (Firestore transaction), script fallback via `scriptAgent` if `scenes` empty.
2. **Enqueue** — `saveJobManifest` (Firestore `videos/{jobId}`) + `SQLiteRenderQueue.enqueue` (priority 0, maxAttempts 3). Generate `executionToken = crypto.randomBytes(32).hex()` — never `jobId` — stored on manifest.
3. **Dispatch** — If `BASIC_RENDER_API_URL` set → `POST /api/render/jobs` to warm pool (sub-60s). Else if `GITHUB_PAT` set → `repository_dispatch` (`factoryos_render_job`). Fallback cron `factoryos-render-worker.yml` every minute claims via `POST /api/rendering/claim` (tier-isolated: `azure↔ADMIN`, `github-actions/basic-fastapi↔BASIC`, stale lease 15 min, limit 25).
4. **Render** — Worker validates `jobId` regex + `executionToken` + `resolve()` traversal guard, sanitizes `topic` for `drawtext`, runs `create_short.py` (Pillow 1080×1920, 30 fps, `edge-tts`, `faster-whisper`, ultrafast preset), `ffprobe` validates output, uploads to Cloudinary, callbacks `POST /api/rendering/callback` (`timingSafeEqual`, idempotent on `completed`, releases quota). Client polls `GET /api/job-status/[id]` every 3 s + `GET /logs/stream` (SSE `deque(500)`).
5. **Deliver** — `GET /api/library/[videoId]` (IDOR: `d.userId !== uid → 403`, orphan→403), `driveFileId && driveUrl && deliveryTarget==GOOGLE_DRIVE` check before showing "Open in Drive".

### Data Stores (authoritative)

| Store | Used For | Client | Notes |
|---|---|---|---|
| **Firestore** (`firebase-admin` 13) | `quotas/{userId}`, `videos/{jobId}`, `quizzes/*`, `generation_logs` | Control Plane | Source of truth for user-facing state |
| **MongoDB** (`mongodb` 7.5, `MONGODB_URI`, db `factoryos` (legacy)) | `cases`, `leases`, `memories`, `task_dags`, `decisions`, `world_state` | `factoryos/core/database/MongoDBClient.ts` | ShortForge kernel; graceful **InMemory** fallback if `MONGODB_URI` unset |
| **SQLite** (`better-sqlite3` 12, `data/shortfactory.db`) | `render_jobs` queue (`queued/claimed/running/retrying/completed/failed`, `progress_percentage`) | `SQLiteRenderQueue` + `QueueProcessor`/`EventBus` | Durable local queue; file-JSON `output/jobs/*.json` as mirror |
| **Cloudinary** (`cloudinary` 2.5) | Final `mp4`/`png`/`srt`, `geo_quiz_factory` | Worker | CDN delivery |
| **PostgreSQL 16 + Redis 7** | Validation gate only | `floors/floor07_compliance` | **Archived** — not live |

### Auth & Security Boundaries

- **Client → Control Plane:** Clerk + Firebase `__session` HMAC-SHA256 (`INTERNAL_API_SECRET_KEY`), `middleware.ts` fail-closed `401` for `/api/*`, `verifySession`/`verifyWritePermission`, role hierarchy `OWNER > ADMIN > EDITOR > USER > VIEWER`, `can(GOOGLE_DRIVE_CONNECT)` capability gate.
- **Control Plane ↔ Workers:** `HTTPBearer` (`INTERNAL_API_SECRET_KEY` / `BASIC_RENDER_API_SECRET` / `RENDER_WORKER_SECRET`), per-job `executionToken` (`crypto.randomBytes(32).hex()`, `timingSafeEqual`), `jobId` regex at API boundary + re-validate in worker, `realpath` prefix check, `topic` whitelist + escape for FFmpeg `drawtext`.
- **Cron:** `CRON_SECRET || INTERNAL_API_SECRET_KEY` fail-closed (`401` if unset), canonical origin `APP_ORIGIN || CONTROL_PLANE_URL` (no `Host`-derived SSRF), no `x-vercel-cron`-only bypass.
- **GH Actions:** SHA-pinned actions (`checkout`, `setup-python`, `setup-ffmpeg`, `cache`), `permissions: contents: read`, `env: INPUT_*` indirection + regex `^[a-zA-Z0-9_-]{8,64}$`, fail-closed on missing `INPUT_EXEC_TOKEN`.

---

## 🗂️ Project Hierarchy & Architecture Mapping

> **Zero-Guesswork System Layout:**
> - **Control Plane (`gen-v/`):** Next.js 16 App Router UI, orchestration, session auth, atomic quotas, & API gateway.
> - **Domain Slices (`floors/*`):** Discrete pipeline stages (Strategy $\to$ Scripting $\to$ Assets $\to$ Audio $\to$ Timeline $\to$ Rendering $\to$ Quality Gate).
> - **Execution Plane (`vps-rendering-engine/`):** Subprocess FFmpeg, Pillow, and Whisper high-throughput compilation workers.

```
AI-Operating-Content-generator/
│
├── gen-v/                          # 🎛️ CONTROL PLANE — Next.js 16 App Router & Orchestrator
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
│   │   ├── api/                    # ~45 route handlers (gateway & service interfaces)
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
│   │   ├── Sidebar.tsx · TopNav.tsx · MobileBottomNav.tsx · BrandIcon.tsx
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
│   ├── factoryos/                  # 🧩 Internal kernel (Vitest, 720+ tests passing)
│   │   ├── core/                   # Workflow runtime, missions, guardian, NLI, adapters
│   │   │   └── database/MongoDBClient.ts  # MongoDB 7 — cases/leases/memories/DAGs/decisions
│   │   ├── tests/                  # api-config, auth, overseer, production-system, creator-flow
│   │   └── evals/ · benchmarks/ · reports/
│   ├── rag/ · ai/ · publishing/ · storage/ · content-engines/
│   ├── middleware.ts               # Auth gate — "/" authed→/dashboard, /landing→307 "/"
│   ├── next.config.mjs             # sharp/sqlite3 externals, Turbopack
│   └── vitest.config.ts            # node env, factoryos/tests only
│
├── floors/                         # 🏭 DOMAIN SLICES — Video Production Assembly Line
│   ├── floor01_strategy/           # Domain Slice: Topic clustering, hook scoring & trend analysis
│   ├── floor02_scripting/          # Domain Slice: Script drafting & multi-beat Q&A structure
│   ├── floor03_asset_realization/  # Domain Slice: Scene prompts & image/asset extraction
│   ├── floor04_media_synthesis/    # Domain Slice: Voice synthesis (`edge-tts`) & timing
│   ├── floor05_timeline_composition/# Domain Slice: Subtitle word-alignment (`faster-whisper`)
│   ├── floor06_rendering/          # Domain Slice: Video composition & FFmpeg muxing
│   ├── floor07_compliance/         # Domain Slice: Quality gate, policy enforcement & certs
│   └── guardian/                   # Autonomous watchdog & self-healing domain telemetry
│
├── vps-rendering-engine/           # 🎬 EXECUTION PLANE — FastAPI + FFmpeg Rendering Workers
│   ├── main.py                     # POST /render-video · GET /job-status/{id} · GET /logs/stream (SSE)
│   ├── basic_render_api.py         # Warm Basic pool — POST /api/render/jobs (port 8100)
│   ├── basic_render_worker.py      # Async warm worker — queue, isolated workspaces, ffprobe, callbacks
│   ├── scripts/create_short.py     # Core pipeline: Pillow 1080×1920, 30fps, edge-tts, faster-whisper
│   ├── assets/{backgrounds,audio}/ # Bundled backgrounds & SFX
│   ├── output/jobs/                # Persistent job manifests (JSON per jobId)
│   ├── start_worker.py             # Alt entry — loads gen-v/.env
│   └── requirements.txt
│
├── archive/
│   └── floor07_compliance_2026-08-23/  # 🗄️ Archived Validation Gate — NOT in live path
│       ├── app/{api,core,domain,application,infrastructure,workers,pipelines,schemas,security}
│       ├── data/policies/          # default.json · youtube.json
│       ├── migrations/ (Alembic)  · tests/{unit,integration,api}/ · docker-compose.yml
│       └── README.md               # provenance: never called from gen-v/app (grep 0 hits)
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

### Layer Responsibilities (live system)

| Layer | Owns | Never Does | Status |
|---|---|---|---|
| **Control Plane `gen-v/`** | UX, auth, orchestration, quota, polling, delivery | Heavy FFmpeg/CUDA work | **Live** |
| **Rendering Workers `vps-rendering-engine/`** | TTS, transcription, frame rendering, muxing, uploads, callbacks | Auth decisions, quota | **Live** |
| **Dispatcher (GitHub Actions)** | Cron claim + `repository_dispatch` to workers | Business logic | **Live** |
| **Data (Firestore / MongoDB / SQLite / Cloudinary)** | Durable state, queue, CDN | Rendering | **Live** |

> Archived: `floors/floor07_compliance` (Validation Gate — policy/fact checks, HMAC certs) lives at `archive/floor07_compliance_2026-08-23/` and is **not part of the live request path**. See [Archived Components](#-archived-components).

---

## 🧰 Tech Stack

| Concern | Choices |
|---|---|
| **Frontend** | Next.js 16 (Turbopack, `reactCompiler: true`), React 19, Tailwind v4, Framer Motion 12, Zustand 5, lucide-react, recharts, sharp, zod, @tanstack/react-query 5 |
| **Data** | **Firestore** (`firebase-admin` 13 / `firebase` 12) — quotas, videos, quizzes · **MongoDB 7** (`mongodb` 7.5, `MONGODB_URI`, db `factoryos` (legacy) via `factoryos/core/database/MongoDBClient.ts` — cases, leases, memories, DAGs, decisions, with graceful InMemory fallback) · **SQLite** (`better-sqlite3` 12) — `SQLiteRenderQueue` (`data/shortfactory.db`) · **PostgreSQL 16 + Redis 7** — validation gate only (archived, `floors/floor07_compliance`) |
| **Auth** | Clerk (`@clerk/nextjs` 6) + Firebase Auth — `__session` HMAC-SHA256 via `INTERNAL_API_SECRET_KEY`, role hierarchy `OWNER > ADMIN > EDITOR > USER > VIEWER`; `nodemailer` 9 for mail |
| **Validation (archived)** | FastAPI, Pydantic, SQLAlchemy 2 + asyncpg, Alembic, Redis (asyncio), structlog, orjson, prometheus-client — `floors/floor07_compliance` (archived, not live; see [Archived Components](#-archived-components)) |
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

> 🗄️ `floors/floor07_compliance` (Validation Gate) is **archived** at `archive/floor07_compliance_2026-08-23/` and not required to run or deploy the app. See [Archived Components](#-archived-components) to restore it locally.

---

## 🔐 Environment Variables

Each service has its own `.env` (gitignored — see `*.example`):

| Service | Key Variables |
|---|---|
| `gen-v/.env` | `GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `DEFAULT_LLM_PROVIDER` · `NEXT_PUBLIC_RENDER_ENGINE_URL` · `ENABLE_LOCAL_RENDER` · `TOGETHER_API_KEY` · `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `CLERK_SECRET_KEY` · `FIREBASE_*` · `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `MONGODB_URI` (→ `factoryos/core/database/MongoDBClient.ts`, db `factoryos` (legacy); optional — falls back to InMemory) · `BASIC_RENDER_API_URL` · `BASIC_RENDER_API_SECRET` · `GITHUB_PAT`/`GH_TOKEN` · `GITHUB_REPO` |
| `vps-rendering-engine/.env` | `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `BASIC_RENDER_API_SECRET` · `MAX_CONCURRENT_JOBS` · `CONTROL_PLANE_URL` · `BASIC_RENDER_PORT` · `BASIC_PERSISTENT_CACHE_DIR` · `BASIC_EPHEMERAL_WORKSPACE_ROOT` |
| `archive/floor07_compliance_2026-08-23/.env` *(archived, not live)* | `DATABASE_URL` (asyncpg), `REDIS_URL`, `SIGNING_SECRET_KEY` (`python -c "import secrets; print(secrets.token_hex(32))"`), `POLICY_DATA_DIR`, `LOG_LEVEL` — see [Archived Components](#-archived-components) |

> System `ffmpeg` must be on PATH for both local rendering and the VPS engine.

---

## 📡 API Reference

```bash
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
npx vite-node factoryos/demo.ts              # ShortForge demo
npx vite-node factoryos/demo-production.ts   # production demo
npx vitest run factoryos/tests/<name>.test.ts --config vitest.config.ts  # single file
npm run factoryos:typecheck         # tsc --project tsconfig.factoryos.json --noEmit
npm run factoryos:eval:rag          # RAG eval
npm run factoryos:eval:quiz         # Quiz eval
npm run lint                        # eslint (next/core-web-vitals)
npm run build                       # next build (Turbopack) — 77 routes

cd archive/floor07_compliance_2026-08-23  # archived validation gate — optional
make test && make test-unit && make test-integration && make test-api  # pytest --cov-fail-under=95
make lint && make format && make typecheck   # ruff + black + mypy (strict)

cd vps-rendering-engine
python -m py_compile basic_render_worker.py basic_render_api.py  # syntax gate
# Integration & Contract Verification:
# • Deterministic schema validation against persistent job manifests (output/jobs/<jobId>.json)
# • Subprocess exit code validation (FFmpeg libx264 + edge-tts)
# • ffprobe container & multi-track audio/video integrity verification before upload
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

## 🗄️ Archived Components

**`floors/floor07_compliance` — Validation Gate is archived and NOT in the live request path.**

| | Detail |
|---|---|
| **Location** | `archive/floor07_compliance_2026-08-23/` (original path `floors/floor07_compliance/`) |
| **What it was** | FastAPI service `POST /v1/validate` → `FactWorker` · `PolicyWorker` · `RiskWorker` → `CertificateWorker` (HMAC-SHA256 via `app/security/signing.py` → Postgres) with `data/policies/{default,youtube}.json`, Alembic migrations, `docker-compose.yml` (`api` + `postgres:16` + `redis:7`). Stack: FastAPI, Pydantic, SQLAlchemy 2 + asyncpg, Redis asyncio, structlog, orjson, prometheus-client. |
| **Why archived** | Ghost architecture — `grep -r floor07_compliance gen-v/app` → **0 hits**. Control Plane never called `POST /v1/validate`; `gen-v` validates via `lib/content-pipeline.ts` + `scriptAgent` + `autoRefinePipeline` instead. Kept shipping as docs would mislead contributors. Provenance + `grep` proof in `archive/floor07_compliance_2026-08-23/README.md`. |
| **Branch rule** | Do **not** re-wire it without a dedicated branch. `THIS BRANCH = Creator UX · Navigation · Creation workflow · Quota · Progress · Library`. `DO NOT TOUCH: RAG / NLI / Azure worker / Drive provider / Delivery contract / floor07 ghost`. |
| **Restore locally** | `cp -r archive/floor07_compliance_2026-08-23 floors/floor07_compliance && cd floors/floor07_compliance && cp .env.example .env` → set `DATABASE_URL`/`REDIS_URL`/`SIGNING_SECRET_KEY` → `docker compose up --build -d` → docs at `/docs`, health at `/health`. Requires Docker + Postgres 16 + Redis 7. |
| **Tests (if restored)** | `make test` / `make test-unit` / `make test-integration` / `make test-api` (`pytest --cov-fail-under=95`), `make lint` / `make format` / `make typecheck` (ruff + black + mypy strict). |

---

## 🔒 Security Notes

- **Auth:** Clerk + Firebase (`__session` HMAC-SHA256 via `INTERNAL_API_SECRET_KEY`), `middleware.ts` fail-closed `401` for `/api/*`, role hierarchy `OWNER > ADMIN > EDITOR > USER > VIEWER`.
- **OAuth:** state `HMAC(nonce)` + `timingSafeEqual` + cookie 600s binding.
- **Cron/worker:** `Bearer CRON_SECRET || INTERNAL_API_SECRET_KEY` fail-closed (`401` if unset, no `x-vercel-cron`-only bypass), canonical origin `APP_ORIGIN` (no `Host`-derived SSRF); GH dispatch via `GITHUB_PAT` with strong `crypto.randomBytes(32)` per-job `executionToken`, `timingSafeEqual` in `claim`/`callback`.
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

<p align="center"><strong>ShortForge</strong> is engineered as a high-throughput, enterprise-grade AI automated media production system.</p>
