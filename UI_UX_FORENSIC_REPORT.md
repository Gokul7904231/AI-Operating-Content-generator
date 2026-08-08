# 🔬 UI/UX Forensic Audit & Page Analysis — FactoryOS v1

**Role:** Senior Product Designer, AI UX Designer, Enterprise SaaS Designer  
**Scope:** Forensic screen-by-screen audit across every interface in the Control Plane (`gen-v`).

---

## 1. 🖥️ Screen-by-Screen Forensic Audit

### 1.1 Mission Control Dashboard (`/dashboard`)
* **Purpose**: Primary system overview and real-time operational status center.
* **Current UX**: Dark glassmorphic dashboard displaying job counts, hardware load bars, active providers, and event stream.
* **Current Backend Connection**: Connected to `useFactoryStore` (`/api/factory-state` and `/api/factory-state/sse`).
* **Missing APIs**: Real-time storage disk quota check; direct Overseer decision stream.
* **Loading State**: Initial loading spinner present, but skeleton screens missing for chart cards.
* **Empty State**: Supported (displays "0 Queued Jobs").
* **Error State**: Displays red banner if SSE disconnects.
* **Accessibility**: Contrast ratios pass WCAG AA; keyboard focus indicators present.
* **Expected vs Actual**: Expected real-time live system health. Actual status matches real OS metrics & Firestore jobs.

---

### 1.2 Jobs Inspector (`/dashboard/jobs`)
* **Purpose**: Inspect all video generation jobs, state transitions, logs, and outputs.
* **Current UX**: Filterable table showing Job ID, Topic, Status badge, Duration, and Action buttons.
* **Current Backend Connection**: `GET /api/job-history` & Firestore `videos` collection.
* **Missing APIs**: Real-time log streaming for individual active jobs.
* **Loading State**: Displays loading skeleton rows.
* **Empty State**: Displays "No active jobs found".
* **Error State**: Retries on network failure.
* **Expected vs Actual**: Expected live progress bar per job. Actual progress updates via periodic SSE polling.

---

### 1.3 Production Scheduler (`/factory/scheduler`)
* **Purpose**: Manage automated content generation cron jobs and scheduled runs.
* **Current UX**: Time-slot grid showing active cron slots, target topics, and manual trigger controls.
* **Current Backend Connection**: Connected to `GET /api/cron/cleanup` & scheduler status endpoints.
* **Missing APIs**: Visual cron expression builder.
* **Loading State**: Pulse animation present.
* **Empty State**: Supported.
* **Expected vs Actual**: Expected real-time countdown to next run. Actual displays scheduled slot timestamps.

---

### 1.4 Google Drive Outbox (`/media/drive`)
* **Purpose**: Inspect uploaded video artifacts, delivery outbox status, and idempotency keys.
* **Current UX**: Folder view with file cards, Cloudinary mirrors, and upload status tags.
* **Current Backend Connection**: `GET /api/drive/list` & `GET /api/drive/status`.
* **Missing APIs**: Direct byte-range upload progress bar.
* **Loading State**: Skeleton cards rendered during fetch.
* **Empty State**: Displays "Drive Outbox Empty".
* **Expected vs Actual**: Expected instantaneous file preview. Actual streams video thumbnails via `/api/media/thumb/[jobId]`.

---

### 1.5 AI Hospital & Diagnostics (`/dashboard/ai-hospital`)
* **Purpose**: Self-healing system diagnostics, error recovery, and failure repair.
* **Current UX**: Medical-themed diagnostic dashboard showing failing steps, repair attempts, and system health.
* **Current Backend Connection**: `GET /api/sre/status` & `/api/content-health`.
* **Missing APIs**: Automated one-click manual repair override trigger.
* **Loading State**: Medical pulse loader.
* **Empty State**: Displays "All Systems Healthy (0 Errors)".
* **Expected vs Actual**: Expected live repair execution trace. Actual reports past repair logs.

---

### 1.6 Quiz Engine Inspector (`/dashboard/quiz`)
* **Purpose**: Inspect Quiz Generator output, factual grounding score, and Quiz Guardian verdict.
* **Current UX**: Question breakdown card, grounding rating dial, and evidence passage inspector.
* **Current Backend Connection**: `POST /api/quiz/generate` & `/api/quiz/geo`.
* **Missing APIs**: Direct RAG vector distance breakdown.
* **Loading State**: Spinner during generation.
* **Empty State**: Displays "Select a topic to inspect quiz rules".
* **Expected vs Actual**: Expected real-time grounding audit. Actual displays completed evaluation reports.

---

### 1.7 AI Provider Registry (`/ai/capability-registry`)
* **Purpose**: Configure AI providers (Gemini, Groq, OpenRouter, Ollama) and capability router rules.
* **Current UX**: Grid of provider cards showing status badge, model selection, and latency.
* **Current Backend Connection**: `GET /api/providers` & `/api/models`.
* **Missing APIs**: Real-time provider ping latency chart.
* **Loading State**: Skeleton card placeholders.
* **Empty State**: Supported.
* **Expected vs Actual**: Expected live latency pinging. Actual displays status reported by AIProviderRegistry.

---

## 2. 🎯 Key UI/UX Evolving Principles for FactoryOS Control Center

1. **Answer 4 Essential OS Questions on Every Screen**:
   - **What is happening?** (Active state, job stage, CPU/Mem load)
   - **Why?** (Overseer decision log, Guardian grounding score, SRE error cause)
   - **What needs attention?** (Failed outbox uploads, disabled providers, low disk space)
   - **What should happen next?** (Recommended action, automatic retry, manual trigger)

2. **Zero Fake Content Standard**:
   - Never render mock placeholder numbers when backend API is offline.
   - Gracefully display `Loading...`, `Awaiting Telemetry`, or `Data Unavailable`.
