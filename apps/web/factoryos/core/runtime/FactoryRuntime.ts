 
/**
 * FactoryOS v0.1 — FactoryRuntime
 *
 * The public API surface for FactoryOS runtime execution.
 *
 * API:
 *   const runtime = new FactoryRuntime(options);
 *   const run = await runtime.start(definition, input);
 *   await runtime.pause(runId);
 *   await runtime.resume(runId);
 *   await runtime.cancel(runId);
 *   const state = runtime.getRun(runId);
 *
 * Concurrency safety (spec §19):
 *   Each runId has an in-process execution lock.
 *   A second resume() call while a run is already RUNNING throws ConcurrentRunError.
 *
 * This file has zero ShortsFactory imports.
 */

import crypto from "crypto";
import type { WorkflowDefinition } from "../contracts/Workflow";
import type { WorkflowRun } from "../state/WorkflowState";
import { StateMachine } from "../state/StateMachine";
import type { CheckpointStore } from "../checkpoint/CheckpointStore";
import { InMemoryCheckpointStore } from "../checkpoint/CheckpointStore";
import { RuntimeEventBus, RuntimeEventTypes } from "../events/RuntimeEvent";
import { WorkflowRunner } from "./WorkflowRunner";
import {
  RunNotFoundError,
  ConcurrentRunError,
  InvalidWorkflowDefinitionError,
  WorkflowVersionMismatchError,
} from "../errors/Errors";

import { ToolRegistry } from "../tools/ToolRegistry";
import { ToolExecutor } from "../tools/ToolExecutor";

// ─── Options ──────────────────────────────────────────────────────────────────

export interface FactoryRuntimeOptions {
  checkpointStore?: CheckpointStore;
  eventBus?: RuntimeEventBus;
  toolRegistry?: ToolRegistry;
  toolExecutor?: ToolExecutor;
}

// ─── FactoryRuntime ───────────────────────────────────────────────────────────

export class FactoryRuntime {
  private readonly checkpointStore: CheckpointStore;
  readonly eventBus: RuntimeEventBus;
  readonly toolRegistry: ToolRegistry;
  readonly toolExecutor: ToolExecutor;
  private readonly runner: WorkflowRunner;

  /** Active run state, indexed by runId */
  private readonly runs = new Map<string, WorkflowRun>();

  /**
   * In-process execution lock: runId → true when actively executing.
   * Prevents concurrent resume() calls for the same run.
   */
  private readonly executionLock = new Set<string>();

  constructor(options: FactoryRuntimeOptions = {}) {
    this.checkpointStore = options.checkpointStore ?? new InMemoryCheckpointStore();
    this.eventBus = options.eventBus ?? new RuntimeEventBus();
    this.toolRegistry = options.toolRegistry ?? new ToolRegistry();
    this.toolExecutor =
      options.toolExecutor ?? new ToolExecutor(this.toolRegistry, this.eventBus);
    this.runner = new WorkflowRunner(
      this.checkpointStore,
      this.eventBus,
      this.toolExecutor
    );
  }

  // ─── start ────────────────────────────────────────────────────────────────

  /**
   * Create and begin executing a new workflow run.
   * Returns a detached WorkflowRun snapshot.
   */
  async start<TInput>(
    definition: WorkflowDefinition<TInput>,
    input: TInput,
    signal?: AbortSignal
  ): Promise<WorkflowRun> {
    this._validateWorkflowDefinition(definition as WorkflowDefinition);

    const runId = `run_${crypto.randomBytes(8).toString("hex")}`;
    const now = new Date().toISOString();

    const run: WorkflowRun = {
      workflowId: definition.id,
      workflowVersion: definition.version,
      runId,
      status: "PENDING",
      input: structuredClone(input),
      steps: {},
      createdAt: now,
      updatedAt: now,
    };

    // Initialize all step records
    for (const worker of definition.steps) {
      run.steps[worker.id] = { stepId: worker.id, status: "PENDING" };
    }

    this.runs.set(runId, run);

    this.eventBus.publish(RuntimeEventTypes.WORKFLOW_CREATED, {
      workflowId: definition.id,
      runId,
      workflowVersion: definition.version,
      timestamp: now,
    });

    // Execute synchronously (awaited by caller)
    await this._executeWithLock(definition as WorkflowDefinition, run, signal);

    return structuredClone(run);
  }

  // ─── pause ────────────────────────────────────────────────────────────────

  /**
   * Pause a RUNNING workflow.
   * Prevents the next step from starting.
   * Does not interrupt a currently executing step (mid-step cancellation is deferred — see BACKLOG.md).
   */
  async pause(runId: string): Promise<void> {
    const run = this._requireRun(runId);
    run.status = StateMachine.transitionWorkflow(run.status, "PAUSED");
    run.updatedAt = new Date().toISOString();

    this.eventBus.publish(RuntimeEventTypes.WORKFLOW_PAUSED, {
      workflowId: run.workflowId,
      runId,
      timestamp: run.updatedAt,
    });
  }

  // ─── resume ───────────────────────────────────────────────────────────────

