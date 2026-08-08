# 🔄 End-to-End User & Operational Flow — FactoryOS v1

This document maps out the operational workflows and user journeys within the FactoryOS Control Center.

---

## 1. 🔑 Admin Authentication & Session Entry Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin User
    participant Browser as Client Browser
    participant Login as /login Page
    participant AuthAPI as /api/auth/session
    participant Dashboard as /dashboard

    Admin->>Browser: Navigate to FactoryOS URL
    Browser->>Login: Redirect if unauthenticated
    Admin->>Login: Submit Credentials (Email/Password or Google)
    Login->>AuthAPI: POST /api/auth/session { idToken }
    AuthAPI-->>Browser: Set-Cookie: __session=... (HttpOnly)
    Login->>Dashboard: Redirect to /dashboard
    Dashboard-->>Admin: Display Mission Control Dashboard & UserMenu badge
```

---

## 2. 🎬 Video Generation & Quality Pipeline Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin / Cron Scheduler
    participant UI as QuickGenerate / Scheduler UI
    participant GenAPI as /api/quiz/generate
    participant Guardian as Quiz Guardian
    participant Floor07 as Floor07 Compliance Gate
    participant Overseer as Overseer Supervisor
    participant Renderer as VPS Rendering Engine (FFmpeg)
    participant Outbox as Google Drive / Cloudinary Outbox

    Admin->>UI: Select Topic ("Geography Quiz") & Click Generate
    UI->>GenAPI: POST /api/quiz/generate { topic }
    GenAPI->>Guardian: Evaluate Grounding & Hallucination
    Guardian->>Floor07: Check Policies & Issue SHA-256 Cert
    Floor07-->>Overseer: Approved Payload + Certificate
    Overseer->>Renderer: Dispatch Render Job
    Renderer->>Outbox: Stream MP4 & Burnt Subtitles to Drive/Cloudinary
    Outbox-->>UI: Live SSE Event "storage.upload.completed"
```
