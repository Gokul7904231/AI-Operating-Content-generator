<h1>
  <img src="https://i.ibb.co/1GbWrvhX/Gemini-Generated-Image-pt8vmdpt8vmdpt8v.png" alt="ShortForge Logo" width="52" />
  ShortForge
</h1>

## Autonomous AI Video Factory

**One idea in. One production-ready Short out.**

[![Live](https://img.shields.io/badge/Live-shortforge.gokul.software-black?style=flat-square)](https://shortforge.gokul.software/)
[![GitHub](https://img.shields.io/badge/GitHub-ShortForge-181717?style=flat-square&logo=github)](https://github.com/Gokul7904231/ShortForge)
[![CI](https://img.shields.io/github/actions/workflow/status/Gokul7904231/ShortForge/ci.yml?style=flat-square&label=CI)](https://github.com/Gokul7904231/ShortForge/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

### 🌐 Live Product
**https://shortforge.gokul.software/**

---

## What is ShortForge?

ShortForge is an **autonomous AI video-production system** designed around a software-factory architecture.

A user provides a topic.

ShortForge coordinates the rest:

```text
TOPIC
  │
  ▼
UNDERSTAND
  │
  ▼
PLAN
  │
  ▼
CREATE
  │
  ├── Script
  ├── Voice
  ├── Visuals
  ├── Subtitles
  └── Thumbnail
  │
  ▼
RENDER
  │
  ▼
VALIDATE
  │
  ▼
DELIVER
  │
  ├── Cloudinary
  ├── Google Drive
  └── ShortForge Library
```

The system is built to move beyond a conventional:

```text
Frontend → API → AI call → response
```

model toward:

```text
Intent
  ↓
Autonomous orchestration
  ↓
Specialized workers
  ↓
Supervision
  ↓
Recovery
  ↓
Validation
  ↓
Artifact delivery
```

---

# 🏛️ The Seven-Floor Factory

ShortForge is organized as a **seven-floor autonomous production factory**.

Each floor represents a progressively deeper layer of responsibility in the production system.

At the top is the **Overseer**.

Below it are **Floor Guardians**.

Inside the floors are specialized **Slayers**.

When execution breaks, **Healers** recover the work.

The important architectural principle is:

> **No single agent needs to own the entire factory. Responsibility is hierarchical, bounded, observable, and recoverable.**

```text
                                👁️ OVERSEER
                           Global Factory Control
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          ▼                          ▼                          ▼
  🛡️ FLOOR GUARDIANS          🛡️ FLOOR GUARDIANS         🛡️ FLOOR GUARDIANS
          │                          │                          │
          ▼                          ▼                          ▼
      ⚔️ SLAYERS                 ⚔️ SLAYERS                 ⚔️ SLAYERS
          │                          │                          │
          ▼                          ▼                          ▼
      ❤️ HEALERS                  ❤️ HEALERS                  ❤️ HEALERS
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     │
                              Factory State
                                     │
                                     ▼
                                Next Floor
```

---

# 👁️ The Overseer

The **Overseer** is the highest-level orchestration layer.

It is responsible for understanding the state of the factory rather than performing every operation itself.

Conceptually:

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

The Overseer is the control layer for:

- production state
- worker state
- queues
- failures
- resource availability
- orchestration decisions
- escalation
- factory health

This is the architectural boundary between an **AI application** and an **AI-operated production system**.

---

# 🛡️ Floor Guardians

A **Floor Guardian** owns the health and coordination of a particular floor.

Guardians are not intended to perform every task themselves.

They supervise the specialists below them.

```text
Guardian
  │
  ├── knows the floor's objective
  ├── coordinates Slayers
  ├── evaluates completion
  ├── invokes Healers
  └── escalates unresolved failures
```

This creates **bounded autonomy**:

```text
Overseer
   ↓
Guardian
   ↓
Slayer
```

rather than sending every problem to one giant agent.

---

# ⚔️ Slayers

A **Slayer** is an execution specialist.

Slayers perform concrete production operations such as:

```text
Script generation
Voice generation
Visual generation
Subtitle generation
Thumbnail generation
Media analysis
Rendering
Artifact preparation
```

A Slayer should have a narrowly defined responsibility and a clear success/failure contract.

This allows workers to be:

- independently tested
- replaced
- retried
- scaled
- routed
- monitored

---

# ❤️ Healers

A **Healer** is the recovery mechanism.

A failed task should not automatically mean a failed production.

```text
Slayer
  ↓
Failure
  ↓
Healer
  ↓
Repair / retry / fallback
  ↓
Resume
```

Healers can conceptually handle:

- transient provider failures
- worker failures
- interrupted jobs
- retries
- re-queueing
- fallback routing
- partial-state recovery
- escalation when automatic recovery is unsafe

This makes fault recovery part of the architecture instead of an afterthought.

---

# 🏢 Floor 01 — Foundation

**Purpose:** establish the foundational runtime layer on which the production factory operates.

This floor is concerned with the basic runtime, core interfaces, and system foundations required by higher floors.

```text
Floor 01
   ↓
Core runtime
   ↓
Shared contracts
   ↓
Factory infrastructure
```

**Guardian:** Foundation Guardian

**Primary role:** keep the underlying factory contracts stable and usable by higher layers.

---

# 🧭 Floor 02 — Orchestration

**Purpose:** coordinate production work across the system.

This is where the factory begins to behave as an orchestration system rather than a collection of isolated tools.

```text
Intent
  ↓
Planning
  ↓
Task creation
  ↓
Delegation
  ↓
Execution tracking
```

**Guardian:** Orchestration Guardian

**Primary role:** translate production intent into executable work.

---

# 🧠 Floor 03 — Intelligence

**Purpose:** provide the AI reasoning and generation capabilities used by the production pipeline.

This includes the AI/provider layer used to create content and make production decisions.

```text
Prompt / Topic
     ↓
AI routing
     ↓
Model/provider
     ↓
Structured result
```

The system already contains multiple AI/provider pathways and routing layers.

**Guardian:** Intelligence Guardian

**Primary role:** provide reliable AI capabilities while isolating provider-specific behavior from the rest of FactoryOS.

---

# 🎬 Floor 04 — Production

**Purpose:** transform generated plans and content into the individual media components of a Short.

Typical production outputs include:

```text
Script
Voice
Visual assets
Subtitles
Thumbnail
Media metadata
```

**Guardian:** Production Guardian

**Slayers:** specialized content/media workers

**Primary role:** turn intelligence into concrete production assets.

---

# 🎞️ Floor 05 — Rendering & Delivery

**Purpose:** convert production assets into the final validated video artifact.

The documented architecture includes a **warm Basic rendering path** and a **GitHub Actions fallback path**.

```text
Production Assets
      ↓
Render Queue
      ↓
Warm Renderer
      │
      ├── available → render
      │
      └── unavailable
             ↓
        GitHub Actions
             ↓
        Existing Renderer
             ↓
            MP4
```

The rendering layer uses the existing FastAPI/FFmpeg pipeline.

**Guardian:** Rendering Guardian

**Slayers:** render workers

**Healers:** retry / fallback / recovery workers

**Primary role:** produce a valid final artifact reliably.

---

# 🛡️ Floor 06 — Security, Identity & Governance

**Purpose:** protect the factory and enforce who is allowed to perform which operations.

The existing architecture contains authentication, session handling, authorization boundaries, execution-token validation, and server-side protection. The broader Floor 6 work was explicitly defined around authentication, user persistence, RBAC, password recovery, security hardening, tests, and security verification.

Conceptually:

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

The security boundary is deliberately server-side rather than relying purely on frontend visibility.

**Guardian:** Security / Governance Guardian

**Primary role:** protect the factory from unauthorized operations and unsafe state transitions.

---

# 🧪 Floor 07 — Verification & Compliance

The repository/history explicitly contains:

```text
archive/floor07_compliance_2026-08-23/
```

which is identified as **archived rather than live**. Therefore this README does not present that archived implementation as the current runtime.

Architecturally, the seventh floor represents the **verification/compliance boundary**:

```text
Factory Output
      ↓
Verification
      ↓
Security / Quality / Policy checks
      ↓
Ship / Reject / Escalate
```

**Guardian:** Compliance Guardian

**Primary role:** verify that system outputs and production state satisfy the required acceptance gates before release.

---

# 🔗 How the Floors Work Together

The seven floors are not seven isolated applications.

They form a dependency chain:

```text
                 👁️ OVERSEER
                     │
                     ▼
              🛡️ FLOOR 01
                  Foundation
                     │
                     ▼
              🛡️ FLOOR 02
                Orchestration
                     │
                     ▼
              🛡️ FLOOR 03
                Intelligence
                     │
                     ▼
              🛡️ FLOOR 04
                 Production
                     │
                     ▼
              🛡️ FLOOR 05
             Rendering / Delivery
                     │
                     ▼
              🛡️ FLOOR 06
            Security / Governance
                     │
                     ▼
              🛡️ FLOOR 07
          Verification / Compliance
                     │
                     ▼
                 RELEASE
```

The exact implementation boundaries may evolve, but the principle is stable:

> **Each floor narrows responsibility while the Overseer maintains the global picture.**

---

# ⚙️ Rendering Fleet

Rendering is intentionally provider-independent.

The system can use a warm renderer first and fall back to external workers when required. The documented design includes a queue, GitHub Actions render worker, existing FFmpeg/MoviePy renderer, object storage, and FactoryOS state.

The target architecture extends this toward:

```text
                         Render Queue
                              │
                       Smart Router
                              │
          ┌───────────────────┼───────────────────┐
          │                   │                   │
          ▼                   ▼                   ▼
      Lightning             Kaggle              GitHub
         GPU                 GPU                 CPU
          │                   │                   │
          └───────────────────┼───────────────────┘
                              │
                           Render
                              │
                              ▼
                            MP4
                              │
                        Artifact Manager
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
             Cloudinary             Google Drive
                  │                       │
                  └───────────┬───────────┘
                              ▼
                       ShortForge UI
```

**Providers are execution resources.**

**FactoryOS owns orchestration.**

That separation lets the rendering fleet evolve without redesigning the production pipeline.

---

# 📦 Artifact Lifecycle

Every generated video is treated as an artifact with a lifecycle:

```text
CREATE
  ↓
RENDER
  ↓
VALIDATE
  ↓
STORE
  ↓
DELIVER
  ↓
TRACK
```

The project currently uses Cloudinary for media handling and Firestore/MongoDB/SQLite for different categories of state.

The key design principle is:

> **A worker should produce an artifact; it should not become the artifact's permanent owner.**

---

# 🔐 Reliability Engineering

ShortForge incorporates several mechanisms intended for distributed, failure-prone execution.

## Atomic quotas

Generation slots are reserved transactionally and finalized only after artifact verification.

```text
Reserve
  ↓
Generate
  ↓
Verify
  ↓
Finalize
```

## Execution authorization

Render jobs use scoped execution credentials and worker-side validation.

## Idempotent callbacks

Repeated callbacks should not blindly create repeated state transitions.

## Worker fallback

If the warm rendering path is unavailable, the control plane can fall back to an external render worker.

## State over assumptions

The system tracks state rather than assuming:

```text
"the job probably finished"
```

Instead:

```text
QUEUED
→ CLAIMED
→ RUNNING
→ RENDERED
→ VALIDATED
→ STORED
→ COMPLETED
```

---

# 🧰 Technology Stack

| Layer | Technology |
|---|---|
| Web / Control Plane | Next.js 16, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| State | Zustand |
| API | Next.js Route Handlers |
| Worker APIs | FastAPI |
| Rendering | FFmpeg, Pillow |
| Voice | edge-tts |
| Speech / Subtitles | faster-whisper |
| AI | Vercel AI SDK, Groq, Gemini, FLUX, Transformers |
| Databases | Firestore, MongoDB, SQLite |
| Media | Cloudinary |
| CI / Worker fallback | GitHub Actions |
| Infrastructure | Docker, Firebase, Cloudflare, Render / Vercel |

---

# 🏗️ Repository Architecture

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

The current project documentation explicitly describes pipeline directories covering `floor01..06+guardian`.

---

# 🚀 Example Production Flow

A motivational Short might move through the factory like this:

```text
User
 │
 │ "Make a Short about discipline"
 ▼
👁️ Overseer
 │
 ▼
🛡️ Floor Guardian
 │
 ▼
⚔️ Script Slayer
 │
 ▼
⚔️ Voice Slayer
 │
 ▼
⚔️ Visual Slayer
 │
 ▼
⚔️ Subtitle Slayer
 │
 ▼
🛡️ Rendering Guardian
 │
 ├── Warm worker
 │       ↓
 │     FFmpeg
 │
 └── fallback worker
         ↓
      GitHub / GPU provider
 │
 ▼
❤️ Healer if required
 │
 ▼
🛡️ Verification Guardian
 │
 ▼
MP4 validated
 │
 ├── Cloudinary
 ├── Google Drive
 └── ShortForge Library
```

---

# 📈 Engineering Goals

ShortForge is optimized around several principles:

### Warm execution

Keep frequently used workers ready rather than bootstrapping the environment for every request.

### Provider independence

Compute providers can be replaced without changing the production model.

### Fault tolerance

Failures are routed through recovery mechanisms rather than automatically terminating the factory.

### Persistent state

Production state is recorded so workers can be replaced without losing the job's history.

### Security boundaries

Authorization is enforced at the server/worker layer.

### Observable execution

Each stage of production should be traceable.

### Modular intelligence

Models and AI providers can evolve independently from orchestration.

---

# 🌟 Why ShortForge Is Technically Interesting

ShortForge combines several engineering problems that normally live in separate systems:

```text
AI generation
      +
agent orchestration
      +
hierarchical control
      +
distributed workers
      +
job queues
      +
fault recovery
      +
media processing
      +
artifact management
      +
security
      +
multi-provider compute
```

The result is intended to behave less like:

> **"an AI that generates a video"**

and more like:

> **"a small autonomous production company implemented as software."**

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
      Autonomy      Reliability    Scalability
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

Future work centers on deeper orchestration, smarter provider routing, worker telemetry, recovery automation, and increasingly autonomous factory operation.

---

# 🌐 Try It

### Live Product

**https://shortforge.gokul.software/**

### Source

**https://github.com/Gokul7904231/ShortForge**

Start with:

```text
docs/ARCHITECTURE.md
services/pipeline/
services/rendering-engine/
apps/web/
.github/workflows/
```

---

# 👤 Author

## Gokul

Computer Science student focused on:

- AI / ML
- LLM systems
- Agentic AI
- Autonomous software systems
- AI infrastructure
- Distributed execution

### Building toward one idea:

> **Software that doesn't merely perform tasks — it operates the factory that performs them.**

---

# 📜 License

MIT — see [`LICENSE`](LICENSE).
