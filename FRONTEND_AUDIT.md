# 🔍 Comprehensive Frontend & Architectural Audit — FactoryOS v1

**Role:** Principal Software Architect, Frontend Architect, QA Lead  
**Scope:** Complete repository discovery, dependency graph, component classification, dead code analysis, and state flow assessment.

---

## 1. 🗺️ Monorepo & Control Plane Map

FactoryOS v1 Control Plane (`gen-v`) is built on **Next.js 16 (App Router / Turbopack)**, **React 19**, **Zustand**, **Tailwind CSS v4**, **Framer Motion**, and **Firebase SDKs**.

```
gen-v/
├── app/
│   ├── (os)/                     # Control Plane Dashboard Route Group
│   │   ├── dashboard/            # Mission Control Dashboard
│   │   │   ├── ai-hospital/      # Self-healing diagnostic hospital page
│   │   │   ├── capabilities/     # AI capability registry page
│   │   │   ├── jobs/             # Live job queue & state inspector
│   │   │   ├── profiler/         # SRE performance & cost profiler
│   │   │   ├── quiz/             # Quiz engine inspector & benchmark suite
│   │   │   ├── simulation/       # Chaos engineering & failure injection
│   │   │   ├── voice-registry/   # TTS voice registry manager
│   │   │   └── workers/          # Background worker pool monitor
│   │   ├── factory/              # Factory Operations
│   │   │   ├── queue/            # Multi-engine queue inspector
│   │   │   ├── scheduler/        # Automated cron production scheduler
│   │   │   ├── templates/        # Content template manager
│   │   │   └── workflows/        # Multi-stage workflow DAG builder
│   │   ├── media/                # Storage & Media CDN
│   │   │   ├── assets/           # Dynamic visual asset manager
│   │   │   ├── cloudinary/       # Cloudinary CDN mirror inspector
│   │   │   ├── drive/            # Google Drive outbox delivery inspector
│   │   │   └── library/          # Media library & clip browser
│   │   ├── publishing/           # Multi-Platform Exporter
│   │   │   ├── drive/            # Drive delivery pipeline
│   │   │   ├── instagram/        # IG Reels export manager
│   │   │   ├── tiktok/           # TikTok Shorts export manager
│   │   │   └── youtube/          # YouTube Shorts publisher
│   │   └── settings/             # System config & provider API keys
│   ├── api/                      # 35+ Backend API Endpoints
│   ├── login/                    # Secure Admin Authentication Page
│   └── page.js                   # Public Marketing Landing Page
│
├── components/                   # React UI Components
│   ├── charts/                   # Recharts & Custom SVG Metric Charts
│   ├── CommandPalette.tsx        # Global Cmd+K Command Palette
│   ├── LiveEventFeed.tsx         # Real-Time SSE Event Stream Feed
│   ├── UserMenu.tsx              # Admin Profile & Session Badge
│   ├── QuickGenerateOverlay.tsx  # Modal for Instant Video Trigger
│   ├── Sidebar.tsx               # Enterprise Control Center Navigation
│   └── TopNav.tsx                # Breadcrumbs, Quick Actions & Status
│
└── lib/
    ├── auth/                     # Enterprise Auth Subsystem (Firebase + Session Cookies)
    ├── factory-store.ts          # Central Zustand Factory State Store (SSE + Polling)
    ├── os-store.ts               # UI State & Active Selection Store
    ├── queue-db.ts               # SQLite Job Queue & Telemetry DB
    └── storage/                  # Cloudinary & Google Drive Outbox Engine
```

---

## 2. 📊 System Dependency Graph

