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
  Idea → AI production → distributed rendering → validation → delivery
</p>

<p align="center">
  <a href="https://shortforge.gokul.software/">🌐 Live Product</a>
  ·
  <a href="https://github.com/Gokul7904231/ShortForge">💻 Source</a>
  ·
  <a href="https://github.com/Gokul7904231/ShortForge/actions">⚙️ CI</a>
  ·
  <a href="docs/ARCHITECTURE.md">📐 Architecture</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" />
  <img src="https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi" />
  <img src="https://img.shields.io/badge/FFmpeg-Video%20Pipeline-007808?style=flat-square&logo=ffmpeg" />
  <img src="https://img.shields.io/badge/Firestore-Data-FFCA28?style=flat-square&logo=firebase" />
  <img src="https://img.shields.io/badge/MongoDB-Operations-47A248?style=flat-square&logo=mongodb" />
  <img src="https://img.shields.io/badge/GitHub%20Actions-Workers-2088FF?style=flat-square&logo=githubactions" />
  <img src="https://img.shields.io/badge/Docker-Infrastructure-2496ED?style=flat-square&logo=docker" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" />
</p>

---

## What is ShortForge?

**ShortForge is an AI video-production application built on top of a software-factory architecture called FactoryOS.**

A user provides an idea. The system coordinates the rest of the production lifecycle:

```text
Idea
  ↓
Planning
  ↓
AI Generation
  ├── Script
  ├── Voice
  ├── Visuals
  ├── Subtitles
  └── Thumbnail
  ↓
Production State
  ↓
Render Queue
  ↓
Distributed Renderer
  ↓
Validation
  ↓
Artifact Storage
  ↓
Delivery
```

The important engineering problem is not simply generating content with an LLM.

ShortForge has to coordinate:

```text
AI generation
      +
agent orchestration
      +
persistent state
      +
distributed workers
      +
queues
      +
fault recovery
      +
media processing
      +
security
      +
artifact management
      +
multi-provider compute
```

The architecture is designed around a simple principle:

> **Production work should be observable, recoverable, bounded, and independently executable.**

---

# 🌐 Live Product

## **https://shortforge.gokul.software/**

The live application provides the user-facing control plane for creating and managing video-production jobs.

---

# 🧠 FactoryOS

ShortForge is the production application.

**FactoryOS is the operating architecture underneath it.**

```text
                         FACTORYOS
                             │
                             ▼
                        👁 OVERSEER
                             │
                      Command / Intent
                             │
                    Policy / Event Bus
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
       FLOORS            SERVICES           REPORTS
          │                  │
     GUARDIANS          SLAYER / HEALER
          │              / REMAKER / COMMS
          │
    ┌─────┼─────┐
    ▼     ▼     ▼
 Instructor Advisor Auditor
          │
       Guardian
          │
        Workers
          │
       Artifacts
```

The goal is to move from:

```text
User → dashboard → feature → API → model
```

toward:

```text
User
  ↓
Overseer
  ↓
Intent
  ↓
Decision
  ↓
Delegation
  ↓
Execution
  ↓
Observation
  ↓
Recovery
  ↓
Validation
  ↓
Result
```

---

# 👁️ Overseer

The **Overseer** is the central command intelligence of FactoryOS.

It is not intended to be another chatbot sitting above the UI.

Its job is to understand the state of the factory, determine what needs to happen, delegate work, inspect results, and escalate when the system cannot safely recover.

The intended control loop is:

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

The Overseer is designed to operate against factory state rather than inventing answers.

For example:

```text
User:
"Why did Floor 04 fail?"

                ↓

Overseer
   ↓
Floor 04 Guardian
   ↓
Auditor
   ↓
Worker report
   ↓
Slayer investigation
   ↓
ReMaker diagnosis
   ↓
Healer state
   ↓
Overseer
   ↓
Evidence-backed answer
```

The intended UX is therefore:

> **You talk to the Overseer; the Overseer operates the factory.**

---

# 🎙️ Overseer Interaction

The Overseer is designed around both **text and voice interaction**.

```text
Text → Text
Voice → Voice
```

The UI is intended to expose the Overseer's operational state:

```text
IDLE
  ↓
LISTENING
  ↓
THINKING
  ↓
EXECUTING
  ↓
SPEAKING
  ↓
IDLE
```

The voice visualization is tied to the conversational state rather than being a decorative animation.

