<h1 align="center">
  <img
    src="https://i.ibb.co/1GbWrvhX/Gemini-Generated-Image-pt8vmdpt8vmdpt8v.png"
    alt="ShortForge"
    height="42"
  />
  <br />
  ShortForge
</h1>

<p align="center">
  <strong>Autonomous AI Video Factory</strong>
</p>

<p align="center">
  From a single idea to a finished, validated Short through AI orchestration, distributed workers, rendering, and artifact delivery.
</p>

<p align="center">
  <a href="https://shortforge.gokul.software/">🌐 Live Product</a>
  ·
  <a href="https://github.com/Gokul7904231/ShortForge">💻 Source</a>
  ·
  <a href="https://github.com/Gokul7904231/ShortForge/actions">⚙️ CI</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/FFmpeg-Video%20Pipeline-007808?style=flat-square&logo=ffmpeg" />
  <img src="https://img.shields.io/badge/Firestore-Data-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/Docker-Infra-2496ED?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-Workers-2088FF?style=flat-square&logo=githubactions" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

---

## What is ShortForge?

ShortForge is an **AI video-production system designed as a software factory**.

The user provides an idea. The system coordinates the production lifecycle:

```text
Idea
  ↓
Plan
  ↓
Generate
  ├── Script
  ├── Voice
  ├── Visuals
  ├── Subtitles
  └── Thumbnail
  ↓
Queue
  ↓
Render
  ↓
Validate
  ↓
Store
  ↓
Deliver
```

The engineering problem is not simply "calling an LLM."

ShortForge combines:

* AI generation
* hierarchical agent orchestration
* persistent job state
* distributed workers
* rendering infrastructure
* failure recovery
* security boundaries
* artifact management
* multi-provider compute

The system is designed around the idea that **production work should be orchestrated, observable, recoverable, and independently executable**.

---

# 🌐 Live Product

### **https://shortforge.gokul.software/**

The live application exposes the user-facing control plane for creating and managing video-production jobs.

---

# 🧠 The Architecture

ShortForge separates **decision-making**, **execution**, and **recovery**.

```text
                              ┌──────────────────────┐
                              │       OVERSEER       │
                              │ Global orchestration │
                              └──────────┬───────────┘
                                         │
                              Factory state / decisions
                                         │
              ┌──────────────────────────┼──────────────────────────┐
              │                          │                          │
              ▼                          ▼                          ▼
      ┌───────────────┐          ┌───────────────┐          ┌───────────────┐
      │    GUARDIAN   │          │    GUARDIAN   │          │    GUARDIAN   │
      │     Floor A   │          │     Floor B   │          │     Floor C   │
      └───────┬───────┘          └───────┬───────┘          └───────┬───────┘
              │                          │                          │
              ▼                          ▼                          ▼
           SLAYERS                    SLAYERS                    SLAYERS
              │                          │                          │
              └──────────────────┬───────┴───────┬──────────────────┘
                                 │               │
                              HEALERS         HEALERS
                                 │               │
                                 └───────┬───────┘
                                         │
                                   Persistent state
                                         │
                                         ▼
                                  Production output
```

## Internal terminology

These names describe architectural responsibilities:

| Role               | Responsibility                                                            |
| ------------------ | ------------------------------------------------------------------------- |
| **Overseer**       | Global orchestration, factory state, decisions, delegation and escalation |
| **Floor Guardian** | Owns a specific production domain and supervises its workers              |
| **Slayer**         | Performs a focused production operation                                   |
| **Healer**         | Handles recovery, retries, fallback and failed-state repair               |

This keeps autonomy **hierarchical and bounded** instead of relying on one monolithic agent.

---

# 🏢 Seven-Floor Factory

The production architecture is organized into seven responsibility layers.

```text
                         👁️ OVERSEER
                              │
                              ▼
                    ┌─────────────────┐
                    │    FLOOR 01     │
                    │    Foundation   │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 02     │
                    │  Orchestration  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 03     │
                    │   Intelligence  │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 04     │
                    │    Production   │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 05     │
                    │ Rendering /     │
                    │ Delivery        │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 06     │
                    │ Security /      │
                    │ Governance      │
                    └────────┬────────┘
                             ▼
                    ┌─────────────────┐
                    │    FLOOR 07     │
                    │ Verification /  │
                    │ Compliance      │
                    └────────┬────────┘
                             ▼
                           RELEASE
```

