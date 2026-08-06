# FactoryOS Backlog

## Deferred After v0.1 Step 1

This file documents all items intentionally excluded from FactoryOS v0.1 Step 1.

---

### Infrastructure

- **Distributed checkpoint persistence** — SQLite, Redis, or Postgres-backed CheckpointStore.
  The current InMemoryCheckpointStore is not durable across process restarts.
  Future: `SQLiteCheckpointStore`, `RedisCheckpointStore`.

- **Distributed execution locks** — The current per-run lock is in-process only.
  In a multi-instance deployment, a distributed lock (Redis SETNX, etcd, ZooKeeper) is required.
  Concurrent resume in a distributed system would otherwise cause split-brain.

- **Run state persistence** — WorkflowRun objects are currently in-memory per FactoryRuntime instance.
  A durable run store is required for true restart recovery.
  The checkpoint data survives (if a durable store is used) but the WorkflowRun metadata does not.

---

### Execution Model

- **DAG / parallel step execution** — Step 1 is sequential only.
  The existing `DAGRunner` in `gen-v/lib/scheduler/DAGRunner.ts` demonstrates the pattern.
  Future: FactoryRuntime should support `dependsOn` arrays per step.

- **Mid-step cooperative cancellation** — Currently, pause/cancel prevent the NEXT step from starting
  but cannot interrupt a running worker mid-execution.
  Future: Pass `AbortController.signal` through the worker and allow workers to respect it.

- **Timeout per step** — Workers have no timeout guard in Step 1.
  Future: `stepTimeout` on WorkflowStep with AbortController integration.

- **Advanced retry policies** — Step 1 has no retry. Future:
  - `maxRetries: number`
  - `backoff: "exponential" | "fixed"`
  - `retryOn: string[]` (error codes)
  - Step status: `RETRYING`

- **Dead-letter handling** — Permanently failed steps (exceeded retries) should be routed to a dead-letter queue.

---

### Idempotency

- **Explicit idempotency keys** — Step 1 uses checkpoint presence + completed status as proxy for idempotency.
  This does NOT guarantee that external side effects (API calls, file writes) are idempotent.
  Future: Workers should declare idempotency keys; the runtime should enforce deduplication.

- **Transactional side-effect handling** — Future: two-phase commit pattern for checkpoint + side effect.

---

### Intelligence Layer

- **LLM Workers** — Workers that call LLMs (OpenAI, Gemini, Groq, etc.)
- **Tool registry** — Dynamic capability lookup for LLM tools
- **RAG (Retrieval-Augmented Generation)** integration
- **GraphRAG / Knowledge Graph** integration
- **Overseer intelligence** — Meta-workflow agent that plans and schedules workflows
- **Guardian agents** — Policy enforcement agents per step
- **AI planning** — Dynamic workflow construction at runtime

---

### Observability

- **OpenTelemetry integration** — Structured traces with span hierarchy per workflow/step
- **Langfuse integration** — LLM trace logging
- **Metrics registry** — step duration histograms, failure rates, throughput
- **Dead-letter alerting**

---

### ShortsFactory Migration

- **ShortsFactory as FactoryOS consumer** — The existing `WorkflowRuntime` (video pipeline)
  should eventually become a consumer of `FactoryRuntime`.
  This migration is deferred to a later phase to avoid breaking changes.
  Steps:
  1. Define ShortsFactory workers as `FactoryOS.Worker` implementations
  2. Replace `WorkflowRuntime.run()` with `FactoryRuntime.start()`
  3. Replace `CheckpointDB` with `FactoryOS.CheckpointStore` implementation backed by SQLite
  4. Replace step-registry executors with typed `Worker` objects

---

### Cloud / Deployment

- **Temporal migration** — Replace in-process execution with Temporal.io for distributed durability
- **LangGraph migration** — Optional: express workflows as LangGraph state machines
- **Multi-tenant isolation** — Per-tenant run isolation and resource quotas
- **Authentication** — Workflow submission authorization
- **Billing** — Per-workflow cost tracking

---

### Content / Platform

- **YouTube logic** — Not part of FactoryOS core
- **Content compliance** — Deferred to Guardian agent layer
- **Browser automation** — MCP integration deferred
- **UI redesign** — Not part of FactoryOS kernel