For speech output, the waveform can react to the generated audio itself.

This interaction model was deliberately designed so users do not need to manually traverse the underlying FactoryOS hierarchy.

---

# 🏛️ Factory Hierarchy

FactoryOS uses hierarchical responsibility rather than one monolithic agent.

```text
SUPREME AUTHORITY / ADMIN
            │
            ▼
       👁 OVERSEER
            │
            ▼
        TREASURER
            │
            ▼
   FACTORY-LEVEL SERVICES
   ┌────────┼────────┬────────┐
   │        │        │        │
 Comms    Slayer   Healer  ReMaker
            │
            ▼
          FLOORS
            │
    ┌───────┼────────┐
    │       │        │
Instructor Advisor  Auditor
    │       │        │
    └───────┼────────┘
            │
         Guardian
            │
         Workers
```

### Role model

| Role | Responsibility |
|---|---|
| **Supreme Authority / Admin** | Highest system authority |
| **Overseer** | Global command, orchestration and factory awareness |
| **Treasurer** | Governance around XP / penalties / validation |
| **Instructor** | Defines or teaches the operating approach for a domain |
| **Advisor** | Provides recommendations and guidance |
| **Auditor** | Inspects execution and evidence |
| **Guardian** | Supervises a floor/domain |
| **Worker** | Executes a bounded operation |
| **Slayer** | Specialized execution worker |
| **Healer** | Recovery, retries and fallback |
| **ReMaker** | Diagnosis and reconstruction of failed work |
| **Comms** | Communication / event flow between factory components |

This hierarchy is an architectural model: individual roles can evolve independently without requiring one giant agent to own the entire system.

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

**Responsibility:** shared runtime, core interfaces and common factory infrastructure.

```text
Runtime
  ↓
Core interfaces
  ↓
Shared infrastructure
  ↓
Reusable capabilities
```

The purpose is to prevent higher-level systems from becoming tightly coupled to low-level implementation details.

---

## Floor 02 — Orchestration

**Responsibility:** turn production intent into executable work.

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

This is the coordination boundary between user intent and actual worker execution.

---

## Floor 03 — Intelligence

**Responsibility:** reasoning, content generation, model routing and AI capabilities.

```text
Topic / Prompt
      ↓
Capability / Provider Routing
      ↓
Model / Engine
      ↓
Structured Result
      ↓
Production State
```

The architecture allows different providers and models to evolve independently from the core control plane.

---

## Floor 04 — Production

**Responsibility:** convert plans and intelligence into media assets.

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
Production Package
```

Production can include:

- script generation
- voice synthesis
- image generation
- subtitle generation
- thumbnail generation
- media analysis
- content-specific engines

The production layer is intentionally modular so different content types can reuse the same factory infrastructure.

---

## Floor 05 — Rendering & Delivery

**Responsibility:** produce a valid final video artifact and deliver it.

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
        External Worker
              ↓
             MP4
              ↓
          Validation
              ↓
        Artifact Storage
              ↓
            Delivery
```

The architecture deliberately separates **render execution** from **application state**.

Current rendering technology includes:

```text
FastAPI
FFmpeg
Pillow
edge-tts
faster-whisper
```

The renderer is a worker.

FactoryOS remains responsible for orchestration and state.

---

## Floor 06 — Security, Identity & Governance

**Responsibility:** control access to the factory and protect production state.

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

The planned governance layer covers:

- authentication
- persistent users
- USER / ADMIN roles
- RBAC
- password recovery
- worker authorization
- user isolation
- privileged operations
- security hardening
- auditability

**Implementation status:** this layer is part of the FactoryOS architectural roadmap; the project history records Floors 1–5 as the completed baseline and Floor 6 onward as subsequent work.

---

## Floor 07 — Verification & Compliance

**Responsibility:** decide whether an output has satisfied the required acceptance gates.

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
Release / Reject / Escalate
```

The repository history contains an archived Floor 07 compliance implementation; it is therefore documented here as the intended verification boundary rather than being represented as fully active runtime code.

---

# ⚔️ Slayers

A **Slayer** is a bounded execution specialist.

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

The important property is **bounded responsibility**.

```text
Input
  ↓
Slayer
  ↓
Output
  ↓
Report
```

This makes workers easier to:

- test
- replace
- retry
- route
- scale
- observe

---

# ❤️ Healers

Healers are part of the production architecture rather than an afterthought.

```text
Worker
  ↓
