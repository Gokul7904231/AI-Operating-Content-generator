# ShortForge — System Architecture

> **One topic in. One viral Short out.** ShortForge turns any idea into a publish-ready 1080×1920 YouTube Short — script, voice, images, subtitles, muxing — fully automated. Control Plane orchestrates; workers render; storage delivers.

<p align="center">
  <a href="https://github.com/Gokul7904231/AI-Shorts-Maker/actions/workflows/ci.yml"><img src="https://github.com/Gokul7904231/AI-Shorts-Maker/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Strict_Only_in_tsconfig.factoryos.json-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vitest-FactoryOS_Scoped-brightgreen?style=flat-square&logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Next.js-16_Control_Plane-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/FastAPI-Python_3.11+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <a href="../LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" /></a>
</p>

**Branch:** `chore/rename-shortforge` → `main` · **Control Plane:** `apps/web` (Next.js 16 · Turbopack · React 19) · **Rendering:** `services/rendering-engine` (FastAPI + FFmpeg 6.1.1) · **Pipeline floors:** `services/pipeline/floor0{1..6}+guardian` · **Archived gate:** `archive/floor07_compliance_2026-08-23`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Context](#2-system-context)
3. [Repository Map — Canonical Paths](#3-repository-map--canonical-paths)
4. [Control Plane — `apps/web`](#4-control-plane--appsweb)
5. [Data Layer](#5-data-layer)
6. [AI & Generation Layer](#6-ai--generation-layer)
7. [Execution Plane — Rendering](#7-execution-plane--rendering)
8. [Pipeline Floors — `services/pipeline`](#8-pipeline-floors--servicespipeline)
9. [FactoryOS Kernel & Content Engines](#9-factoryos-kernel--content-engines)
10. [Skill System](#10-skill-system)
11. [Security Model](#11-security-model)
12. [Observability & Operations](#12-observability--operations)
13. [API Surface](#13-api-surface-109-routes)
14. [Environment & Configuration](#14-environment--configuration)
15. [Build, CI/CD & Deployment](#15-build-cicd--deployment)
16. [Local Development](#16-local-development)
17. [Testing & Quality Gates](#17-testing--quality-gates)
18. [Archived Components](#18-archived-components)
19. [Knowledge Base & ADRs](#19-knowledge-base--adrs)
20. [Roadmap](#20-roadmap)

---

## 1. Executive Summary

ShortForge is an **enterprise microservice suite for automated short-form video generation**. Three planes are deliberately decoupled and communicate only over HTTPS + bearer-token auth:

| Plane | Location | Responsibility | Runtime | Status |
|---|---|---|---|---|
| **Control Plane** | `apps/web/` | UX, auth, orchestration, atomic quotas, dispatch, polling, delivery | Next.js 16 · React 19 · Turbopack · Clerk + Firebase | **Live** |
| **Execution Plane** | `services/rendering-engine/` | TTS, transcription, Pillow, MoviePy, FFmpeg muxing, uploads, callbacks | FastAPI · Python 3.11+ · FFmpeg 6.1.1 · `edge-tts` · `faster-whisper` | **Live** |
| **Domain Slices** | `services/pipeline/floor0{1..6}` + `guardian/` | Strategy → scripting → asset realization → media synthesis → timeline composition → rendering (each hexagonal) | Python 3.11+ · `app/` hexagonal layout | **Live** (sliced) |
| **Compliance Gate** | `archive/floor07_compliance_2026-08-23/` | `POST /v1/validate` → Fact/Policy/Risk/Certificate (HMAC cert) | FastAPI · Postgres 16 · Redis 7 · Poetry | **Archived** |

**Live request path:** `Browser → apps/web POST /api/generate-video (Zod + Firestore atomic 5-video limit + scriptAgent) → saveJobManifest + SQLiteRenderQueue.enqueue + executionToken → warm pool POST {BASIC_RENDER_API_URL}/api/render/jobs (sub-60s) or repository_dispatch fallback → services/rendering-engine Pillow/edge-tts/whisper/FFmpeg → ffprobe → Cloudinary + Firestore → POST /api/rendering/callback (timingSafeEqual, idempotent) → GET /api/job-status/[id] poll + SSE`.

**Non-negotiable invariants (senior review):** 5-video atomic quota per user (Firestore transaction, never client-enforced); per-job `executionToken = crypto.randomBytes(32).hex()` never `jobId`, verified with `timingSafeEqual`; `jobId` regex `^[a-zA-Z0-9_-]{8,64}$` at API boundary and re-validated in worker with `realpath` prefix check; `BASIC→Azure` dispatch forbidden (tier-isolated); Control Plane never does heavy FFmpeg; workers never make auth/quota decisions.

---

## 2. System Context

```
                         ┌──────────────────────────────┐
                         │       Browser / Client        │
                         │ landing → login → dashboard   │
                         │ Create Video wizard (4-step)  │
                         │ Zustand · TanStack Query · SSE│
                         └──────────────┬───────────────┘
                                        │ HTTPS + __session HMAC
                                        │ (Clerk __session cookie)
                                        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│  Control Plane  apps/web  (Next.js 16 App Router, Turbopack, React 19)    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │  App Router  │ │  Middleware  │ │  Components  │ │   ShortForge     │  │
│  │  (os) shell  │ │  auth gate   │ │  QuickGen    │ │   Skill Engine   │  │
│  │  landing/    │ │  /→dashboard │ │  TopNav/Side │ │   (docs-only)    │  │
│  │  dashboard/  │ │  /landing→307│ │  Hero/Landing│ │   5 SKILL.md    │  │
│  │  media/ etc  │ │  fail-closed │ │  OverseerEye │ │                  │  │
│  └──────┬───────┘ └──────────────┘ └──────────────┘ └──────┬───────────┘  │
│         │                                                   │              │
│  ┌──────▼───────────────────────────────────────────────────▼──────────┐  │
│  │  lib/  auth · quota · core · visual-assets · voice · ai-provider  │  │
│  │  • RouteRegistry / EngineRegistry / ServiceRegistry / CheckpointDB │  │
│  │  • SQLiteRenderQueue (better-sqlite3, data/shortfactory.db, WAL)  │  │
│  │  • quota-service (Firestore transaction, 5 lifetime / 8 pro/mo)    │  │
│  │  • MongoDBClient (factoryos db, InMemory fallback)                 │  │
│  │  • AIRuntime / IntelligentRouter / AIProviderRegistry              │  │
│  └──────┬────────────────────────────────────────────────────────────┘  │
│         │  /api/*  (109 routes, Zod, verifySession)                      │
│  ┌──────▼──────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────┐    │
│  │ generate-   │ │ job-     │ │ rendering│ │ library │ │ quiz/    │    │
│  │ video       │ │ status   │ │ claim/   │ │ drive/  │ │ engines  │    │
│  │ (entry)     │ │ (poll)   │ │ callback │ │ publish │ │ overseer │    │
│  └──────┬──────┘ └──────────┘ └────┬─────┘ └─────────┘ └──────────┘    │
└─────────┼───────────────────────────┼────────────────────────────────────┘
          │ enqueue + executionToken  │ claim (tier-isolated)
          ▼                           ▼
┌─────────────────────┐     ┌───────────────────────────────────────┐
│  Data Layer         │     │  Execution Plane                      │
│  • Firestore        │     │  services/rendering-engine            │
│    quotas/{uid}     │     │  • basic_render_api :8100 (warm pool) │
│    videos/{jobId}   │     │  • basic_render_worker (async queue,  │
│    quizzes/*        │     │    isolated workspaces, ffprobe)      │
│  • MongoDB factoryos│     │  • main.py :8080 (fallback pool)      │
│    cases/leases/    │     │  • scripts/create_short.py            │
│    memories/DAGs    │     │    Pillow 1080×1920 30fps · edge-tts   │
│  • SQLite queue     │     │    faster-whisper · FFmpeg libx264    │
│    render_jobs      │     │    ffprobe → Cloudinary / Firestore   │
│  • Cloudinary CDN   │     │  • auto_scheduler · worker_daemon     │
│  • Firebase Hosting │     └──────────────┬────────────────────────┘
└─────────────────────┘                    │  GitHub Actions
                                           ▼
                                ┌──────────────────────┐
                                │ factoryos-render-    │
                                │ worker.yml (cron *)  │
                                │ factoryos-basic-     │
                                │ render.yml (per-job) │
                                └──────────────────────┘
```

**Data flow (authoritative):** `verifySession + verifyWritePermission → Zod → reserveGenerationSlot (Firestore tx) → scriptAgent (if scenes empty) → validateContent/autoRefinePipeline → EngineRegistry snapshot → saveJobManifest (Firestore) + SQLiteRenderQueue.enqueue → executionToken → dispatch (warm pool else repository_dispatch) → worker validates jobId+token+realpath → create_short.py (Pillow/tts/whisper/FFmpeg ultrafast) → ffprobe → Cloudinary + Firestore → callback timingSafeEqual → finalizeGenerationSlot → client polls job-status + SSE`.

---

## 3. Repository Map — Canonical Paths

```
aishorts/   (monorepo, git ls-files is source of truth — gen-v/ and floors/ on disk are legacy, gitignored)
│
├── apps/web/                         # Control Plane — root for npm (engines node >=20, npm >=10)
│   ├── app/                          # Next.js App Router
│   │   ├── (os)/                     # Authenticated OS shell (dashboard, factory, media, overseer)
│   │   │   ├── layout.tsx            # Sidebar + TopNav + MobileBottomNav + quota polling
│   │   │   ├── dashboard/            # Role-aware dashboard (BasicUser vs Admin/Owner)
│   │   │   ├── factory/              # Operator views: jobs, queue (Kanban), scheduler, workflows
│   │   │   ├── media/                # library · assets · drive · cloudinary
│   │   │   ├── engines/              # Engine catalog — quiz / facts / motivational / story / …
│   │   │   ├── overseer/             # AI overseer presence (eye system + status ring)
│   │   │   ├── publishing/           # drive · youtube · tiktok · instagram
│   │   │   ├── analytics/            # Metrics & insights
│   │   │   ├── admin/                # User & telemetry admin
│   │   │   └── pricing/ settings/ etc
│   │   ├── api/                      # 109 route handlers (see §13)
│   │   ├── landing/ login/           # Public surfaces
│   │   └── globals.css · providers.tsx · middleware.ts
│   ├── components/                   # QuickGenerateOverlay (4-step wizard), Sidebar, TopNav, landing/*
│   ├── lib/
│   │   ├── auth/                     # Firebase + Clerk, HMAC __session, roles, audit
│   │   ├── quota/quota-service.ts    # Atomic reservation — 5 lifetime (Basic) / 8 per month (Pro)
│   │   ├── core/                     # RouteRegistry · EngineRegistry · ServiceRegistry · SQLiteRenderQueue · CheckpointDB · RenderPlanner · MediaPipeline · etc
│   │   ├── visual-assets/            # AssetPlanner · SceneIntentAnalyzer · VisualPipeline · etc
│   │   ├── voice/                    # voice-router · AudioPipeline · edge/elevenlabs providers
│   │   ├── ai-provider/              # Legacy ProviderRouter + model-discovery + prompt-builder (dual with ai/)
│   │   ├── shortforge-skills/        # ShortForge-native Skill Engine — docs-only (5 SKILL.md)
│   │   ├── firebase-admin.ts · jobs-history.ts · audit-logger.ts · safe-sqlite.ts
│   │   └── content-pipeline.ts · auto-refine-pipeline.ts · queue-db.ts
│   ├── ai/                           # AI Router — capability-registry · ai-config-manager · intelligent-router · runtime
│   │   ├── providers/                # gemini, groq, google, openrouter, nvidia, huggingface, zai, local-ai-manager, pollinations
│   │   └── models/ · capability-resolver · execution-adapters · benchmark-db
│   ├── agents/                       # Legacy LLM agents — script-agent, scene-agent, hook-score-agent, scene-quality-agent, etc (10 files)
│   ├── factoryos/                    # FactoryOS framework — kernel, skills, evals, Vitest (scoped)
│   │   ├── core/                     # 40+ modules — cognitive, guardian, checkpoint, contracts, cases, memory, etc
│   │   ├── skills/                   # 9 domain skills (canonical, versioned, SKILL.md + manifest.json)
│   │   └── tests/                    # Vitest — node env, 60s timeout, fileParallelism
│   ├── rag/ ai/ content-engines/ publishing/ storage/ prompts/ config/
│   ├── middleware.ts                 # Clerk auth gate (fail-closed, PUBLIC_PREFIXES allowlist)
│   ├── next.config.mjs               # reactCompiler, Turbopack, serverExternalPackages, outputFileTracingExcludes (CF worker)
│   ├── vitest.config.ts              # include: factoryos/tests/** + tests/** + shortforge/tests/**, node env
│   ├── tsconfig.factoryos.json       # strict:true only here (app tsconfig is relaxed)
│   ├── open-next.config.ts · wrangler.toml
│   └── package.json                  # next 16.2.12, react 19.2.4, Clerk 6, ai 7, better-sqlite3 12, etc
│
├── services/
│   ├── rendering-engine/             # FastAPI workers — Python 3.11+, FFmpeg on PATH
│   │   ├── main.py                   # :8080 — POST /render-video, GET /job-status/{id}, GET /logs/stream (SSE deque 500)
│   │   ├── basic_render_api.py       # :8100 — warm Basic pool POST /api/render/jobs
│   │   ├── basic_render_worker.py    # Async worker — isolated workspaces, ffprobe, Cloudinary, callback
│   │   ├── scripts/create_short.py   # Core pipeline — Pillow 1080×1920 · 30fps · edge-tts · faster-whisper · FFmpeg
│   │   ├── worker_daemon.py · auto_scheduler.py · start_worker.py
│   │   ├── factoryos-*.service · setup_*.sh · Dockerfile · requirements.txt
│   │   └── assets/{backgrounds,audio}/ · output/jobs/
│   └── pipeline/                     # Domain slices — each hexagonal app/ + tests/
│       ├── floor01_strategy/         # Topic clustering, viral archetype, hook scoring
│       ├── floor02_scripting/        # Script drafting, multi-beat Q&A structure
│       ├── floor03_asset_realization/
│       ├── floor04_media_synthesis/  # Voice synthesis & timing
│       ├── floor05_timeline_composition/ # Subtitle word-alignment
│       ├── floor06_rendering/        # Video composition & muxing
│       └── guardian/                 # Watchdog, self-healing, Decision Ledger, CircuitBreaker
│
├── docs/
│   ├── ARCHITECTURE.md               # This file — authoritative live design
│   ├── architecture/                 # AUTHENTICATION.md · BASIC_CLOUD_RENDERING.md · BYOLM.md · README.md
│   ├── akb/                          # Architecture Knowledge Base — EA-001, RA-007, AKB-000 …
│   ├── deployment/                   # AUTH_MIGRATION.md · LOCAL_AI_SETUP.md · README.md
│   └── factoryos/                    # frontier-v2-*, overseer-*, STRIX_SECURITY_WORKFLOW.md
│
├── archive/
│   └── floor07_compliance_2026-08-23/ # Archived Compliance Gate — Poetry, Hexagonal, docker-compose (api+postgres+redis)
│       ├── app/{api,core,domain,application,infrastructure,workers,pipelines,schemas,security}
│       ├── data/policies/            # default.json · youtube.json
│       └── migrations/ · tests/{unit,integration,api}/ · docker-compose.yml
│
├── .github/workflows/                # ci.yml · factoryos-render-worker.yml (cron * * * * *) · factoryos-basic-render.yml
├── firebase.json · .firebaserc       # Hosting: public=firebase-hosting
├── vercel.json · LICENSE (MIT) · commitlint.config.js · .husky/
└── CLAUDE.md                         # Contributor guide — commands, service map, env

Legacy physical dirs `gen-v/` and `floors/` may remain on disk (gitignored) until manual cleanup — canonical tracked paths are `apps/web` and `services/*` (verified via `git ls-files`).
```

---

## 4. Control Plane — `apps/web`

### 4.1 Framework & Build

- **Next.js 16 (App Router) + React 19 + Turbopack**, `reactCompiler: true`, path alias `@/* → ./*`, Tailwind v4, Framer Motion 12, Zustand 5, TanStack Query 5, `sharp` for images (`images.unoptimized: true` for Windows CI).
- `next.config.mjs` — `serverExternalPackages: ['sqlite3','better-sqlite3','@xenova/transformers']`, `outputFileTracingExcludes` strips native binaries (`*.node`, `better-sqlite3`, `sharp`, `venv`, `generated`, `data`, `*.db*`, `*.mp4/mov/avi/wav`) from Cloudflare Worker; `webpack.watchOptions.ignored` excludes `data/generated/cache/telemetry/*.db`.
- `open-next.config.ts` — `defineCloudflareConfig()` (`useWorkerdCondition:false`), `wrangler.toml` for `opennextjs-cloudflare` build/preview/deploy.
- `middleware.ts` — **fail-closed auth gate**. `PUBLIC_PREFIXES = ["/login","/api/published-video","/api/health","/api/auth","/api/render-workers/pair","/api/render-workers/heartbeat","/api/rendering","/_next","/public","/favicon.ico","/demo-short.mp4",...]`. `/` with `__session` → `/dashboard`; `/landing*` → `307 /`; `/new-ui*` → explicit 1:1 redirects; `/dashboard/quiz` → `/engines/quiz`; `/api/*` without cookie or `Bearer INTERNAL_API_SECRET_KEY` → `401 UNAUTHORIZED`; UI without auth → `302 /login?redirect=…`.

### 4.2 Auth & Authorization

- **Client → Control Plane:** Clerk (`@clerk/nextjs` 6) + Firebase `__session` cookie `HMAC-SHA256(INTERNAL_API_SECRET_KEY)`. HTTP-only `__session`.
- `lib/auth/auth.ts` — `verifySession(req)` checks `Authorization: Bearer INTERNAL_API_SECRET_KEY` (internal service) else `__session` cookie → `verifySessionCookieServer` → `UserRepository.findById` / `findByNormalizedEmail` (canonical) → effective role mapping (`ADMIN` with `adminExpiresAt` expiry → downgrade to `USER`; `gokul32499@gmail.com` bootstrap to `OWNER`). Throws `UnauthorizedError` / `ForbiddenError` / `AccountDisabledError`.
- `verifyRole(user, requiredRole)` + `verifyWritePermission(user)` (`VIEWER` → `403 read-only`). Role hierarchy `OWNER > ADMIN > PRO > USER/EDITOR > VIEWER`, helper `isRoleAtLeast`, `isAdminUser`, `isEffectiveAdmin`.
- `lib/auth/providers.tsx` + `AuthService.ts` — logout purges `factoryos:create:draft` scoped keys (per-uid namespacing, legacy purge, `?step` stripping).
- Middleware + `verifySession` are **defense-in-depth** — every `/api/*` re-verifies; anonymous fallbacks (`uid:"anonymous"`) are security findings (see §11, now acknowledged as deferred).

### 4.3 App Router & Key Pages

| Route | Purpose |
|---|---|
| `/` | Public landing (authed → `/dashboard`) |
| `/login` | Auth entry (authed → `/dashboard`) |
| `/(os)/dashboard` | Role-aware dashboard (BasicUser vs Admin/Owner) |
| `/(os)/factory` | Operator — jobs, queue Kanban, scheduler, workflows |
| `/(os)/media` | `library` · `assets` · `drive` · `cloudinary` |
| `/(os)/engines` | Engine catalog — quiz / facts / motivational / story / coding / history / news / reddit / guess-flag / guess-logo |
| `/(os)/overseer` | AI overseer presence (eye system + eye ring) |
| `/(os)/publishing` | drive · youtube · tiktok · instagram |
| `/(os)/analytics`, `/(os)/ai`, `/(os)/admin`, `/(os)/settings`, `/(os)/pricing`, `/(os)/recent-renders` | Metrics, AI hospital, user/telemetry admin, keys, pricing |

`components/QuickGenerateOverlay.tsx` — 4-step wizard `IDEA → REVIEW → RENDER → READY`, per-user `factoryos:create:draft:<uid>` localStorage, `?step` stripped for fresh accounts.

### 4.4 State & Realtime

- **Zustand** (`lib/os-store.ts` — `quickGenerateOpen`, etc), **TanStack Query** 5, **Framer Motion** 12.
- **Polling:** `GET /api/job-status/[id]` every 2.5s in wizard; `GET /logs/stream` SSE (`deque(500)` + `_DequeHandler` on worker).
- **SSE:** `app/api/factory-state/sse`, `app/api/overseer/presence/events`, `observability/events`.

### 4.5 Quota Engine — `lib/quota/quota-service.ts`

Senior invariant: **server-authoritative, atomic, never client-enforced.**

```ts
getBasicGenerationLimit() // env BASIC_GENERATION_LIMIT default 5
MAX_BASIC_USER_VIDEOS = getBasicGenerationLimit()
MAX_PRO_USER_VIDEOS = 8

getCalendarMonthBounds(date) → { periodKey:"YYYY-MM", start, end }  // UTC

getUserQuota(userId, role) → UserQuotaInfo {
  tier: BASIC|PRO|ADMIN|OWNER, periodType, limit, completed, reserved, totalUsed, remaining, isUnlimited, isExceeded
}
reserveGenerationSlot(userId, role, jobId)  // Firestore runTransaction — atomic; idempotent on same jobId; throws QuotaExceededError 429
releaseGenerationSlot(userId, role, jobId)  // on early failure/cancel — supports (uid,jobId) compat shape
consumeGenerationSlot / finalizeGenerationSlot  // on callback after artifact verification (size>1000, valid MP4 header)
```

- **BASIC:** lifetime 5 (`quotas/{userId}`, `periodKey:"lifetime"`).
- **PRO:** 8 per calendar month (`quotas/{userId_YYYY-MM}`).
- **ADMIN/OWNER:** unlimited (`Infinity`), still reserved for audit ledger.
- Firestore `quotas` doc: `{ userId, tier, completed, reservedSlots:{ [jobId]:{jobId,reservedAt} }, periodKey, updatedAt }`. `totalUsed = completed + len(reservedSlots)`; `isExceeded = totalUsed >= limit`.
- Call sites: `POST /api/generate-video` reserves before enqueue; `POST /api/rendering/callback` consumes after verifying artifact; `catch` in `generate-video` releases on failure.

---

## 5. Data Layer

| Store | Purpose | Client | Notes |
|---|---|---|---|
| **Firestore** (`firebase-admin` 13 / `firebase` 12) | `quotas/{userId[_YYYY-MM]}`, `videos/{jobId}` (manifest), `quizzes/*`, `generation_logs`, `users` | `lib/firebase-admin.ts` (`db`), `lib/jobs-history.ts` (`saveJobManifest`, `readJobManifest`, `getJobsIndex`), `lib/firebase.ts` (client) | **Source of truth** for user-facing state; `inMemoryJobs Map` dual-write fallback |
| **MongoDB** (`mongodb` 7.5, `MONGODB_URI`, db `factoryos` legacy) | `cases`, `leases`, `memories`, `task_dags`, `decisions`, `world_state` | `factoryos/core/database/MongoDBClient.ts` | Kernel only; graceful **InMemory** fallback if unset |
| **SQLite** (`better-sqlite3` 12, `data/shortfactory.db`, WAL `synchronous=NORMAL`) | `render_jobs` queue — `id`, `job_id`, `payload_json`, `status queued|claimed|running|retrying|completed|failed`, `attempts`, `max_attempts=3`, `priority`, `request_hash` (sha256 canonical), `worker_id`, `started_at`, `heartbeat_at`, `next_retry_at`, `last_error`, `progress_percentage` | `lib/core/SQLiteRenderQueue.ts` (`enqueue` idempotent by hash, `claim` tx, `heartbeat`, `evictStaleJobs`) → `ServiceRegistry` → `QueueProcessor`/`EventBus` | Durable local queue; indices on `(status,priority,created)`, `job_id`, `request_hash`; also file `output/jobs/*.json` mirror |
| **Cloudinary** (`cloudinary` 2.5) | Final `mp4`/`png`/`srt` CDN (`geo_quiz_factory` etc) | Worker `cloudinary` SDK | Presigned uploads — per-tenant limits on roadmap |
| **PostgreSQL 16 + Redis 7** | Validation gate only | `archive/floor07_compliance` | **Archived, not live** |
| **Local FS** | `generated/jobs/{jobId}.json`, `data/scene-cache`, `benchmarks/*.db`, `telemetry/` | `lib/core/*`, `lib/queue-db.ts` (MetricsDB) | Excluded from CF Worker trace; Watched-ignored |

**Job manifest** (`lib/jobs-history.ts: VideoJob`) — `{ id, jobId, userId, script, contentType: MOTIVATIONAL|FACTS|STORY|QUIZ_SHORTS, videoUrl, cloudinaryPublicId, status: queued|processing|completed|failed|purged, createdAt, renderDurationSeconds, videoSizeMb, topic?, engineId?, engineSnapshot?, quizData?, scenes? }`.

---

## 6. AI & Generation Layer

### 6.1 The Two Routers (Senior Note — Intentional Duality)

| Router | Location | Capability | Selection | Used By |
|---|---|---|---|---|
| **IntelligentRouter + AIRuntime** | `ai/capability-registry.ts` + `ai/ai-config-manager.ts` + `ai/intelligent-router.ts` + `ai/runtime.ts` | `AICapability` enum: `SCRIPT, IMAGE, SPEECH, VISION, EMBEDDING, RERANKING, METADATA, THUMBNAIL, …` | Scored `quality 0.45 + latency 0.3 + cost 0.15 + availability 0.1 + subtask boosts`, health `errorRate>0.85` skip, dynamic benchmark EMA, `AIProfile` (Balanced, Maximum Quality/Speed, etc) | `agents/*` via `IntelligentRouter.routeExecute`, FactoryOS kernel |
| **ProviderRouter (legacy)** | `lib/ai-provider/` — `ProviderRouter.ts` + `model-discovery.ts` + `prompt-builder.ts` + `providers/{Gemini,GenericFallback}` | `SCRIPT`/`QUIZ` etc, auto model discovery, `Gemini→fallback1→fallback2` | `capability/quality/context/vision/structured` + fallback chain, `temperature/maxTokens` | `agents/script-agent` (via `providerFactory`), `lib/content-pipeline`, quiz routes |

Both respect **cost safety** (`maxProviderCalls`, `maxRenderRetries`) and **model-agnosticism** (`capability/quality/context/vision/structured`, not hard-coded model IDs). `ai/providers/factory_with_fallback.ts → getProviderWithFallback()` bridges.

**AIRuntime** (`ai/runtime.ts`) — `execute(capability, version, params:{prompt,system,maxTokens,temperature}, {timeoutMs, signal, traceId})` with `AbortController` + parent signal propagation + `TimeoutExceeded` handling + `RuntimeTrace` (traceId/spanId/provider/model/cost) + `MetricsDB` + `AIDoctor.triggerFailureDiagnosis` on failure.

**AIConfigManager** (`ai/ai-config-manager.ts`) — loads `config/{providers,models,capabilities,routing,benchmarks,pricing}.json`, syncs to `AIProviderRegistry` plugins, `saveBenchmarks()` with dynamic speed EMA.

### 6.2 Providers

`ai/providers/` — `gemini.ts`, `google.ts`, `groq.ts` (llama-3.1-8b-instant), `openrouter.ts`, `nvidia.ts`, `huggingface.ts`, `zai.ts` (glm-4.7-flash etc), `local-ai-manager.ts` (Ollama/LM Studio), `pollinations/{provider,mapper,models,capabilities,health}.ts`, `base-provider.ts`. Scores: `glm-4.7-flash +500 for CODING`, `gemini-2.5-flash +500 for REASONING`, `llama-3.1-8b +600 for JSON/SCRIPT`.

### 6.3 Script Generation — `agents/script-agent.ts`

- `QUIZ_SHORTS` — generates 5–8 questions (profile-aware), `expectedCount` 6/8 repair logic, `repairDirective` + `topicAllocationDirective`, hook templates (`"Only 1% get Q6 right"`), JSON prompt, 3-attempt loop with `generateMissingQuestions()`补齐, validation (options/answer/difficulty ladder 3-easy/3-medium/4-hard for 10Q, duplicates, topicId assignment).
- Non-quiz — `scenesCount = clamp(duration,30,60)/6`, `contactText + imagePrompt` per scene, character profile `defaultCharacterProfile`, retention rules injection.
- `factory` (`ai/factory.ts: providerFactory(provider, {apiKey})`) is deprecated bridge to `AIProviderRegistry`.

### 6.4 Scene & Quality Agents

| Agent | Input/Output | Logic |
|---|---|---|
| `scene-agent.ts` | `RegenerateSceneInput` → `{id,text,imagePrompt,parseMetrics}` | Character-consistent (14 cinematic rules: movement, push-in/orbit/tracking/handheld, 4–8s), `safeJsonParse` + regex fallback, 2 attempts |
| `hook-score-agent.ts` | `{hook}` → `{score,reason}` | `curiosityGap*0.25+emotionalTension*0.2+pacing*0.2+transformation*0.2+interruption*0.15`, threshold ≥7, weakest metric in reason |
| `scene-quality-agent.ts` | `{scene}` → score | Motion/camera/lighting/story, reject `person standing in room` |
| `metadata-agent.ts` | → `{title,hashtags}` | `hashtags 5–10`, no generic titles |
| `thumbnail-agent.ts` | → `{thumbnailPrompt,headlineText}` | |
| `quiz-corrector-agent.ts`, `enhance-agent.ts`, `trend-agent.ts` | | Repair/enrich |

**Validation gates:** `lib/content-pipeline.ts:validateContent` (4 parallel LLM calls: hook≥7, sceneQuality avg≥7, metadata, thumbnail, `findSimilarTopic` Jaccard 0.95 reject) → on `!approved` → `lib/auto-refine-pipeline.ts:autoRefinePipeline` (up to 3 loops: regenerate worst hook/scene via `regenerateSceneAgent`, re-score, keep best; `faster:true` bypasses).

### 6.5 Visual / Voice Pipelines

- **Visual:** `lib/visual-assets/{AssetPlanner, SceneIntentAnalyzer, VisualGraphBuilder, CompositionPlanner, StyleEngine, AssetRankingEngine, DiversityEngine, VisualCritic, VisualPipeline}.ts` + `lib/core/MediaPipeline.ts` → intentional `PlannedAssetSpec[]` (background/overlay/foreground, 1080×1920 portrait).
- **Voice:** `lib/voice/{voice-router, voice-provider, providers/{edge,elevenlabs,supertonic}, AudioPipeline, narration-session}.ts` — `VoiceRouter.createSession(videoId, providerId)` health-check + anti-consecutive pair selection, frozen `NarrationSession`.
- **RAG:** `rag/topic-memory.ts` — Jaccard dedup (`findSimilarTopic`, threshold 0.35, reject 0.95); `rag/chroma/retrieval.ts` — stubbed (future Chroma).
- **Prompts:** `prompts/retention-rules.ts` (`HIGH_RETENTION_RULES`), `prompts/retention-scene-rules.ts`, `prompts/retention-metrics.ts`, `prompts/hook/v2.md`.

---

## 7. Execution Plane — Rendering

### 7.1 Dispatch — Two Fast Paths (Senior Invariant)

```
POST /api/generate-video (Control Plane)
  ├─ reserveGenerationSlot (atomic, 5 lifetime / 8 pro/mo)
  ├─ saveJobManifest (Firestore) + SQLiteRenderQueue.enqueue (priority 0, maxAttempts 3, request_hash dedup)
  ├─ executionToken = crypto.randomBytes(32).hex()  (never jobId)
  │
  ├─ if tier==BASIC && BASIC_RENDER_API_URL  ──→  POST {BASIC_RENDER_API_URL}/api/render/jobs
  │       {jobId, executionToken, tier:BASIC, topic, renderProfile, contentType, quizData, script, scenes}
  │       Bearer BASIC_RENDER_API_SECRET · timingSafeEqual on claim · jobId regex at boundary + worker re-check
  │       (warm Basic FastAPI pool — sub-60s, no cron wait)            ──► basic_render_worker
  │
  └─ else if tier==BASIC && GITHUB_PAT  ──→  POST https://api.github.com/repos/{GITHUB_REPO}/dispatches
          event_type=factoryos_render_job {jobId, workerPool:github-actions, executionToken}
          Bearer GITHUB_PAT                                              ──► factoryos-basic-render.yml
                checkout@SHA → setup-python@SHA → setup-ffmpeg@SHA (6.1.1 cached)
                → pip cache → scripts/create_short.py (timeout 360s) → ffprobe → callback

Fallback: factoryos-render-worker.yml cron "* * * * *" claims via POST /api/rendering/claim
          (tier-isolated: azure ↔ ADMIN only, github-actions/basic-fastapi ↔ BASIC only, stale lease 15 min, limit 25)
ADMIN/OWNER tier → SQLiteRenderQueue → QueueProcessor (local Node pool) or Azure VM via RenderQueueManager (see 7.3).
```

- GH workflow `factoryos-basic-render.yml` validates `INPUT_JOB_ID ^[a-zA-Z0-9_-]{8,64}$`, fail-closed on missing `INPUT_EXEC_TOKEN`, `permissions: contents: read`, SHA-pinned actions.
- Worker callbacks `POST /api/rendering/callback` use `timingSafeEqual` against `RENDER_WORKER_SECRET` or per-job `executionToken`, idempotent on `completed` (second `saveJobManifest` carries `{executionToken}`), verifies artifact (`size>1000`, valid MP4 header) before `finalizeGenerationSlot`.

### 7.2 Rendering Engine — `services/rendering-engine/`

| Entry | Port | Handler | Notes |
|---|---|---|---|
| `main.py` | :8080 | `POST /render-video`, `GET /job-status/{id}`, `GET /logs/stream` (SSE deque 500), `GET /health` | `ThreadPoolExecutor(max_workers=MAX_CONCURRENT_JOBS=1)`, `HTTPBearer`, spawns `scripts/create_short.py` subprocess with temp payload JSON, writes `output/{jobId}/final.mp4 + thumbnail.png + subtitles.srt + result.json`, updates `output/jobs/{jobId}.json` to `completed/failed`, re-queues `queued/processing` on startup |
| `basic_render_api.py` | :8100 | `POST /api/render/jobs`, `GET /api/render/jobs/{id}`, `GET /health`, `GET /ready` | Warm pool, `timingSafeEqual` + `executionToken` + isolated workspaces, `ffprobe` validation |
| `basic_render_worker.py` | — | async queue worker | Isolated workspaces, `ffprobe`, Cloudinary upload, `POST /api/rendering/callback` with retry |
| `scripts/create_short.py` | — | Pillow 1080×1920 · 30fps · `edge-tts` · `faster-whisper` · FFmpeg `libx264` ultrafast | Core muxing pipeline, `drawtext` topic sanitized (whitelist + escape `\` `'` `:`), `jobId` realpath guard |
| `worker_daemon.py`, `auto_scheduler.py` | — | Daemon + APScheduler | `APScheduler 3.10` |
| `start_worker.py` | — | Alt entry | Loads `apps/web/.env` (`CONTROL_PLANE_URL`) |

**Hardening:** `jobId` validated `^[a-zA-Z0-9_-]{8,64}$` at API boundary and re-validated in worker before any `Path` use; `resolve()` + `startswith(allowed_root+os.sep)` traversal guard; `topic` sanitized for FFmpeg `drawtext`; `output/jobs` manifests are JSON per jobId.

### 7.3 Azure Control Plane (Optional)

`lib/rendering/{RenderQueueManager, AzureWorkerManager, AzureFinOpsGuard, WorkerPoolRegistry, BasicRenderingCapacityGuard, GitHubActionsRenderManager}.ts` + `azure/main.bicep` + `services/rendering-engine/{setup_control_plane.sh, setup_basic_render_api.sh, setup_vm.sh}`.

- `RenderQueueManager` — universal orchestrator `{ id, jobId, factoryVersion, contentEngine, tenantId, userId, tier FREE|PRO|ENTERPRISE|ADMIN, aiExecutionMode, topic, aspectRatio, status (14 states), attempts/maxAttempts=3, timeline/assets/audio/subtitles, output {format,width:1080,height:1920,fps:30}, delivery {GOOGLE_DRIVE|CLOUDINARY|LOCAL_OUTBOX} }`.
- `AzureWorkerManager` — `requestStartVm()`, `enterDrainingState()`, `evaluateGracePeriod()` (10-min), `deallocateVm()` (mock 50ms boot in current code, `Standard_B4ls_v2` 4vCPU/8GB target).
- `WorkerPoolManager` tier rule: `ADMIN→Azure`, `BASIC→GitHub Actions/Basic FastAPI`, `Basic→Azure` forbidden.

---

## 8. Pipeline Floors — `services/pipeline/`

Domain slices — video assembly line, each `app/` hexagonal. Not all in the hot `POST /api/generate-video` path today (Control Plane calls `script-agent` directly), but represent the **industrial DAG** and are wired via `factoryos/core/bridge/PythonFloorBridge.ts`.

| Floor | Path | Pipeline Responsibility | Runtime |
|---|---|---|---|
| **Floor 01 Strategy** | `services/pipeline/floor01_strategy/` | Topic clustering, viral archetype matching, hook scoring | Python `app/` |
| **Floor 02 Scripting** | `floor02_scripting/` (`narrative_architect/scene_planner/pacing_validator`) | Multi-beat script drafting, timed quiz Q&A structuring | Python |
| **Floor 03 Asset Realization** | `floor03_asset_realization/` | Prompt-to-visual mapping, scene asset curation | Python + FLUX |
| **Floor 04 Media Synthesis** | `floor04_media_synthesis/` | Voice synthesis, speech timing | `edge-tts` / Supertonic |
| **Floor 05 Timeline Composition** | `floor05_timeline_composition/` | Word-level subtitle alignment & visual layout | `faster-whisper` + SRT aligner |
| **Floor 06 Rendering** | `floor06_rendering/` | High-throughput video assembly & muxing | MoviePy + FFmpeg |
| **Guardian** | `services/pipeline/guardian/` | Watchdog, self-healing telemetry, Decision Ledger, CircuitBreaker | EventBus + state store |

Each floor has `README.md`, `app/`, `tests/`, `main.py`. Knowledge base at `docs/akb/`.

---

## 9. FactoryOS Kernel & Content Engines

### 9.1 FactoryOS — `apps/web/factoryos/`

Frontier v3 kernel (431 files, `vitest` scoped). Contracts in `factoryos/core/contracts/SkillContracts.ts` — `SkillManifest {id, version, lifecycleState DRAFT→QUARANTINED, targetCapabilities, executionSequence, decisionRules, safetyBoundaries}`, `SkillExecutionPackage`.

- **Core:** `cases`, `leases`, `checkpoint`, `cognitive` (`CognitivePlaneEngine`, `CapabilityRouter`, `EvidenceGraphEngine`, `SimulationDecisionEngine`), `guardian` (`QuizGuardian`, `DeterministicEvaluators`, `QuizAmbiguityDetector`, `QuizDuplicateDetector`, `QuizEvidenceVerifier`, `QuizOutputValidator`, `GuardianKernel`), `overseer`, `worldstate`, `observability`, `telemetry`, `routing`, `runtime`, `validator`, `verification`, `repair`, `recovery`, `governor`.
- **DB:** `factoryos/core/database/MongoDBClient.ts` — `cases/leases/memories/task_dags/decisions/world_state`, InMemory fallback.
- **Adapters:** `VideoPipelineAdapter`, `QuizGeneratorAdapter`, `DriveDeliveryAdapter`.
- **Tests:** `factoryos/tests/**/*.test.ts` + `shortforge/tests/**/*.test.ts` (Vitest node, 60s, fileParallelism), `benchmarks/quiz_semantic_eval_dataset.json`, `reports/`.

### 9.2 Content Engines — `apps/web/content-engines/`

Declarative workflow loader. Each engine registers via `WorkflowLoader.register()` with `critic.json`.

| Engine | Purpose | Steps |
|---|---|---|
| `quiz` | Quiz Shorts (FAST_QUIZ) | `script→critic→scene→voice→image→render→upload→publish` |
| `facts`, `story`, `history`, `news`, `coding`, `motivation`, `reddit`, `guess-flag`, `guess-logo`, `psychology` | Parallel engines, same pattern | Via `_runtime/workflow-runtime.ts` |

- `_runtime/workflow-runtime.ts` — `WorkflowRuntime.run(job)` (DAGRunner, approval gate, demo mode `data/demo/{category}/demo.mp4`, Firestore + CheckpointDB + EventBus), `resumeApproval()`, `replay()`.
- `_runtime/step-registry.ts` + `step-registry-init.ts` — `step.id → executor`.
- `_loader/index.ts` — registry.

---

## 10. Skill System

### 10.1 FactoryOS Domain Skills — `apps/web/factoryos/skills/` (9, canonical)

Each: `SKILL.md` (WHEN TO USE, inputs, executionSequence, decisionRules, safetyBoundaries), `manifest.json` (`lifecycleState`), `inputs.schema.json`/`outputs.schema.json`/`policy.json`, `version:1.0.0`, `owner: Overseer/*`.

| Skill | Owner | Capability |
|---|---|---|
| `script-generation` | Overseer / Production | topic→retention script (3s hook / 70% climax / CTA, `<18 words/scene`, pacing `FAST/BALANCED/DOCUMENTARY`) |
| `trend-analysis` | Overseer / Platform | Web + `trend_store` search, freshness ≤7d, `novelty≥0.60`, 14-day dedup, `Velocity40%+Novelty30%+Retention30%` |
| `worker-routing` | Overseer / Compute | tier→pool `ADMIN→Azure` / `BASIC→GH Actions`, health + failover within role bounds |
| `render-orchestration` | Overseer / Compute | timeline→MP4 via `dispatch_render_job`/`poll_render_status`/`verify_mp4_integrity` (FFprobe) |
| `video-quality` | Guardian / QA | Post-render ffprobe gate: `1080×1920 9:16`, H.264/AAC, bitrate>0, audio sync; `FAIL if <50KB` |
| `quota-management` | Overseer / FinOps | Atomic `RESERVE/FINALIZE/RELEASE` (see §4.5), `ADMIN/OWNER` unlimited |
| `publishing` | Overseer / Distribution | YouTube/TikTok/Instagram, `visibility=PUBLIC` requires `ApprovalRequest` + human gate |
| `drive-delivery` | Overseer / Storage | Atomic idempotent Drive upload (`upload_to_drive`/`verify_drive_file`), `idempotencyKey` dedup |
| `failure-recovery` | Overseer / SRE | Classify `TRANSIENT/AUTH/RESOURCE/WORKER/MODEL/ASSET/VALIDATION/DELIVERY/POLICY/UNKNOWN`, `maxRetries=3`, resume from checkpoint |

Lifecycle: `DRAFT→VALIDATING→EXPERIMENTAL→PROMOTED→DEPRECATED→QUARANTINED` via `factoryos/core/evaluation/{SkillEvaluatorRunner, SkillPromotionEngine}` (reliability bench).

### 10.2 ShortForge-Native Skill Engine — `apps/web/lib/shortforge-skills/` (docs-only, 5)

> **Status: docs-only.** No production code wired. External `shortforge-skills/` repo was not found on disk (verified `ls` + recursive `find` + grep)—these are **native methodology docs**. Live pipeline (`apps/web → services/rendering-engine → Cloudinary/Firestore`) is untouched. Future runtime must be model-agnostic (`IntelligentRouter`/`AIRuntime`), cost-safe (bounded calls inside 5-generation quota), and generate inputs for existing renderer — never rewrite `Azure/basic-fastapi/create_short.py/FFmpeg/Cloudinary`.

| Skill | Method | Contract |
|---|---|---|
| `viral-hooks` | 9 hook types: curiosity, contrarian, authority/proof, emotional, question, story opening, myth-busting, specificity/data, confession → `candidates[3..5]` scored `curiosity/retention/specificity/clarity 0–10` | Input `topic,contentType,platform,targetDuration,tone,scriptContext` |
| `ai-video-storyboard` | `script → scene intent → visual continuity → shot composition → camera → lighting → subject → action → production prompt` | `storyboard: {id,text,imagePrompt,intent,composition,camera,lighting,subject,action,continuityTag,timing,resolution}` — 9:16 safe |
| `video-analysis` | Optional reverse-engineering: hook, scene-change, transcript, retention beats, pacing, caption, visual profile → `generationPlan` | Optional — never on BASIC mandatory path; no yt-dlp/ffmpeg auto-wired without allowlist |
| `youtube-content` | title/description/CTA/caption strategy/hashtags | `title ≤60 chars`, `hashtags 5–10`, no unverified platform claims |
| `shorts-production` | 9:16 Shorts/Reels packaging: hook style, pacing, caption/hashtags, duration→scene-count solver (`ceil(d/5)`, 4–8s/scene) | Renderer-compatible `scenes[]`/manifest inputs only |

See `apps/web/lib/shortforge-skills/README.md` + each `SKILL.md` for full methodology, pipeline stage, and constraints (no `.claude/skills`, no Claude dependency, no new paid infra without approval).

### 10.3 Animation Skills (Unrelated)

`agent/skills/` + `.agents/skills/` + `.claude/skills` symlinks (9, via `skills-lock.json` → `emilkowalski/skills`): `animate`, `animation-vocabulary`, `apple-design`, etc. — design motion only, not video pipeline.

---

## 11. Security Model

Senior posture: **fail-closed, defense-in-depth, least privilege**. Background security review findings acknowledged (see below).

| Boundary | Mechanism | Invariant |
|---|---|---|
| **Client → Control Plane** | Clerk + Firebase `__session` HMAC-SHA256 (`INTERNAL_API_SECRET_KEY`), `middleware.ts` fail-closed `401` for `/api/*`, `verifySession`/`verifyWritePermission`, role hierarchy | No anonymous mutation; `VIEWER` cannot write; `__session` HTTP-only |
| **Control Plane ↔ Workers** | `HTTPBearer` (`INTERNAL_API_SECRET_KEY` / `BASIC_RENDER_API_SECRET` / `RENDER_WORKER_SECRET` / `CRON_SECRET`), per-job `executionToken` (32-byte hex, `timingSafeEqual` on `claim`/`callback`), `jobId` regex + worker re-validate + `realpath` prefix check | Token never equals `jobId`; worker re-validates before any `Path` use; cron `CRON_SECRET||INTERNAL_API_SECRET_KEY` fail-closed if unset, no `x-vercel-cron`-only bypass, no `Host`-derived SSRF (canonical `APP_ORIGIN||CONTROL_PLANE_URL`) |
| **Filesystem** | `jobId ^[a-zA-Z0-9_-]{8,64}$` at API boundary + worker `resolve().startswith(root+os.sep)` traversal guard; `topic` whitelist + escape for `drawtext` | No traversal, no injection into FFmpeg filtergraph |
| **GitHub Actions** | `env: INPUT_*` indirection (no direct `${{ }}` interpolation), SHA-pinned actions (`checkout`, `setup-python`, `setup-ffmpeg`, `cache`), `permissions: contents: read`, `INPUT_EXEC_TOKEN` fail-closed | No workflow injection; reproducible builds |
| **OAuth / Drive** | State `HMAC(nonce)` + `timingSafeEqual` + cookie 600s binding; `driveFileId && driveUrl && deliveryTarget==GOOGLE_DRIVE` before "Open in Drive" | No CSRF, no open redirect |
| **Supply Chain** | `package-lock.json` pinned, `npm ci` in CI, `better-sqlite3` WAL, `sharp` isolated | Deterministic installs |

**Review findings & disposition:**

1. `apps/web/.open-next/server-functions/default/prompts/registry.ts` Path Traversal [MEDIUM] — build artifact (`*.open-next` is generated, gitignored). Fix belongs in source `apps/web/prompts/registry.ts` (allowlist `^[a-z0-9_-]+$` + `path.resolve` + `realpathSync` prefix check vs `baseDir`). **Deferred — artifact, rebuild will overwrite.**
2. `.../publishing/providers/youtube.ts` SSRF [MEDIUM] (`fetch(payload.videoUrl)`) — build artifact mirroring `apps/web/publishing/providers/youtube.ts`. Fix in source: allowlist `drive.google.com`, `*.cloudinary.com`, block `127/10/172.16/192.168/169.254/::1/fc00/fe80`, `dns.lookup` validate, `redirect:'manual'` re-validate hops. **Deferred — artifact; acknowledged not internal-only safe.**
3. `apps/web/app/api/generations/route.ts` + `apps/web/app/api/account/generation-quota/route.ts` Missing Auth / anon fallback [MEDIUM] — `uid:"anonymous"` on failed `verifySession`. Suggested fix: fail-closed `401` (remove anon fallback, `return 401` in catch). **Deferred — flagged as must-fix before prod; source patch is one catch-block change, no schema impact.**

---

## 12. Observability & Operations

- **EventBus & SRE:** `factoryos/core/observability/event-center.ts`, `lib/observability/event-center.ts`, `app/api/factory-state/sse`, `app/api/logs/events`, `app/api/sre/*`, `factoryos/core/telemetry`, `lib/queue-db.ts MetricsDB`, `lib/core/AIDoctor.ts` (failure diagnosis daemon), `lib/core/CheckpointDB.ts` (workflow resume/replay), `services/pipeline/guardian/` (Decision Ledger, CircuitBreaker).
- **SSE:** `GET /logs/stream` (worker `deque(500)`), `GET /api/factory-state/sse`, `GET /api/overseer/presence/events`.
- **Overseer:** `factoryos/core/overseer` + `lib/overseer` + `app/(os)/overseer` — eye system, presence, automations, chat/command/confirm.
- **Metrics:** `recharts` analytics, `docs/factoryos/*` progress reports, `factoryos/reports/`, Cloudflare Worker's `wrangler` logs.

---

## 13. API Surface — 109 Routes

`apps/web/app/api/` — all under `middleware.ts` gate + `verifySession` defense-in-depth. Groups:

| Group | Routes (representative) | Auth |
|---|---|---|
| **Auth** | `auth/login`, `auth/session`, `auth/signup`, `auth/forgot-password`, `auth/reset-password`, `auth/verify-reset-code` | `verifySession` / public login |
| **Generate** | `generate-video` (entry — Zod + quota + scriptAgent + autoRefine + EngineRegistry snapshot), `generate-script`, `enhance-script`, `regenerate-scene` | `verifyWritePermission` |
| **Jobs** | `job-status/[id]`, `jobs/[id]`, `jobs/list`, `jobs/approve`, `jobs/[id]/replay`, `jobs/[id]/timeline`, `job-history`, `job-history/[jobId]` | owner check (`job.userId===uid || isAdmin`) |
| **Rendering** | `rendering/claim`, `rendering/callback`, `rendering/workers`, `rendering/github/dispatch`, `rendering/github/status`, `render-workers/[workerId]`, `render-workers/pair`, `render-workers/heartbeat` | `Bearer` + `executionToken` |
| **Library/Drive** | `library`, `library/[videoId]`, `drive/connect|callback|connection|folders|list|upload|delete|cleanup|status`, `media/video/[jobId]`, `media/thumb/[jobId]`, `download/[id]`, `delivery` | `verifySession` + IDOR guard |
| **Quiz** | `quiz/draft|generate|compile|verify-question`, `quiz/geo|mock|render-batch` | `verifySession` |
| **Engines** | `engines`, `engines/[id]`, `engines/available` | `verifySession` |
| **Overseer** | `overseer/chat|command|confirm|automations|presence/*` | `verifySession` |
| **Admin** | `admin/users`, `admin/users/[userId]`, `admin/ai-providers/health`, `admin/audit`, `admin/blueprint`, `admin/factory-state`, `admin/telemetry`, `admin/ai-decision`, `admin/adobe-creative` | `verifyRole(ADMIN)` |
| **Cron/Scheduler** | `cron/cleanup`, `cron/scheduler`, `scheduler` | `CRON_SECRET` |
| **Observability** | `factory-state`, `factory-state/sse`, `analytics`, `analytics/summary`, `dashboard/performance/live|history`, `logs/events`, `logs/proxy`, `observability/events`, `sre/*`, `storage/*`, `workers/metrics` | mixed |
| **Public** | `published-video`, `health`, `selftest` | public / `__session` optional |
| **User** | `user/quota`, `user/credentials`, `account/generation-quota`, `generations` | `verifySession` (anon fallback flagged §11) |
| **Providers** | `providers`, `providers/local/discover|test`, `settings/api`, `settings/api/test`, `models`, `provider-reliability`, `render-engine-health`, `voice/registry`, `templates`, `content-health`, `cloudinary-upload` | `verifySession` |

---

## 14. Environment & Configuration

Each service has its own `.env` (gitignored; see `*.example`):

| Service | Key Variables |
|---|---|
| `apps/web/.env` | `GEMINI_API_KEY` · `GROQ_API_KEY` · `OPENROUTER_API_KEY` · `TOGETHER_API_KEY` · `DEFAULT_LLM_PROVIDER` · `NEXT_PUBLIC_RENDER_ENGINE_URL` · `ENABLE_LOCAL_RENDER` · `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` · `CLERK_SECRET_KEY` · `FIREBASE_*` · `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `BASIC_RENDER_API_URL` · `BASIC_RENDER_API_SECRET` · `MONGODB_URI` (→ `factoryos` db, optional InMemory) · `BASIC_RENDER_PORT` · `BASIC_PERSISTENT_CACHE_DIR` · `BASIC_EPHEMERAL_WORKSPACE_ROOT` · `GITHUB_PAT`/`GH_TOKEN` · `GITHUB_REPO` · `BASIC_GENERATION_LIMIT` · `APP_ORIGIN`/`CONTROL_PLANE_URL` · `CRON_SECRET` · `AI_EXECUTION_TIMEOUT_MS` |
| `services/rendering-engine/.env` | `CLOUDINARY_*` · `INTERNAL_API_SECRET_KEY` · `BASIC_RENDER_API_SECRET` · `MAX_CONCURRENT_JOBS` · `CONTROL_PLANE_URL` · `BASIC_RENDER_PORT` · `BASIC_PERSISTENT_CACHE_DIR` · `BASIC_EPHEMERAL_WORKSPACE_ROOT` · `RENDER_WORKER_SECRET` |
| `archive/floor07_compliance_2026-08-23/.env` *(archived)* | `DATABASE_URL` (asyncpg) · `REDIS_URL` · `SIGNING_SECRET_KEY` (hex 32 `python -c "import secrets;print(secrets.token_hex(32))"`) · `POLICY_DATA_DIR` · `LOG_LEVEL` · `RISK_*_THRESHOLD` · `API_HOST`/`API_PORT` |

Host requirement: **system `ffmpeg` on PATH** for both `apps/web` local fallback and `services/rendering-engine`. `imageio-ffmpeg` 0.4.8 bundles libx264 for worker.

---

## 15. Build, CI/CD & Deployment

### 15.1 Scripts — `apps/web/package.json`

```json
{
  "dev": "next dev",                          // Turbopack, :3000
  "build": "next build",                      // 109 routes
  "preview": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
  "audit": "node scripts/check-cloudflare-free.mjs",
  "deploy": "next build && opennextjs-cloudflare build && node scripts/check-cloudflare-free.mjs && wrangler deploy",
  "factoryos:test": "vitest run --config vitest.config.ts",
  "factoryos:typecheck": "tsc --project tsconfig.factoryos.json --noEmit",
  "factoryos:eval:rag": "vitest run factoryos/tests/rag-eval.test.ts",
  "factoryos:eval:quiz": "vitest run factoryos/tests/quiz-eval.test.ts",
  "factoryos:demo": "npx vite-node factoryos/demo.ts"
}
```

### 15.2 GitHub Actions

| Workflow | Trigger | What It Does |
|---|---|---|
| `ci.yml` | `push` to `main/master`, PR | `checkout@v4` → `setup-node@v4` (node 20, `apps/web/package-lock.json` cache) → `npm ci` → `tsc --noEmit` → `npm run build` |
| `factoryos-render-worker.yml` | `cron "* * * * *"` + `repository_dispatch` | Dispatcher — claims via `POST /api/rendering/claim` (tier-isolated, stale 15 min), dispatches per job |
| `factoryos-basic-render.yml` | Per-job | `checkout@SHA` → `setup-python@SHA` → `setup-ffmpeg@SHA` (6.1.1 cached) → `pip cache` → `create_short.py` (360s timeout) → `ffprobe` → `POST /api/rendering/callback` |

All actions SHA-pinned, `permissions: contents: read`, fail-closed on missing token.

### 15.3 Deployment Targets

| Service | Target | Config |
|---|---|---|
| **Control Plane** | Vercel / Firebase Hosting (`firebase.json` → `firebase-hosting/`) + Cloudflare Workers via OpenNext (`wrangler.toml`, `open-next.config.ts`) | `NEXT_PUBLIC_*` baked at build time; `outputFileTracingExcludes` keeps Worker free-tier |
| **Rendering Workers** | Docker Compose on VPS / Azure VM (`azure/main.bicep`) | `BASIC_RENDER_API_URL` points Control Plane → warm pool `:8100`; `main.py :8080` fallback |
| **Dispatcher** | GitHub Actions | No infra to provision |

### 15.4 Git & Branching

- **Main:** `main` · **Current:** `chore/rename-shortforge` (FactoryOS→ShortForge rebrand, infra preserved) · **Remotes:** `origin https://github.com/Gokul7904231/AI-Shorts-Maker`, `shortforge https://github.com/Gokul7904231/ShortForge.git`, `target https://github.com/Gokul7904231/AI-Operating-Content-generator.git`
- **Commitlint:** `commitlint.config.js` — `type-enum [refactor,feature,bug]` only, lower-case, `header-max-length 100`, `husky commit-msg: npx commitlint --edit`. All commits must be `refactor:` | `feature:` | `bug:` (enforced at `git commit` time).
- **.gitignore** — `node_modules`, `venv`, `.next/.open-next/out/build/scratch/*.db`, `*.env`, `firebase-adminsdk`, `job_*/output/temp/*.mp4|mp3|jpg|png` (with `!public/*.png|jpg` + `!demo-short.mp4` allowlist).

---

## 16. Local Development

### Control Plane

```bash
cd apps/web
npm install
npm run dev          # http://localhost:3000 (Turbopack)
npm run build        # next build
npm start            # next start
npm run lint         # eslint (next/core-web-vitals)
npm run factoryos:test              # vitest (all FactoryOS tests, 60s timeout)
npm run factoryos:typecheck         # tsc --project tsconfig.factoryos.json --noEmit (strict)
npx vitest run factoryos/tests/<name>.test.ts --config vitest.config.ts  # single file
npx vite-node factoryos/demo.ts
```

### Rendering Engine

```bash
cd services/rendering-engine
python -m venv venv; source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8080           # :8080 fallback pool
python -m uvicorn basic_render_api:app --port 8100        # warm Basic pool
python start_worker.py                                      # alt entry (loads apps/web/.env)

curl http://localhost:8080/health
curl http://localhost:8100/ready
curl http://localhost:8080/job-status/<jobId>
curl http://localhost:8080/logs/stream   # SSE
```

### Archived Gate (Optional)

```bash
cd archive/floor07_compliance_2026-08-23
cp .env.example .env   # fill DATABASE_URL, REDIS_URL, SIGNING_SECRET_KEY
docker compose up --build -d   # api + postgres:16 + redis:7 + migrate
docker compose logs -f api
make test && make lint && make format && make typecheck
```

---

## 17. Testing & Quality Gates

| Scope | Command | What It Checks |
|---|---|---|
| **FactoryOS** | `npm run factoryos:test` (`vitest run --config vitest.config.ts`, node, `factoryos/tests/**` + `tests/**` + `shortforge/tests/**`, 60s, fileParallelism, verbose) | 720+ tests — api-config, auth, overseer, production-system, creator-flow, etc |
| **Type** | `npm run factoryos:typecheck` (`tsc --project tsconfig.factoryos.json --noEmit`, `strict:true`) | Only FactoryOS is strict; app `tsconfig.json` is relaxed (roadmap: strict everywhere) |
| **Build** | `npm run build` (Next.js Turbopack, 109 routes) | Route collection, bundling, tracing |
| **RAG/Quiz eval** | `npm run factoryos:eval:rag`, `npm run factoryos:eval:quiz` | Retrieval + quiz semantic eval (`benchmarks/quiz_semantic_eval_dataset.json`) |
| **Lint** | `npm run lint` (`eslint`, `eslint-config-next/core-web-vitals`) | |
| **Rendering engine** | `python -m py_compile basic_render_worker.py basic_render_api.py` + `output/jobs/*.json` schema validation + `ffprobe` integrity | Exit codes, container & multi-track validation |
| **CI** | `ci.yml` → `tsc --noEmit` + `next build` | Fails PR on type/build error |

No formal harness in `services/rendering-engine`; manifests persist to `output/jobs/<jobId>.json` for deterministic replay.

---

## 18. Archived Components

`archive/floor07_compliance_2026-08-23/` — **FastAPI Compliance Gate, Hexagonal/Clean Architecture, NOT in live path.** Provenance in `archive/floor07_compliance_2026-08-23/README.md`; `grep -r floor07_compliance apps/web/app` → 0 hits (Control Plane never called `POST /v1/validate`).

```
POST /v1/validate → app/api/v1/validation.py → ValidationPipeline (app/pipelines/validation_pipeline.py)
                                               ├─ FactWorker       (app/workers/fact_worker.py) — hallucination/confidence
                                               ├─ PolicyWorker     (app/workers/policy_worker.py) — platform rules from data/policies/
                                               ├─ RiskWorker       (app/workers/risk_worker.py) — LOW/MEDIUM/HIGH/CRITICAL
                                               └─ CertificateWorker(app/workers/certificate_worker.py) — HMAC-SHA256 via app/security/signing.py → Postgres
Layers: app/domain (entities: certificate/validation_run/audit_log, value_objects: risk_rating/decision/platform)
     → app/application (use_cases/commands/dto) → app/infrastructure (SQLAlchemy async + asyncpg, Redis asyncio, repos) → app/api
Cross-cutting: app/core/config/settings.py (pydantic-settings), app/core/exceptions.py, app/logging/setup.py (structlog json), app/security/auth.py, middleware request_id+error_handler. Metrics prometheus-client, serialization orjson.
```

**Branch rule:** do not re-wire without a dedicated branch. Restore locally: `cp -r archive/floor07_compliance_2026-08-23 floors/floor07_compliance && cp .env.example .env` → set `DATABASE_URL/REDIS_URL/SIGNING_SECRET_KEY` → `docker compose up --build -d`.

---

## 19. Knowledge Base & ADRs

| Location | Content |
|---|---|
| `docs/akb/` | AKB-000 Architecture Documentation Standard, EA-001 Vision & Mission (5 packages), RA-007 Content Integrity / Compliance Floor (5 packages), `README.md` |
| `docs/architecture/` | `AUTHENTICATION.md`, `BASIC_CLOUD_RENDERING.md`, `BYOLM.md`, `README.md` |
| `docs/deployment/` | `AUTH_MIGRATION.md`, `LOCAL_AI_SETUP.md`, `README.md` |
| `docs/factoryos/` | `frontier-v2-*`, `overseer-command-surface-v2`, `overseer-productization*`, `STRIX_SECURITY_WORKFLOW.md` |
| `apps/web/factoryos/` | `AUTONOMOUS-WORKLOG.md`, `BACKLOG.md`, `STATUS.md`, `STEP1-*`, `README.md` |
| `services/pipeline/*/README.md` | Per-floor domain contracts |
| `CLAUDE.md` | Contributor entrypoint — commands, service map, env |

---

## 20. Roadmap

- [ ] Postgres-backed job queue with retries + DLQ (replace `output/jobs/*.json` + `ThreadPoolExecutor` 1 worker)
- [ ] External fact grounding (vector RAG → Chroma `rag/chroma/retrieval.ts` is stubbed today, Jaccard 0.35/0.95 in `rag/topic-memory.ts`)
- [ ] Split `services/rendering-engine/scripts/create_short.py` into `tts.py` / `renderer.py` / `uploader.py` + integration tests
- [ ] Presigned Cloudinary uploads + per-tenant rate limits
- [ ] `strict: true` across `apps/web/tsconfig.json` (today only `tsconfig.factoryos.json`)
- [ ] ShortForge Skill Engine — promote docs-only skills (`viral-hooks`, `ai-video-storyboard`, `video-analysis`, `youtube-content`, `shorts-production`) to bounded, model-agnostic runtime via `AIRuntime` (no `.claude/skills`, no Claude dependency, no new paid infra without approval)
- [ ] Fix deferred auth hardening (`/api/generations` + `/api/account/generation-quota` anon fallback → `401` fail-closed)
- [ ] Harden `apps/web/prompts/registry.ts` (allowlist + `realpathSync` prefix) + `publishing/providers/youtube.ts` (SSRF allowlist + DNS validate) in source, then rebuild OpenNext

---

<p align="center"><strong>ShortForge</strong> — engineered as a high-throughput, enterprise-grade AI automated media production system. Control Plane orchestrates; Execution Plane renders; Data Layer persists; Skill System extends — all over HTTPS + HMAC, tier-isolated, quota-enforced, token-verified.</p>
