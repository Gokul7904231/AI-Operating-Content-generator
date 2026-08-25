# ShortForge — Forge viral Shorts


> **One topic in. One viral Short out.** Topic → 45s 1080×1920 Short (script, voice, images, subtitles, FFmpeg) — fully automated.

<p align="center">
  <a href="https://github.com/Gokul7904231/AI-Operating-Content-generator/actions/workflows/ci.yml"><img src="https://github.com/Gokul7904231/AI-Operating-Content-generator/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  <img src="https://img.shields.io/badge/TypeScript-Strict%20Passed-blue?style=flat-square&logo=typescript&logoColor=white" alt="TypeCheck" />
  <img src="https://img.shields.io/badge/Vitest-720%2B%20Passed-brightgreen?style=flat-square&logo=vitest&logoColor=white" alt="Tests" />
  <img src="https://img.shields.io/badge/Next.js-16%20Control%20Plane-black?style=flat-square&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/FastAPI-Python%203.11+-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License" /></a>
</p>

> 🎬 **Live Demo:** <!-- TODO: add vercel.app + Loom + sample mp4 -->
> - **Control Plane:** `apps/web` (Next.js 16 · Turbopack · React 19)
> - **Sample Short:** `apps/web/public/demo-short.mp4` (1080×1920, 30fps, subs + thumb)
> - **Throughput:** idea → muxed Short in **< 60s** · Full docs → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

---

## ✨ What It Does

| Type | Pipeline | Output |
|---|---|---|
| Motivational | LLM script → FLUX images → edge-tts → faster-whisper → FFmpeg | 45s · 1080×1920 · voice + 3 images + SRT |
| Quiz Shorts | Q&A engine → countdown bar, SFX, BGM, flag bg, watermark | Same spec — game-show style |

Every video is **9:16, subtitled, thumbnailed** before Cloudinary + Firestore.

## 🧰 Stack

| Layer | Choices |
|---|---|
| Frontend | Next.js 16 (Turbopack, reactCompiler), React 19, Tailwind v4, Framer Motion 12, Zustand 5, Clerk 6 |
| Data | Firestore (quotas/videos) · MongoDB 7 (`factoryos` db, InMemory fallback) · SQLite (`better-sqlite3`, `data/shortfactory.db`) · Cloudinary 2.5 |
| Rendering | FastAPI + Pillow 10 + FFmpeg 6.1.1 + edge-tts + faster-whisper (port 8100 warm pool + :8080 fallback) |
| AI | Vercel AI SDK 7 + Groq llama-3.1-8b + Gemini + FLUX.1-schnell + @xenova/transformers |
| Infra | Docker · GH Actions (SHA-pinned) · Firebase Hosting · Vercel |

`strict: true` only in `apps/web/tsconfig.factoryos.json` (app-wide `tsconfig.json` is relaxed).

## 🏗️ Architecture

```
Browser → apps/web (Next.js 16, 105 API routes, Clerk+Firebase __session HMAC)
  │  POST /api/generate-video (Zod + 5-video Firestore tx + SQLiteRenderQueue)
  ├─→ warm pool  POST {BASIC_RENDER_API_URL}/api/render/jobs  (sub-60s)
  └─→ fallback   repository_dispatch → factoryos-basic-render.yml → create_short.py
         ↕  HTTPBearer + executionToken timingSafeEqual + jobId ^[a-zA-Z0-9_-]{8,64}$ + realpath guard
  services/rendering-engine (FastAPI :8100/:8080, Pillow 1080×1920, ffprobe → Cloudinary)
         ↕  POST /api/rendering/callback (idempotent) · GET /api/job-status/[id] poll + SSE
  Firestore / MongoDB / SQLite / Cloudinary · GH Actions cron "* * * * *" dispatcher
```

> `archive/floor07_compliance_2026-08-23/` (FastAPI validation gate) is **archived, not live**.

## 🔩 Hard Parts

- **Atomic quota** — `reserveGenerationSlot` Firestore transaction enforces 5-video hard limit per user; released idempotently on callback.
- **Execution token** — `crypto.randomBytes(32).hex()` per job, `timingSafeEqual` on `claim`/`callback`; worker re-validates `jobId` regex + `realpath` traversal guard + `drawtext` sanitization.
- **Warm vs GH fallback** — `BASIC_RENDER_API_URL` → direct warm pool (sub-60s); else `GITHUB_PAT` → `repository_dispatch`; else 1-min cron claim loop (tier-isolated: `azure↔ADMIN`, `github-actions↔BASIC`).

## 🚀 Run Locally

```bash
cd apps/web && npm install && npm run dev          # http://localhost:3000 (Turbopack)
# Rendering worker (needs FFmpeg on PATH)
cd services/rendering-engine && pip install -r requirements.txt && python -m uvicorn main:app --port 8080
# Tests & build
cd apps/web && npm run factoryos:test && npm run factoryos:typecheck && npm run build
```

Full pipeline, env vars, and API reference → [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Knowledge base → [`docs/akb/`](docs/akb/) · Pipeline stages → [`services/pipeline/`](services/pipeline/)

## 📄 License

MIT — see [LICENSE](LICENSE).