## Floor 01 — Foundation

**Responsibility:** establish the shared runtime and core contracts used by the rest of the factory.

```text
Runtime
  ↓
Core interfaces
  ↓
Shared infrastructure
  ↓
Reusable capabilities
```

**Guardian:** Foundation Guardian

**Workers:** core infrastructure Slayers

**Healers:** infrastructure recovery

The goal is to keep higher floors independent of low-level implementation details.

---

## Floor 02 — Orchestration

**Responsibility:** convert production intent into executable work.

```text
Intent
  ↓
Plan
  ↓
Task graph
  ↓
Queue
  ↓
Worker assignment
  ↓
Execution tracking
```

**Guardian:** Orchestration Guardian

This layer manages job coordination rather than performing the underlying media work itself.

---

## Floor 03 — Intelligence

**Responsibility:** provide reasoning, generation, model routing, and AI capabilities.

```text
Topic / Prompt
      ↓
AI routing
      ↓
Model / provider
      ↓
Structured output
      ↓
Production state
```

The system supports multiple AI paths and provider abstractions so that intelligence can evolve independently from the control plane.

**Guardian:** Intelligence Guardian

**Slayers:** AI/content specialists

**Healers:** provider retries, fallback models, recovery

---

## Floor 04 — Production

**Responsibility:** turn plans into production assets.

```text
Script
  +
Voice
  +
Visuals
  +
Subtitles
  +
Thumbnail
  ↓
Production package
```

Typical production stages include:

* script generation
* voice synthesis
* image generation
* subtitle generation
* thumbnail generation
* media analysis
* content-specific engines

**Guardian:** Production Guardian

**Slayers:** specialized production workers

**Healers:** regeneration, retries and partial-stage recovery

---

## Floor 05 — Rendering & Delivery

**Responsibility:** transform production assets into a validated, deliverable video artifact.

```text
Production Assets
      ↓
Render Queue
      ↓
Warm Worker
      │
      ├── available ──→ render
      │
      └── unavailable
              ↓
        External Worker
              ↓
             MP4
              ↓
          Validation
              ↓
          Artifact Store
```

The existing architecture separates the warm rendering path from GitHub Actions fallback execution.

Current rendering technology includes:

* FastAPI
* FFmpeg
* Pillow
* edge-tts
* faster-whisper

The renderer is designed to be a **worker**, not the owner of application state.

**Guardian:** Rendering Guardian

**Slayers:** render workers

**Healers:** retry, fallback and failed-render recovery

---

## Floor 06 — Security, Identity & Governance

**Responsibility:** protect the factory and control who can perform which operations.

```text
Identity
  ↓
Session
  ↓
Role
  ↓
Authorization
  ↓
Operation
```

This layer covers:

* authentication
* session security
* role-based access control
* worker authorization
* user isolation
* privileged/admin boundaries
* security hardening
* auditability

The broader Floor 6 specification explicitly centers on authentication, persistent users, USER/ADMIN roles, RBAC, password recovery, security testing and ship gates.

**Guardian:** Security Guardian

**Slayers:** policy/auth/security workers

**Healers:** security recovery and safe failure handling

---

## Floor 07 — Verification & Compliance

**Responsibility:** determine whether a production result is actually safe and complete enough to release.

```text
Output
  ↓
Validation
  ↓
Quality checks
  ↓
Security checks
  ↓
Compliance checks
  ↓
Release decision
```

The repository contains an archived `floor07_compliance_2026-08-23` implementation; the architectural role of Floor 07 remains the verification/compliance boundary rather than presenting that archived implementation as active runtime code.

**Guardian:** Verification / Compliance Guardian

**Slayers:** validation and inspection workers

**Healers:** repair, rejection and escalation

---

# 👁️ Overseer

The Overseer is the control layer that sits above the production floors.

It is designed to:

```text
OBSERVE
   ↓
UNDERSTAND
   ↓
DECIDE
   ↓
DELEGATE
   ↓
MONITOR
   ↓
RECOVER / ESCALATE
```

Instead of making one agent responsible for every capability, the Overseer coordinates specialists and maintains the factory-level view.

That design is intended to make the system easier to extend, test, recover and operate.

---

# ⚔️ Slayers

