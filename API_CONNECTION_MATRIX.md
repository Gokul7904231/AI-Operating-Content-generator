# 🔌 API Connection Matrix — FactoryOS v1

This document maps every Control Center page, widget, and component in `gen-v` to its underlying real backend API endpoint, data source, and HTTP method.

---

## 🗺️ Page-to-API Mapping Matrix

| Page / Route | Component / Widget | Backend API Endpoint | Method | Data Source / Engine |
| :--- | :--- | :--- | :--- | :--- |
| `/dashboard` | System Health Banner | `/api/factory-state` | `GET` | OS `freemem`/`cpus` + CapabilityManager |
| `/dashboard` | Jobs Counter Widgets | `/api/factory-state` | `GET` | Firestore `videos` collection |
| `/dashboard` | Real-Time SSE Stream | `/api/factory-state/sse` | `GET (SSE)` | EventBus history stream |
| `/dashboard/jobs` | Job Table & Inspector | `/api/job-history` | `GET` | Firestore `videos` & QueueDB |
| `/dashboard/jobs` | Job Replay Control | `/api/jobs/[id]/replay` | `POST` | ProductionRunner & StateMachine |
| `/dashboard/jobs` | Video Thumbnail Stream | `/api/media/thumb/[jobId]` | `GET` | Cloudinary / Local filesystem |
| `/factory/scheduler` | Cron Production Slots | `/api/cron/cleanup` | `GET` | `auto_scheduler.py` cron schedule |
| `/factory/scheduler` | Manual Trigger Button | `/api/quiz/generate` | `POST` | QuizGeneratorAgent & WorkflowRunner |
| `/media/drive` | Google Drive Outbox List | `/api/drive/list` | `GET` | Google Drive API (`lib/storage/providers/google-drive.ts`) |
| `/media/drive` | Storage Delivery Status | `/api/drive/status` | `GET` | StorageQueue outbox state |
| `/media/cloudinary` | Cloudinary CDN Mirror | `/api/cloudinary-upload` | `GET` | Cloudinary API |
| `/dashboard/ai-hospital` | SRE Diagnostics | `/api/content-health` | `GET` | Hospital Diagnostics Engine |
| `/dashboard/ai-hospital` | Telemetry History | `/api/admin/telemetry` | `GET` | SQLite MetricsDB |
| `/dashboard/quiz` | Grounding Inspector | `/api/quiz/geo` | `POST` | QuizGuardianAgent & FactVerifier |
| `/dashboard/capabilities` | Provider Status Cards | `/api/providers` | `GET` | AIProviderRegistry |
| `/dashboard/capabilities` | Model Router Settings | `/api/models` | `GET` | IntelligentRouter capability map |
| `/dashboard/profiler` | Performance Profiler | `/api/dashboard/performance/live` | `GET` | SRE Profiler metrics |
| `/dashboard/simulation` | Chaos Engineering | `/api/simulation/control` | `POST` | Simulation state controller |
| `/settings` | System Settings Form | `/api/admin/blueprint` | `GET/POST` | FactoryOS configuration store |
| `/login` | Admin Authentication Form | `/api/auth/session` | `POST/DELETE` | Firebase Auth & Session Cookie Engine |
