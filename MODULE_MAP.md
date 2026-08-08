# 📖 Module Map & Folder Dictionary — FactoryOS Monorepo

This document serves as the comprehensive directory dictionary for **FactoryOS**. It details the exact domain responsibility, purpose, and contents of every folder in the codebase.

---

## 📂 Workspace Root Directory (`aishorts/`)

| Folder / File | Description & Domain Responsibility |
| :--- | :--- |
| **`Architecture.md`** | Master architectural blueprint, lifecycle sequence diagrams, service boundaries, and security model. |
| **`MODULE_MAP.md`** | Exhaustive directory dictionary detailing every folder and component across the monorepo. |
| **`README.md`** | System quickstart guide, data flow diagram, and developer orientation. |
| **`ARCHITECTURE_DECISIONS.md`** | Monorepo Architectural Decision Records (ADRs). |
| **`gen-v/`** | **Next.js 16 Control Plane & Multi-Agent Orchestrator**. Manages UI dashboard, AI routing, script generation, and workflow state. |
| **`floor07/`** | **Python FastAPI Compliance & Quality Gate**. Enforces policy checks, hallucination ratings, and SHA-256 certificate signing. |
| **`vps-rendering-engine/`** | **Headless FFmpeg Compute Worker**. Executes video timeline rendering, TTS audio synthesis, and subtitle overlay. |
| **`hybrid-video/`** | Standalone Python container variant for lightweight rendering tasks. |
| **`factoryos-akb/`** | Architecture Knowledge Base containing enterprise standard documents (AKB-000, EA-001, RA-007). |
| **`docs/`** | Centralized documentation hub (`architecture/`, `deployment/`, `api/`, `adr/`, `diagrams/`). |
| **`scripts/`** | Operational tooling scripts (`setup/`, `deploy/`, `migration/`, `maintenance/`). |
| **`test_edge_audio/`** | Sandbox environment for TTS audio synthesis testing. |

---

## 🚀 Control Plane Directory (`gen-v/`)

```
gen-v/
├── app/                          # Next.js 16 App Router UI Pages & API Routes
│   ├── (os)/                     # Control Plane Dashboard Screens
│   │   ├── dashboard/            # System status, worker health, AI hospital, profiler
│   │   ├── factory/              # Scheduler, job queue, and timeline UI
│   │   ├── media/                # Asset drive, gallery, and storage managers
│   │   └── ai/                   # Capability registry & AI provider marketplace
│   └── api/                      # Backend API Handlers
│       ├── jobs/                 # Production job CRUD & execution handlers
│       ├── quiz/                 # Quiz generation & verification endpoints
│       ├── media/                # Video & thumbnail streaming endpoints
│       └── engines/              # Content engine status & configuration
│
├── factoryos/                    # Core OS Orchestration Engine
│   ├── core/                     # Fundamental OS Runtimes & State Engines
│   │   ├── runtime/              # FactoryRuntime & WorkflowRunner execution engines
│   │   ├── production/           # ProductionStateMachine, ProductionJob, & Idempotency
│   │   ├── overseer/             # Multi-agent Supervisor & System Auditor
│   │   ├── guardian/             # Compliance & Grounding Quality Verification
│   │   ├── rag/                  # Vector, Graph, & Hybrid RAG retrievers
│   │   ├── repair/               # Local self-healing & repair engine
│   │   ├── state/                # Workflow & Step state machine handlers
│   │   ├── telemetry/            # Execution profiling & cost metrics
│   │   └── tools/                # Built-in tool executor & tool contracts
│   └── adapters/                 # System Adapters (Renderer, Drive, Voice, Storage)
│
├── agents/                       # Multi-Agent Network
│   ├── scriptAgent.ts            # Script generation & scene breakdown
│   ├── quizGeneratorAgent.ts     # Educational quiz generation
│   ├── quizCriticAgent.ts        # Quiz quality & grounding critic
│   ├── quizGuardianAgent.ts      # Policy & hallucination compliance agent
│   ├── quizPlannerAgent.ts       # Quiz topic strategy planner
│   ├── sceneAgent.ts             # Visual scene continuity & composition
│   ├── hookAgent.ts              # Viewer retention hook writer
│   ├── metadataAgent.ts          # SEO title, description, & tag generator
│   └── thumbnailAgent.ts         # Visual thumbnail layout planner
│
├── prompts/                      # Centralized System Prompts & Rules
│   ├── registry.ts               # Prompt versioning & prompt registry
│   ├── retention-rules.ts        # Engagement & retention rulesets
│   └── retention-scene-rules.ts  # Scene composition prompt guidelines
│
├── ai/                           # AI Provider Routing Subsystem
│   ├── intelligent-router.ts     # Dynamic model-to-capability binder
│   ├── capability-router.ts      # Fallback & model availability routing
│   └── providers/                # Gemini, Groq, OpenRouter, & Ollama managers
│
├── content-engines/              # Domain Content Generators
│   ├── quiz-short/               # Quiz Short video generation pipeline
│   └── _runtime/                 # Engine step registry & workflow runtime
│
├── storage/                      # Multi-Provider CDN Asset Management
│   ├── providers/                # Cloudinary & Google Drive integrations
│   ├── upload-queue.ts           # Asynchronous delivery outbox queue
│   └── mirror-uploader.ts        # Dual-storage mirror uploader
│
└── publishing/                   # Automated Social Platform Export
    └── providers/                # YouTube & TikTok export integrations
```

---

## 🛡️ Compliance Gate Directory (`floor07/`)

```
floor07/
├── app/
│   ├── api/                      # FastAPI HTTP routes for compliance verification
│   ├── application/              # Use-case handlers & compliance orchestrators
│   ├── domain/                   # Entities, risk profiles, & certificate contracts
│   ├── infrastructure/           # PostgreSQL models, Redis caching, & DB sessions
│   ├── security/                 # SHA-256 cryptographic signature utilities
│   └── workers/                  # Specialized Verification Workers:
│       ├── FactWorker.py         # Hallucination inspection
│       ├── PolicyWorker.py       # Platform policy vetting
│       ├── RiskWorker.py         # Risk aggregation & scoring
│       └── CertificateWorker.py  # SHA-256 certificate signing
├── migrations/                   # Alembic database schema migrations
└── pyproject.toml                # Poetry environment configuration
```

---

## ⚙️ Rendering Engine Directory (`vps-rendering-engine/`)

```
vps-rendering-engine/
├── scripts/
│   └── create_short.py           # Core FFmpeg & MoviePy video compilation script
├── assets/
│   ├── audio/                    # BGM, ding, pop sound effects
│   └── backgrounds/              # Geography, science, world theme backdrops
├── main.py                       # FastAPI render service handler
├── start_worker.py               # Background queue worker process
├── auto_scheduler.py             # Automated job scheduler
└── Dockerfile                    # Headless FFmpeg container specification
```

---

## 📖 Operational Directories (`docs/` & `scripts/`)

```
docs/
├── architecture/                 # System architecture specifications
├── deployment/                   # Production hosting & Docker guides
├── api/                          # REST API specs & contracts
├── adr/                          # Architecture Decision Records
└── diagrams/                     # Mermaid diagrams & sequence flows

scripts/
├── setup/                        # Environment setup & bootstrap scripts
├── deploy/                       # Deployment scripts & container orchestration
├── migration/                    # Data & schema migration helpers
└── maintenance/                  # Health check & diagnostic utilities
```