A Slayer performs one bounded operation.

Examples:

```text
Script Slayer
Voice Slayer
Visual Slayer
Subtitle Slayer
Thumbnail Slayer
Render Slayer
Validation Slayer
Delivery Slayer
```

Each worker has a clear execution boundary.

This allows the factory to replace or reroute workers without rewriting the complete pipeline.

---

# ❤️ Healers

Healers are the recovery layer.

A failed worker does not automatically mean a failed production.

```text
Worker
  ↓
Failure
  ↓
Healer
  ↓
Retry / Replace / Fallback / Repair
  ↓
Resume
```

This becomes especially important when external AI providers and remote rendering infrastructure are involved.

---

# ⚙️ Rendering Infrastructure

ShortForge treats compute as a fleet rather than a single machine.

```text
                         FACTORYOS
                             │
                       Render Queue
                             │
                       Smart Router
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
    Lightning             Kaggle              GitHub
       GPU                  GPU                 CPU
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                          Render
                             │
                             ▼
                           MP4
                             │
                       Artifact Manager
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
             Cloudinary           Google Drive
                  │                     │
                  └──────────┬──────────┘
                             ▼
                       ShortForge UI
```

The architectural rule is:

> **Compute providers execute jobs. FactoryOS owns orchestration and state.**

That allows the rendering fleet to evolve independently.

---

# 🔐 Reliability Engineering

ShortForge is designed around failure-aware execution.

## Atomic generation quotas

Generation capacity is reserved transactionally and finalized only after successful artifact verification.

```text
Reserve
  ↓
Generate
  ↓
Validate
  ↓
Finalize
```

## Execution authorization

Render operations use scoped execution credentials and server-side verification.

## Idempotent callbacks

Repeated callbacks should not produce repeated state transitions.

## Worker fallback

The warm worker can be replaced by an external worker when capacity is unavailable.

## Explicit job state

Rather than treating generation as a single request, jobs move through observable states:

```text
QUEUED
  ↓
CLAIMED
  ↓
RUNNING
  ↓
RENDERED
  ↓
VALIDATED
  ↓
STORED
  ↓
COMPLETED
```

---

# 📦 Artifact Lifecycle

The video is an artifact with a lifecycle—not simply an HTTP response.

```text
Generate
   ↓
Render
   ↓
Validate
   ↓
Persist
   ↓
Distribute
   ↓
Track
```

The system is designed so rendering infrastructure can fail or be replaced without losing the completed artifact.

---

# 🧩 Content Engines

ShortForge is designed to support specialized production missions rather than one generic prompt.

Examples include:

```text
Coding
Facts
History
Motivation
News
Psychology
Quiz
```

Each engine can define its own production characteristics while using the shared factory infrastructure.

For example:

```text
Quiz Engine
  ├── topic
  ├── difficulty
  ├── audience
  ├── voice
  ├── visual style
  └── publishing target
```

The resulting workflow still passes through the same orchestration, rendering, validation and delivery layers.

---

# 🛠️ Technology Stack

| Layer              | Technologies                                    |
| ------------------ | ----------------------------------------------- |
| Control Plane      | Next.js 16, React 19                            |
| Language           | TypeScript                                      |
| UI                 | Tailwind CSS, Framer Motion, Zustand            |
| Backend APIs       | Next.js Route Handlers, FastAPI                 |
| Rendering          | FFmpeg, Pillow                                  |
| Voice              | edge-tts                                        |
| Speech / subtitles | faster-whisper                                  |
| AI                 | Vercel AI SDK, Groq, Gemini, FLUX, Transformers |
| Data               | Firestore, MongoDB, SQLite                      |
| Media              | Cloudinary                                      |
| Worker execution   | GitHub Actions, external GPU workers            |
| Infrastructure     | Docker, Firebase, Cloudflare, Render / Vercel   |

---

# 📁 Repository Structure

```text
ShortForge/
│
├── apps/
│   └── web/
│       ├── app/
│       │   ├── api/
│       │   ├── dashboard/
│       │   └── ...
│       └── ...
│
├── services/
│   ├── pipeline/
│   │   ├── floor01/
│   │   ├── floor02/
│   │   ├── floor03/
│   │   ├── floor04/
│   │   ├── floor05/
│   │   ├── floor06/
│   │   └── guardian/
│   │
│   └── rendering-engine/
│
├── factoryos/
│   ├── core/
│   ├── database/
│   └── ...
│
├── tests/
├── docs/
├── .github/
│   └── workflows/
│
└── CLAUDE.md
```

