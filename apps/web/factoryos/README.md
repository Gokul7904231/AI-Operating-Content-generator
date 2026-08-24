# FactoryOS v0.1 — Runtime Kernel

**Version**: FactoryOS v0.1  
**Status**: Step 1 — Core Runtime Kernel  
**Located at**: `gen-v/factoryos/`

---

## What FactoryOS Runtime Is

FactoryOS is an execution kernel for deterministic workflow automation. It provides:

- **Typed workflow definitions** with stable IDs and versioning
- **Generic Worker contracts** that accept any typed input/output
- **Explicit state machines** for workflow and step lifecycle
- **Checkpoint persistence** to enable resume-from-failure
- **Structured runtime events** for observability
- **Failure propagation** that stops downstream work
- **Concurrency protection** via per-run execution locks
- **Production orchestration layer** for autonomous quiz generation, validation, rendering, and delivery

> FactoryOS core has **zero dependencies** on ShortsFactory, LLMs, video pipelines, databases, or network services. The production layer (`factoryos/core/production`) adds those capabilities as optional adapters.

---

## Architecture Overview

```
User / Application
       ↓
WorkflowDefinition  (contracts/Workflow.ts)
       ↓
FactoryRuntime      (runtime/FactoryRuntime.ts)  — public API, concurrency lock
       ↓
WorkflowRunner      (runtime/WorkflowRunner.ts)  — step loop, skip logic
       ↓
StateMachine        (state/StateMachine.ts)       — validated transitions
       ↓
Worker              (contracts/Worker.ts)          — step execution
       ↓
CheckpointStore     (checkpoint/CheckpointStore.ts) — persistence
       ↓
RuntimeEventBus     (events/RuntimeEvent.ts)      — fire-and-forget telemetry
```

### Production Layer (Optional)

```
ProductionRunner → AutonomousScheduler → ProductionStateMachine
       ↓
QuizGeneratorAdapter → QuizGuardian → VideoPipelineAdapter → DriveDeliveryAdapter
```

---

## Main Workflow

1. **Plan**: `AutonomousScheduler.planDailySchedule()` creates `ProductionJob` records with `PLANNED` status.
2. **Generate**: `ProductionRunner` transitions the job to `WAITING` → `GENERATING` and invokes `QuizGeneratorAdapter`.
3. **Validate**: `QuizGuardian` evaluates quiz quality and factuality using `QuizEvidenceVerifier`.
4. **Repair**: If the Guardian returns `REPAIR`, the quiz is regenerated and re-validated.
5. **Render**: `VideoPipelineAdapter` produces an MP4 artifact.
6. **Output Validation**: `OutputArtifactValidator` checks the rendered file.
7. **Deliver**: `DriveDeliveryAdapter` uploads to Google Drive or retains in local outbox if offline.
8. **Complete**: Job reaches `COMPLETED` status with verified delivery.

---

## Local vs Network Capability Limits

| Capability | Local / Offline | Network Required |
|---|---|---|
| Workflow execution | ✅ | — |
| Checkpoint persistence | ✅ (InMemoryStore) | ✅ (DurableStore) |
| Quiz generation | ✅ (mock provider) | ✅ (real LLM provider) |
| Video rendering | ✅ (FFmpeg) | — |
| Google Drive delivery | ✅ (local outbox) | ✅ (real upload) |

- **Offline mode**: Jobs render locally and queue in `data/outbox/`. Delivery resumes automatically when network is restored.
- **Online mode**: Full end-to-end pipeline with live Google Drive upload and verification.

---

## Installation

```bash
# From gen-v/
npm install
```

### Google Drive Setup (Optional)

Configure one of the following authentication modes:

**Service Account (recommended for server-to-server):**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

**OAuth Client Credentials:**
```bash
export GOOGLE_DRIVE_CLIENT_ID="your-client-id"
export GOOGLE_DRIVE_CLIENT_SECRET="your-client-secret"
export GOOGLE_DRIVE_REFRESH_TOKEN="your-refresh-token"
```

Optional folder targeting:
```bash
export GOOGLE_DRIVE_FOLDER_ID="target-folder-id"
```

---

## Running

