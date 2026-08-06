/**
 * FactoryOS v0.1 — Failure Propagation Test
 *
 * Proves:
 *   ✓ A → COMPLETED
 *   ✓ B → FAILED (structured result failure)
 *   ✓ C → PENDING (not executed)
 *   ✓ workflow.status === FAILED
 *   ✓ checkpoint A exists
 *   ✓ no successful checkpoint B
 *   ✓ no checkpoint C
 *   ✓ C execution counter === 0
 *   ✓ failure metadata points to B
 *   ✓ Same test with B throwing an exception (not just returning failure)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { InMemoryCheckpointStore } from "../core/checkpoint/CheckpointStore";
import { RuntimeEventBus, RuntimeEventTypes } from "../core/events/RuntimeEvent";
import {
  counters,
  makeFailureWorkflow,
  makeThrowingWorkflow,
} from "./helpers";

describe("FactoryOS v0.1 — Failure Propagation (structured result)", () => {
  let store: InMemoryCheckpointStore;
  let eventBus: RuntimeEventBus;
  let runtime: FactoryRuntime;

  beforeEach(() => {
    counters.reset();
    store = new InMemoryCheckpointStore();
    eventBus = new RuntimeEventBus();
    runtime = new FactoryRuntime({ checkpointStore: store, eventBus });
  });

  it("workflow.status === FAILED when B returns failure", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.status).toBe("FAILED");
  });

  it("A === COMPLETED", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.steps["worker-a"].status).toBe("COMPLETED");
  });

  it("B === FAILED", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.steps["worker-b"].status).toBe("FAILED");
    expect(run.steps["worker-b"].error).toBeTruthy();
    // The error code is preserved from the structured WorkerResult failure
    expect(run.steps["worker-b"].error?.code).toContain("INTENTIONAL_FAILURE");
  });

  it("C === PENDING (not executed)", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.steps["worker-c"].status).toBe("PENDING");
  });

  it("C execution counter === 0", async () => {
    const workflow = makeFailureWorkflow();
    await runtime.start(workflow, { value: 5 });
    expect(counters.c).toBe(0);
  });

  it("checkpoint A exists and is COMPLETED", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    const cpA = await store.getLatest(run.runId, "worker-a");
    expect(cpA).not.toBeNull();
    expect(cpA!.stepStatus).toBe("COMPLETED");
  });

  it("no successful checkpoint B", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    const cpB = await store.getLatest(run.runId, "worker-b");
    expect(cpB).toBeNull(); // B failed before checkpoint was written
  });

  it("no checkpoint C", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    const cpC = await store.getLatest(run.runId, "worker-c");
    expect(cpC).toBeNull();
  });

  it("failure metadata points to B", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.failure).toBeTruthy();
    expect(run.failure!.stepId).toBe("worker-b");
    expect(run.failure!.workflowId).toBe("factory-test");
    expect(run.failure!.runId).toBe(run.runId);
  });

  it("step.failed event emitted for B", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    await new Promise((r) => setTimeout(r, 50));

    const failedEvents = eventBus.getByType(RuntimeEventTypes.STEP_FAILED);
    expect(failedEvents).toHaveLength(1);
    expect(failedEvents[0].payload.stepId).toBe("worker-b");
  });

  it("workflow.failed event emitted", async () => {
    const workflow = makeFailureWorkflow();
    await runtime.start(workflow, { value: 5 });

    await new Promise((r) => setTimeout(r, 50));

    const failedEvents = eventBus.getByType(RuntimeEventTypes.WORKFLOW_FAILED);
    expect(failedEvents).toHaveLength(1);
  });

  it("total checkpoints === 1 (only A)", async () => {
    const workflow = makeFailureWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    const all = await store.getRun(run.runId);
    expect(all).toHaveLength(1);
    expect(all[0].stepId).toBe("worker-a");
  });
});

// ─── Same tests but B throws instead of returning a structured failure ─────────

describe("FactoryOS v0.1 — Failure Propagation (thrown exception)", () => {
  let store: InMemoryCheckpointStore;
  let eventBus: RuntimeEventBus;
  let runtime: FactoryRuntime;

  beforeEach(() => {
    counters.reset();
    store = new InMemoryCheckpointStore();
    eventBus = new RuntimeEventBus();
    runtime = new FactoryRuntime({ checkpointStore: store, eventBus });
  });

  it("workflow.status === FAILED when B throws", async () => {
    const workflow = makeThrowingWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.status).toBe("FAILED");
  });

  it("B === FAILED after throw", async () => {
    const workflow = makeThrowingWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.steps["worker-b"].status).toBe("FAILED");
  });

  it("C NOT executed after B throws", async () => {
    const workflow = makeThrowingWorkflow();
    await runtime.start(workflow, { value: 5 });
    expect(counters.c).toBe(0);
  });

  it("no checkpoint B or C when B throws", async () => {
    const workflow = makeThrowingWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(await store.getLatest(run.runId, "worker-b")).toBeNull();
    expect(await store.getLatest(run.runId, "worker-c")).toBeNull();
  });
});