  /**
   * Resume a PAUSED or FAILED workflow from the last valid checkpoint.
   *
   * Resume semantics (spec §15):
   *   - Completed steps are SKIPPED (checkpoint proves success)
   *   - Failed step is re-executed
   *   - Downstream steps execute only after the failed step succeeds
   */
  async resume<TInput>(
    runId: string,
    definition: WorkflowDefinition<TInput>,
    signal?: AbortSignal
  ): Promise<void> {
    this._validateWorkflowDefinition(definition as WorkflowDefinition);

    const run = this._requireRun(runId);

    // Validate identity match between definition and existing run
    if (definition.id !== run.workflowId) {
      throw new InvalidWorkflowDefinitionError(
        `Workflow ID mismatch on resume: run "${run.workflowId}" vs definition "${definition.id}"`
      );
    }
    if (definition.version !== run.workflowVersion) {
      throw new WorkflowVersionMismatchError(run.workflowVersion, definition.version);
    }

    // Validate: only PAUSED or FAILED can be resumed
    StateMachine.transitionWorkflow(run.status, "RUNNING"); // throws if invalid

    // Acquire the execution lock BEFORE any async work (prepareResume reads checkpoints).
    // This prevents concurrent resume() calls from both passing the lock check.
    // This is a synchronous check that happens before any await, guaranteeing exclusivity.
    if (this.executionLock.has(run.runId)) {
      throw new ConcurrentRunError(run.runId);
    }
    this.executionLock.add(run.runId);

    try {
      // Prepare step states from checkpoints
      await this.runner.prepareResume(definition as WorkflowDefinition, run);

      const now = new Date().toISOString();
      run.status = "FAILED"; // reset to FAILED so execute() will transition FAILED → RUNNING
      run.updatedAt = now;

      this.eventBus.publish(RuntimeEventTypes.WORKFLOW_RESUMED, {
        workflowId: run.workflowId,
        runId,
        timestamp: now,
      });

      // Call runner.execute directly (lock already held — don't go through _executeWithLock)
      await this.runner.execute(definition as WorkflowDefinition, run, { signal });
    } finally {
      this.executionLock.delete(run.runId);
    }
  }

  // ─── cancel ───────────────────────────────────────────────────────────────

  /**
   * Cancel a workflow.
   * Prevents all remaining steps from starting.
   */
  async cancel(runId: string): Promise<void> {
    const run = this._requireRun(runId);
    run.status = StateMachine.transitionWorkflow(run.status, "CANCELLED");
    run.updatedAt = new Date().toISOString();

    this.eventBus.publish(RuntimeEventTypes.WORKFLOW_CANCELLED, {
      workflowId: run.workflowId,
      runId,
      timestamp: run.updatedAt,
    });
  }

  // ─── getRun ───────────────────────────────────────────────────────────────

  /**
   * Retrieve the current state of a run.
   * Returns a detached snapshot (external mutations do NOT alter runtime state).
   */
  getRun(runId: string): WorkflowRun {
    return structuredClone(this._requireRun(runId));
  }

  /**
   * Internal/Overseer intervention helper to update active run state in-memory.
   */
  updateActiveRun(runId: string, run: WorkflowRun): void {
    const existing = this._requireRun(runId);
    existing.status = run.status;
    existing.failure = run.failure;
    existing.steps = structuredClone(run.steps);
    existing.updatedAt = new Date().toISOString();
  }

  /**
   * Retrieve all runs known to this runtime instance.
   * Returns detached snapshots.
   */
  getAllRuns(): WorkflowRun[] {
    return Array.from(this.runs.values()).map((run) => structuredClone(run));
  }

  /**
   * Expose the checkpoint store for loading persisted runs.
   * Useful for restart-recovery scenarios.
   */
  getCheckpointStore(): CheckpointStore {
    return this.checkpointStore;
  }

  // ─── Internal helpers ────────────────────────────────────────────────────

  private _validateWorkflowDefinition(definition: WorkflowDefinition): void {
    if (!definition || typeof definition !== "object") {
      throw new InvalidWorkflowDefinitionError("Workflow definition must be an object");
    }
    if (!definition.id || typeof definition.id !== "string" || definition.id.trim() === "") {
      throw new InvalidWorkflowDefinitionError("Workflow id must be a non-empty string");
    }
    if (!definition.version || typeof definition.version !== "string" || definition.version.trim() === "") {
      throw new InvalidWorkflowDefinitionError("Workflow version must be a non-empty string");
    }
    if (!Array.isArray(definition.steps)) {
      throw new InvalidWorkflowDefinitionError("Workflow steps must be an array");
    }

    const seenStepIds = new Set<string>();
    for (let i = 0; i < definition.steps.length; i++) {
      const step = definition.steps[i];
      if (!step || typeof step !== "object") {
        throw new InvalidWorkflowDefinitionError(`Step at index ${i} must be an object`);
      }
      if (!step.id || typeof step.id !== "string" || step.id.trim() === "") {
        throw new InvalidWorkflowDefinitionError(`Step at index ${i} must have a non-empty id`);
      }
      if (seenStepIds.has(step.id)) {
        throw new InvalidWorkflowDefinitionError(`Duplicate step ID "${step.id}" at index ${i}`);
      }
      seenStepIds.add(step.id);
    }
  }

  private _requireRun(runId: string): WorkflowRun {
    const run = this.runs.get(runId);
    if (!run) throw new RunNotFoundError(runId);
    return run;
  }

  /**
   * Acquire the per-run lock, execute, then release.
   * Throws ConcurrentRunError if another execution is already in flight for this runId.
   */
  private async _executeWithLock(
    definition: WorkflowDefinition,
    run: WorkflowRun,
    signal?: AbortSignal
  ): Promise<void> {
    if (this.executionLock.has(run.runId)) {
      throw new ConcurrentRunError(run.runId);
    }

    this.executionLock.add(run.runId);
    try {
      await this.runner.execute(definition, run, { signal });
    } finally {
      this.executionLock.delete(run.runId);
    }
  }
}