```bash
# Run all FactoryOS tests
npm run factoryos:test

# Run demo workflow
npm run factoryos:demo

# Run production demo
npm run factoryos:production:demo
```

---

## Testing

```bash
# Full test suite
npm run factoryos:test

# Type check
npm run factoryos:typecheck

# RAG evaluation benchmark
npm run factoryos:eval:rag

# Quiz Guardian evaluation benchmark
npm run factoryos:eval:quiz
```

### Live E2E Tests

Google Drive live upload tests (`factoryos/tests/live-drive-e2e-real.test.ts`) are **automatically skipped** when credentials are not configured.

### FFmpeg Proof Test

The real FFmpeg proof test (`factoryos/tests/real-ffmpeg-proof.test.ts`) is **automatically skipped** when `ffmpeg` is not available in the system PATH.

---

## Crash Recovery

1. **Checkpoint Resume**: `WorkflowRunner.prepareResume()` restores step states from valid `COMPLETED` checkpoints.
2. **Outbox Recovery**: `DriveDeliveryAdapter` retains failed uploads in `data/outbox/` and retries on the next execution cycle.
3. **Retry**: `ProductionOverseer.retryJob()` transitions a `FAILED` job through `RETRY_WAIT` back to `WAITING` for re-execution.

---

## Known Limitations

- **InMemoryCheckpointStore does not survive process restart.** Durability is deferred.
- **Run state (WorkflowRun map) lives in the FactoryRuntime instance.** If the process restarts, the run must be re-registered. The checkpoint data persists if an external store is used.
- **Mid-step cooperative cancellation** is not implemented. Pause/cancel prevent the next step from starting but cannot interrupt a currently executing worker.
- **Sequential execution only.** DAG / parallel step execution is deferred.
- **No retry policies.** Retries are deferred.
- **Quiz grounding is self-referential in v0.1.** `SELF_REFERENTIAL_GROUNDING = YES`, `INDEPENDENT_EVIDENCE_SOURCE = NONE`. Evidence is seeded from the generated quiz payload itself for self-consistency checking, not from an independent external factual corpus. While structural validation, duplicate detection, semantic ambiguity detection, NLI self-consistency validation, and RAG retrieval architecture are fully operational, independent external factual grounding must be listed as a v0.1 limitation.

---

## How to Run Tests

```bash
# From gen-v/
npm run factoryos:test
```

Expected output:

```
FactoryOS v0.1 Runtime Verification

✓ deterministic workflow execution
✓ state propagation
✓ checkpoint creation
✓ failure propagation
✓ downstream execution blocked
✓ resume from checkpoint
✓ completed worker not re-executed
✓ invalid state transition rejected
✓ concurrent resume protected

STEP 1: PASS
```

---

## State Model

### Workflow Status

```
PENDING → RUNNING → COMPLETED (terminal)
                 → FAILED
                 → PAUSED
                 → CANCELLED (terminal)

PAUSED  → RUNNING
        → CANCELLED

FAILED  → RUNNING  (via resume only)
```

### Step Status

```
PENDING → RUNNING → COMPLETED (terminal)
                 → FAILED    (terminal)
         → SKIPPED            (terminal, on resume of completed step)
```

---

## Checkpoint / Resume Behavior

1. A checkpoint is written **after** a step transitions to COMPLETED.
2. Checkpoints contain: `checkpointId`, `workflowId`, `workflowVersion`, `runId`, `stepId`, `stepStatus`, `output`, `createdAt`.
3. On `resume(runId)`:
   - Steps with a valid COMPLETED checkpoint → **SKIPPED** (not re-executed).
   - The failed step → reset to **PENDING**, re-executed.
   - Subsequent steps → reset to **PENDING**, executed only after the failed step succeeds.

---

## Known Limitations

- **InMemoryCheckpointStore does not survive process restart.** Durability is deferred.
- **Run state (WorkflowRun map) lives in the FactoryRuntime instance.** If the process restarts, the run must be re-registered. The checkpoint data persists if an external store is used.
- **Mid-step cooperative cancellation** is not implemented. Pause/cancel prevent the next step from starting but cannot interrupt a currently executing worker.
- **Sequential execution only.** DAG / parallel step execution is deferred.
- **No retry policies.** Retries are deferred.