---

# 🔬 Engineering Focus

The most interesting engineering problems in ShortForge are **systems problems**:

```text
AI
 +
orchestration
 +
distributed execution
 +
state management
 +
fault recovery
 +
security
 +
media processing
 +
artifact lifecycle
 +
multi-provider compute
```

The project therefore focuses not only on **what an AI model can generate**, but on:

> **how an autonomous system coordinates unreliable computation into a dependable production workflow.**

---

# 🚀 Example End-to-End Flow

A user requests:

```text
"Create a Short explaining how black holes work."
```

The factory processes it as:

```text
User Intent
     ↓
👁️ Overseer
     ↓
🛡️ Planning / Orchestration Guardian
     ↓
⚔️ Script Slayer
     ↓
⚔️ Voice Slayer
     ↓
⚔️ Visual Slayer
     ↓
⚔️ Subtitle Slayer
     ↓
🛡️ Rendering Guardian
     ↓
Render Queue
     ↓
Warm Worker / External Worker
     ↓
FFmpeg
     ↓
MP4 validation
     ↓
🛡️ Verification Guardian
     ↓
Artifact Manager
     ├── Cloudinary
     ├── Google Drive
     └── ShortForge Library
```

If something fails:

```text
Slayer
  ↓
Failure
  ↓
❤️ Healer
  ↓
Retry / Regenerate / Fallback
  ↓
Resume
```

---

# 📈 Current Engineering Direction

ShortForge is evolving toward:

```text
Single AI application
        ↓
Multi-agent application
        ↓
Orchestrated production system
        ↓
Autonomous software factory
```

The long-term architecture is centered on:

* autonomous orchestration
* worker specialization
* persistent operational state
* intelligent compute routing
* automatic recovery
* infrastructure telemetry
* secure multi-user isolation
* artifact-centric delivery

---

# 🧪 Verification

The project uses:

* Vitest
* TypeScript type checking
* production builds
* API/integration tests
* security checks
* rendering validation
* worker callback verification
* CI workflows

The repository also includes documented production acceptance gates covering user isolation, quotas, worker execution, rendering, artifact storage, callbacks, security, builds, and deployment configuration.

---

# ▶️ Run Locally

### Control Plane

```bash
cd apps/web

npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### Rendering Engine

```bash
cd services/rendering-engine

pip install -r requirements.txt

python -m uvicorn main:app --port 8080
```

### Warm Basic Renderer

```bash
python -m uvicorn basic_render_api:app --port 8100
```

### Tests & Build

```bash
cd apps/web

npm run factoryos:test
npm run factoryos:typecheck
npm run build
```

FFmpeg must be available to the rendering environment.

---

# 🗺️ Roadmap

```text
                    SHORTFORGE
                        │
                        ▼
                Seven-Floor Factory
                        │
          ┌─────────────┼─────────────┐
          │             │             │
          ▼             ▼             ▼
       Autonomy     Reliability    Scalability
          │             │             │
          ▼             ▼             ▼
      Overseer       Healers      Worker Fleet
          │             │             │
          └─────────────┼─────────────┘
                        ▼
              Multi-provider compute
                        │
                        ▼
              Autonomous production
```

Planned evolution includes:

* smarter render-provider selection
* unified worker adapters
* worker health and telemetry
* queue-aware scheduling
* stronger automated recovery
* expanded production engines
* deeper Overseer autonomy

---

# 🌐 Links

**Live Product:**
https://shortforge.gokul.software/

**GitHub:**
https://github.com/Gokul7904231/ShortForge

**Architecture Documentation:**
`docs/ARCHITECTURE.md`

**Pipeline:**
`services/pipeline/`

**Rendering Engine:**
`services/rendering-engine/`

---

# 👤 Author

## Gokul

Computer Science student focused on:

**AI / ML · LLMs · Agentic AI · AI Infrastructure · Distributed Systems**

ShortForge is an ongoing attempt to answer a systems-level question:

> **What does it take to make software that can coordinate its own production work?**

---

# 📜 License

MIT — see [`LICENSE`](LICENSE).