```mermaid
flowchart TD
    subgraph UI_Layer ["Next.js 16 Client & Server Components"]
        LandingPage[app/page.js - Public]
        LoginPage[app/login/page.js - Public]
        MissionControl[app/(os)/dashboard/page.tsx - Protected]
        JobsPage[app/(os)/dashboard/jobs/page.tsx - Protected]
        SchedulerPage[app/(os)/factory/scheduler/page.tsx - Protected]
        MediaDrivePage[app/(os)/media/drive/page.tsx - Protected]
        ProviderRegistry[app/(os)/ai/capability-registry/page.tsx - Protected]
    end

    subgraph State_Layer ["State & Auth Management"]
        AuthProvider[lib/auth/providers.tsx]
        AuthService[lib/auth/AuthService.ts]
        FactoryStore[lib/factory-store.ts - Zustand]
        OSStore[lib/os-store.ts - Zustand]
    end

    subgraph API_Layer ["Backend Route Handlers (/api)"]
        StateSSE[/api/factory-state/sse]
        StateAPI[/api/factory-state]
        JobsAPI[/api/jobs/list]
        AuthAPI[/api/auth/session]
        DriveAPI[/api/drive/status]
        ProviderAPI[/api/providers]
    end

    subgraph Engine_Layer ["FactoryOS Core Engines"]
        Overseer[factoryos/core/overseer]
        Guardian[factoryos/core/guardian]
        Production[factoryos/core/production]
        VPSEngine[vps-rendering-engine]
        Floor07[floor07 Compliance Gate]
    end

    %% Dependencies
    UI_Layer --> AuthProvider
    AuthProvider --> AuthService
    UI_Layer --> FactoryStore
    FactoryStore --> StateSSE & StateAPI
    StateAPI --> Engine_Layer
    Engine_Layer --> VPSEngine & Floor07
```

---

## 3. ⚖️ Functionality Classification Matrix

### 3.1 Real Production Functionality (Connected to Real Backend)
- **Authentication & Authorization**: Firebase Auth + HTTP-Only Session Cookie + Firestore Admin RBAC (`lib/auth/*`, `middleware.ts`).
- **Factory State Sync**: `GET /api/factory-state` & `/api/factory-state/sse` streaming real CPU/Mem load, active jobs, queues, and event log history.
- **Production Job Scheduling**: `app/(os)/factory/scheduler/page.tsx` triggering real `auto_scheduler.py` processes.
- **Google Drive Outbox Delivery**: `app/(os)/media/drive/page.tsx` connected to live Google Drive API (`lib/storage/providers/google-drive.ts`).
- **VPS Rendering Engine Integration**: Real FFmpeg compilation and SRT subtitle generation (`vps-rendering-engine/scripts/create_short.py`).

### 3.2 Partial / Synthetic Functionality (Requires Refinement)
- **AI Hospital (`app/(os)/dashboard/ai-hospital/page.tsx`)**: Renders diagnostics UI but relies partly on fallback mock error logs when SRE telemetry is offline.
- **Simulation Suite (`app/(os)/dashboard/simulation/page.tsx`)**: Controls chaos testing but relies on hardcoded stress scenario selectors.
- **Publishing Channels (YouTube, TikTok, Instagram)**: Queues outbox items, but Instagram and TikTok exports currently resolve through mock stubs.

---

## 4. 🧹 Dead Code & Unused Module Ledger

1. **`app/(os)/recent-renders/provider-reliability.js`**: Legacy file unlinked from sidebar navigation.
2. **`lib/simulation-state.ts`**: Duplicate state store overlapping with `useFactoryStore`.
3. **`components/charts/SimulationChart.tsx`**: Unused visualization replaced by inline SVG charts in `simulation/page.tsx`.

---

## 5. ⚠️ State Flow & Hydration Risk Assessment

- **Hydration Mismatch Risk**: `useFactoryStore` initializes `system` state on client mount. Server-rendered markup displays `0%` before hydration completes. (Mitigated via `useMounted` hook).
- **SSE Connection Resilience**: EventSource automatic reconnection handling in `lib/factory-store.ts` requires exponential backoff retry to prevent browser thread saturation during network dropouts.
