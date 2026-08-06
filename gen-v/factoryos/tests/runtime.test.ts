/**
 * FactoryOS v0.1 — Runtime Success Test
 *
 * Proves:
 *   ✓ Deterministic workflow execution (A → B → C)
 *   ✓ Explicit workflow state (COMPLETED)
 *   ✓ Explicit step states (all COMPLETED)
 *   ✓ 3 checkpoints created (one per step)
 *   ✓ Correct output propagation (5 → 6 → 12 → "12")
 *   ✓ Events emitted: workflow.started, step.started × 3,
 *                     step.completed × 3, checkpoint.created × 3,
 *                     workflow.completed
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { InMemoryCheckpointStore } from "../core/checkpoint/CheckpointStore";
import { RuntimeEventBus, RuntimeEventTypes } from "../core/events/RuntimeEvent";
import {
  counters,
  makeSuccessWorkflow,
} from "./helpers";

describe("FactoryOS v0.1 — Success Path", () => {
  let store: InMemoryCheckpointStore;
  let eventBus: RuntimeEventBus;
  let runtime: FactoryRuntime;

  beforeEach(() => {
    counters.reset();
    store = new InMemoryCheckpointStore();
    eventBus = new RuntimeEventBus();
    runtime = new FactoryRuntime({ checkpointStore: store, eventBus });
  });

  it("executes steps in deterministic order A → B → C", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    // Events are stored synchronously in history even though callbacks are fire-and-forget.
    // Read deterministic order from the history directly.
    const stepStartedEvents = eventBus.getByType(RuntimeEventTypes.STEP_STARTED);
    const executionOrder = stepStartedEvents.map((e) => e.payload.stepId);

    expect(run.status).toBe("COMPLETED");
    expect(executionOrder).toEqual(["worker-a", "worker-b", "worker-c"]);
  });

  it("workflow.status === COMPLETED after all steps pass", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    expect(run.status).toBe("COMPLETED");
  });

  it("all step statuses are COMPLETED", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    expect(run.steps["worker-a"].status).toBe("COMPLETED");
    expect(run.steps["worker-b"].status).toBe("COMPLETED");
    expect(run.steps["worker-c"].status).toBe("COMPLETED");
  });

  it("produces correct accumulated outputs: 5 → 6 → 12 → '12'", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    expect(run.steps["worker-a"].output).toBe(6);
    expect(run.steps["worker-b"].output).toBe(12);
    expect(run.steps["worker-c"].output).toBe("12");
  });

  it("creates exactly 3 checkpoints (one per step)", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    const checkpoints = await store.getRun(run.runId);
    expect(checkpoints).toHaveLength(3);

    const stepIds = checkpoints.map((c) => c.stepId);
    expect(stepIds).toContain("worker-a");
    expect(stepIds).toContain("worker-b");
    expect(stepIds).toContain("worker-c");

    for (const cp of checkpoints) {
      expect(cp.stepStatus).toBe("COMPLETED");
      expect(cp.checkpointId).toMatch(/^ckpt_/);
      expect(cp.workflowId).toBe("factory-test");
      expect(cp.workflowVersion).toBe("0.1.0");
      expect(cp.runId).toBe(run.runId);
    }
  });

  it("emits workflow.started, step events, checkpoint events, workflow.completed", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    // Allow setTimeout(0) callbacks to flush
    await new Promise((r) => setTimeout(r, 50));

    const history = eventBus.getHistory();
    const types = history.map((e) => e.type);

    expect(types).toContain(RuntimeEventTypes.WORKFLOW_CREATED);
    expect(types).toContain(RuntimeEventTypes.WORKFLOW_STARTED);
    expect(types).toContain(RuntimeEventTypes.WORKFLOW_COMPLETED);

    const stepStarted = eventBus.getByType(RuntimeEventTypes.STEP_STARTED);
    const stepCompleted = eventBus.getByType(RuntimeEventTypes.STEP_COMPLETED);
    const checkpointCreated = eventBus.getByType(RuntimeEventTypes.CHECKPOINT_CREATED);

    expect(stepStarted).toHaveLength(3);
    expect(stepCompleted).toHaveLength(3);
    expect(checkpointCreated).toHaveLength(3);
  });

  it("each step event carries workflowId, runId, stepId, and timestamp", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    await new Promise((r) => setTimeout(r, 50));

    const stepStarted = eventBus.getByType(RuntimeEventTypes.STEP_STARTED);
    for (const e of stepStarted) {
      expect(e.payload.workflowId).toBe("factory-test");
      expect(e.payload.runId).toBe(run.runId);
      expect(e.payload.stepId).toBeTruthy();
      expect(e.payload.timestamp).toBeTruthy();
    }
  });

  it("run has stable runId prefixed with 'run_'", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });
    expect(run.runId).toMatch(/^run_/);
  });

  it("step records include durationMs and timestamps", async () => {
    const workflow = makeSuccessWorkflow();
    const run = await runtime.start(workflow, { value: 5 });

    for (const stepId of ["worker-a", "worker-b", "worker-c"]) {
      const step = run.steps[stepId];
      expect(step.startedAt).toBeTruthy();
      expect(step.finishedAt).toBeTruthy();
      expect(step.durationMs).toBeGreaterThanOrEqual(0);
    }
  });
});