Failure
  ↓
Healer
  ↓
Retry
 / Replace
 / Fallback
 / Repair
  ↓
Resume
```

The principle is:

> **A worker failure should not automatically become a production failure.**

This becomes especially important when the factory depends on external AI providers, remote compute or ephemeral infrastructure.

---

# 🔧 ReMaker

The **ReMaker** sits on the recovery side of the factory.

Where a Healer can recover an execution path, ReMaker is concerned with determining whether failed work should be reconstructed.

Conceptually:

```text
Invalid / Failed Artifact
          ↓
       Diagnosis
          ↓
        ReMaker
          ↓
      Reconstruct
          ↓
        Validate
```

This provides another layer between:

```text
failure
```

and:

```text
production termination
```

---

# 🧠 Adaptive Overseer

The intended future Overseer architecture is not simply:

```text
Prompt
  ↓
LLM
```

Instead:

```text
User
  ↓
Overseer
  ↓
Task Complexity / Uncertainty
  ↓
Adaptive Strategy
  ├── direct answer
  ├── retrieve
  ├── decompose
  ├── investigate
  └── recurse
  ↓
Evidence
  ↓
Validator
  ↓
Mission
```

The important constraint is that deeper reasoning should be **budgeted**.

Recursive investigation should depend on factors such as:

```text
uncertainty
+
task complexity
+
evidence coverage
+
remaining budget
+
validator state
```

rather than recursively calling the model a fixed number of times.

This is a future evolution of the Overseer architecture, not a claim that the entire RLM design is already production-complete.

---

# 🎙️ Resilient Voice Architecture

Voice generation is treated as a subsystem rather than a single TTS dependency.

```text
Workflow
    ↓
Voice Capability Registry
    ↓
Recommendation Engine
    ↓
Voice Benchmark
    ↓
Router
    ↓
Candidate Ranking
    ↓
Worker Pool
    ↓
Voice Engine / Provider
    ↓
Audio Post Processor
    ↓
Cache
    ↓
Asset Registry
    ↓
Profiler / Diagnostics
```

The architecture was designed to support:

```text
Local Engines
    └── Supertonic

Cloud Providers
    └── ElevenLabs

Network Providers
    └── Edge

Future Engines
    ├── Kokoro
    ├── Piper
    ├── Fish Speech
    ├── F5-TTS
    ├── Orpheus
    └── StyleTTS2
```

The router should rank candidates using capability and health rather than relying forever on hard-coded provider order.

The planned reliability strategy includes:

```text
Provider Cache
      ↓
Provider Fallback
      ↓
Generic Cross-Provider Cache
      ↓
Degraded Audio
      ↓
Silent Fallback
```

The audio subsystem also includes health telemetry, circuit-breaker behavior, retries, timeouts and post-processing concepts.

---

# 🎬 Content Engines

ShortForge is designed to support multiple production missions on a shared factory.

Examples:

```text
Coding
Facts
History
Motivation
News
Psychology
Quiz
```

A content engine can define its own production characteristics without rebuilding the orchestration, rendering and delivery infrastructure.

For example:

```text
Quiz Engine
  ├── Topic
  ├── Difficulty
  ├── Audience
  ├── Voice
  ├── Visual Style
  └── Publishing Target
```

---

# ⚙️ Distributed Rendering

Rendering is treated as a compute-fleet problem.

```text
                       FACTORYOS
                           │
                     Render Queue
                           │
                     Smart Router
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
      Lightning          Kaggle           GitHub
        GPU               GPU              CPU
          │                │                │
          └────────────────┼────────────────┘
                           │
                         Render
                           │
                           ▼
                       RenderArtifact
                           │
                    Artifact Manager
                           │
                 ┌─────────┴─────────┐
                 ▼                   ▼
             Cloudinary         Google Drive
                 │                   │
                 └─────────┬─────────┘
                           ▼
                     ShortForge UI
```

The intended routing strategy is:

```text
1. Lightning
       ↓ unavailable / busy / quota
2. Kaggle
       ↓ unavailable
3. GitHub Actions
       ↓
4. Retry / Queue
```

Lightning is intended as the warm primary renderer, Kaggle as burst capacity, and GitHub Actions as a CPU-oriented fallback.

The key abstraction is:

> **Compute providers execute jobs. FactoryOS owns orchestration and state.**

---

# ⚡ Warm Rendering

A warm worker avoids repeatedly rebuilding the rendering environment.

The current Basic renderer architecture has already been brought up inside Lightning with:

```text
Lightning Studio
      ↓
FastAPI :8100
      ├── /health
      └── /ready
             ↓
      BasicRenderWorker
             ↓
           FFmpeg
```

The recorded verification showed the worker reporting:

```text
workerCount: 1
queueDepth: 0
activeJobs: 0
completedJobs: 0
failedJobs: 0
```

The remaining production boundary at that checkpoint was the externally reachable Lightning endpoint and full FactoryOS → Lightning → artifact completion flow.

---

# 🔐 Failure-Aware Execution

ShortForge treats failures as expected distributed-system events.

## Explicit job lifecycle

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

## Atomic capacity reservation

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

Render jobs use scoped execution tokens and server-side verification.

## Idempotent callbacks

Repeated callbacks should not create repeated state transitions.

## Worker fallback

A warm renderer can be replaced by another execution provider when capacity is unavailable.

---

# 📦 Artifact Lifecycle

A completed video is an **artifact**, not merely an HTTP response.

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

This separation allows the rendering infrastructure to fail or be replaced without losing the application's durable understanding of the production.

---

# 🗃️ Operational Memory

FactoryOS separates application state from operational intelligence.

```text
                     FACTORYOS
                         │
              ┌──────────┴──────────┐
              │                     │
          Firestore              MongoDB
              │                     │
              ▼                     ▼
       Application State      Operational State
              │                     │
         Users / RBAC          Worker Reports
         Projects              Floor Executions
         Video Jobs            Worker Health
         API Config            Failures
                               Metrics
                               Events
                               Overseer Memory
```

MongoDB was introduced as the operational intelligence layer rather than replacing the existing Firestore application architecture.

---

# 🔎 External Intelligence

The broader FactoryOS architecture also leaves room for external research tooling.

Agent-Reach was considered as a unified interface for agent access to platforms such as:

```text
X
Reddit
YouTube
GitHub
LinkedIn
```

This creates a future research path:

```text
External Intelligence
       ↓
Research
       ↓
Overseer
       ↓
Content Engine
       ↓
Production
```

---

# 🧪 Engineering & Verification

The project uses multiple verification layers:

```text
Type Checking
     +
Unit Tests
     +
Integration Tests
     +
Security Checks
     +
Rendering Validation
     +
Callback Verification
     +
Production Builds
```

The architecture also emphasizes **real-boundary verification**.

For infrastructure, simulated evidence is not enough.

The intended acceptance path crosses the real boundary:

```text
FactoryOS
   ↓
Real backend
   ↓
Real database
   ↓
Real worker
   ↓
Real FFmpeg
   ↓
Real MP4
   ↓
Real storage
   ↓
Real callback
   ↓
Completed job
```

---

# 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Control Plane | Next.js 16, React 19 |
| Language | TypeScript |
| UI | Tailwind CSS, Framer Motion, Zustand |
| Backend APIs | Next.js Route Handlers, FastAPI |
| AI | Vercel AI SDK, Groq, Gemini, FLUX, Transformers |
| Rendering | FFmpeg, Pillow |
| Voice | edge-tts + pluggable voice engines/providers |
| Speech / Subtitles | faster-whisper |
| Application Data | Firestore |
| Operational Data | MongoDB |
| Local / Queue State | SQLite |
| Media | Cloudinary |
| Compute | Lightning, Kaggle, GitHub Actions, Azure for isolated Admin workloads |
| Infrastructure | Docker, Firebase, Cloudflare, Render / Vercel |

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
│       ├── content-engines/
│       ├── factoryos/
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

# 🏗️ End-to-End Production Example

User:

```text
"Create a Short explaining how black holes work."
```

FactoryOS:

```text
                         USER
                           │
                           ▼
                     👁️ OVERSEER
                           │
                           ▼
                   Intent / Planning
                           │
                           ▼
                  🧭 Orchestration
                           │
                           ▼
                  🧠 Intelligence
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
           Script        Voice        Visuals
              │            │            │
              └────────────┼────────────┘
                           ▼
                    🎬 Production
                           │
                           ▼
                     Render Queue
                           │
                           ▼
                  🎞️ Rendering
                    │            │
                    │            └── fallback
                    ▼                 │
                Warm Worker      External Worker
                    │                 │
                    └────────┬────────┘
                             ▼
                           MP4
                             │
                       Validation
                             │
                             ▼
                   Verification Layer
                             │
                             ▼
                     Artifact Manager
                        │          │
                        ▼          ▼
                   Cloudinary   Drive
                             │
                             ▼
                       ShortForge UI
```

When a stage fails:

```text
Worker
  ↓
Failure
  ↓
❤️ Healer
  ↓
Retry / Fallback / Repair
  ↓
ReMaker if reconstruction is required
  ↓
Resume
```

---

# 🔬 Engineering Focus

The project is primarily a **systems-engineering exercise around AI workloads**.

The interesting problems are:

```text
AI
 +
agent orchestration
 +
hierarchical control
 +
distributed execution
 +
persistent state
 +
worker scheduling
 +
fault recovery
 +
media processing
 +
security
 +
artifact lifecycle
 +
multi-provider compute
```

Rather than treating AI generation as a single model call, FactoryOS treats it as a **long-running, stateful production workflow**.

That distinction drives the architecture.

---

# 📌 Architecture Principles

### Separation of concerns

The control plane coordinates jobs; workers execute them.

### Bounded autonomy

Agents operate within explicit responsibilities.

### Observable execution

Production state is represented explicitly.

### Recovery by design

Failures are routed toward retry, fallback, repair or escalation.

### Provider independence

Compute and AI providers are replaceable execution resources.

### Artifact ownership

Workers produce artifacts; durable application state remains outside the worker.

### Evidence-based decisions

The Overseer is intended to reason from factory state and reports rather than fabricate operational status.

---

# 🚦 Project Status

The project is intentionally being developed in stages.

### Current baseline

```text
✅ Floors 01–05 baseline
✅ Core production pipeline
✅ AI/content generation
✅ Rendering engine
✅ Warm Basic renderer
✅ GitHub render fallback
✅ Execution-token protection
✅ Render queue
✅ Artifact handling
✅ Worker telemetry foundations
✅ Resilient voice architecture
```

### In active evolution

```text
🚧 Public Lightning integration
🚧 Multi-provider render routing
🚧 Operational Overseer
🚧 Persistent operational intelligence
🚧 Floor 06 security/governance expansion
🚧 Floor 07 verification/compliance
🚧 Deeper autonomous orchestration
🚧 Adaptive / recursive Overseer strategies
```

---

# ▶️ Run Locally

## Control Plane

```bash
cd apps/web

npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Rendering Engine

```bash
cd services/rendering-engine

pip install -r requirements.txt

python -m uvicorn main:app --port 8080
```

## Warm Basic Renderer

```bash
python -m uvicorn basic_render_api:app --port 8100
```

## Tests

```bash
cd apps/web

npm run factoryos:test
npm run factoryos:typecheck
npm run build
```

FFmpeg must be available in the rendering environment.

---

# 🗺️ Where FactoryOS Is Going

```text
Single AI Application
        ↓
Multi-Agent Application
        ↓
Orchestrated Production System
        ↓
Autonomous Software Factory
        ↓
Adaptive Factory Intelligence
```

The long-term direction is:

```text
User
 ↓
Overseer
 ↓
Adaptive decision-making
 ↓
Floor orchestration
 ↓
Specialized workers
 ↓
Distributed compute
 ↓
Automatic recovery
 ↓
Verification
 ↓
Artifact delivery
```

The factory should increasingly be able to determine:

```text
what needs to happen
        ↓
who should do it
        ↓
where it should execute
        ↓
whether it succeeded
        ↓
what to do when it fails
        ↓
when the result is safe to release
```

---

# 🌐 Links

**Live Product**

https://shortforge.gokul.software/

**Source**

https://github.com/Gokul7904231/ShortForge

**Architecture**

`docs/ARCHITECTURE.md`

**Pipeline**

`services/pipeline/`

**Rendering Engine**

`services/rendering-engine/`

**Workflows**

`.github/workflows/`

---

# 👤 Author

## Gokul

Computer Science student focused on:

**AI / ML · LLM Systems · Agentic AI · AI Infrastructure · Distributed Systems**

ShortForge is an ongoing engineering project exploring one question:

> **What would it take to make an AI system that can operate an entire production workflow rather than merely answer a prompt?**

---

# 📜 License

MIT — see [`LICENSE`](LICENSE).
