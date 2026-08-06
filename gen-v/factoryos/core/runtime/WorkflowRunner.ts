 
/**
 * FactoryOS v0.1 — WorkflowRunner
 *
 * Executes a workflow definition against a WorkflowRun state object.
 * Deterministic sequential execution for Step 1.
 *
 * Execution contract:
 *   For each step:
 *     1. If step has a valid COMPLETED checkpoint → SKIPPED
 *     2. Transition step: PENDING → RUNNING
 *     3. Execute Worker.execute()
 *     4. On success:
 *          a. Transition step: RUNNING → COMPLETED
 *          b. Persist checkpoint AFTER success (spec §13)
 *          c. Emit step.completed
 *     5. On failure:
 *          a. Transition step: RUNNING → FAILED
 *          b. Transition workflow: RUNNING → FAILED
 *          c. DO NOT execute remaining steps (spec §14)
 *          d. Emit step.failed + workflow.failed
 *          e. Return immediately
 *
 * Pause / Cancel semantics (spec §20):
 *   PAUSED: checked before each step starts. Stops further steps.
 *   CANCELLED: checked before each step starts. Stops further steps.
 *
 * This file has zero ShortsFactory imports.
 */

import crypto from "crypto";
import type { WorkflowDefinition } from "../contracts/Workflow";
import type { Worker, WorkerContext } from "../contracts/Worker";
import type { WorkflowRun } from "../state/WorkflowState";
import type { StepRun } from "../state/StepState";
import { StateMachine } from "../state/StateMachine";
import type { CheckpointStore, StepCheckpoint } from "../checkpoint/CheckpointStore";
import { RuntimeEventBus, RuntimeEventTypes } from "../events/RuntimeEvent";
import { StepExecutionError } from "../errors/Errors";

import type { ToolExecutor } from "../tools/ToolExecutor";

export interface RunnerOptions {
  /** If provided, steps will cooperatively check this signal */
  signal?: AbortSignal;
}

export class WorkflowRunner {
  constructor(
    private readonly checkpointStore: CheckpointStore,
    private readonly eventBus: RuntimeEventBus,
    private readonly toolExecutor?: ToolExecutor
  ) {}

  /**
   * Execute a workflow from start (or resume from checkpoint).
   *
   * The `run` object is mutated in place — FactoryRuntime owns it.
   * Mutations happen through StateMachine transitions only.
   */
  async execute<TInput>(
    definition: WorkflowDefinition<TInput>,
    run: WorkflowRun,
    options: RunnerOptions = {}
  ): Promise<void> {
    const { signal } = options;
    const runStartMs = Date.now();

    // Transition workflow: PENDING/FAILED → RUNNING
    run.status = StateMachine.transitionWorkflow(run.status, "RUNNING");
    run.updatedAt = new Date().toISOString();

    this.eventBus.publish(RuntimeEventTypes.WORKFLOW_STARTED, {
      workflowId: run.workflowId,
      runId: run.runId,
      timestamp: run.updatedAt,
    });

    // ── Step execution loop ────────────────────────────────────────────────────
    for (const worker of definition.steps) {
      // Check for cooperative abort / pause / cancel BEFORE each step
      if (signal?.aborted) {
        this._cancelRemainingSteps(run, worker.id, definition.steps);
        run.status = StateMachine.transitionWorkflow(run.status, "CANCELLED");
        run.updatedAt = new Date().toISOString();
        this.eventBus.publish(RuntimeEventTypes.WORKFLOW_CANCELLED, {
          workflowId: run.workflowId,
          runId: run.runId,
          timestamp: run.updatedAt,
        });
        return;
      }

      if (run.status === "PAUSED") {
        // Don't execute further steps while paused
        return;
      }

      if (run.status === "CANCELLED") {
        return;
      }

      // Ensure step record exists
      if (!run.steps[worker.id]) {
        run.steps[worker.id] = {
          stepId: worker.id,
          status: "PENDING",
        };
      }

      const stepRun = run.steps[worker.id];

      // ── Resume: skip completed steps ─────────────────────────────────────
      if (stepRun.status === "COMPLETED") {
        // Valid checkpoint must exist matching workflowId, workflowVersion, runId, stepId, and COMPLETED status
        const checkpoint = await this.checkpointStore.getLatest(run.runId, worker.id);
        if (
          checkpoint &&
          checkpoint.workflowId === run.workflowId &&
          checkpoint.workflowVersion === run.workflowVersion &&
          checkpoint.runId === run.runId &&
          checkpoint.stepId === worker.id &&
          checkpoint.stepStatus === "COMPLETED"
        ) {
          // Transition: COMPLETED → SKIPPED is NOT a real transition.
          // A completed step stays COMPLETED. We simply emit skip and continue.
          this.eventBus.publish(RuntimeEventTypes.STEP_SKIPPED, {
            workflowId: run.workflowId,
            runId: run.runId,
            stepId: worker.id,
            timestamp: new Date().toISOString(),
          });
          continue;
        }
        // Checkpoint missing or mismatch — treat as needing re-execution
        // Reset to PENDING so the step re-runs safely
        stepRun.status = "PENDING";
      }

      // ── Transition: PENDING → RUNNING ─────────────────────────────────────
      const stepStartedAt = new Date().toISOString();
      const stepT0 = Date.now();

      stepRun.status = StateMachine.transitionStep(stepRun.status, "RUNNING");
      stepRun.startedAt = stepStartedAt;
      run.updatedAt = stepStartedAt;

      this.eventBus.publish(RuntimeEventTypes.STEP_STARTED, {
        workflowId: run.workflowId,
        runId: run.runId,
        stepId: worker.id,
        timestamp: stepStartedAt,
      });

      // ── Build accumulated outputs ─────────────────────────────────────────
      const accumulated: Record<string, unknown> = {};
      for (const [sid, sr] of Object.entries(run.steps)) {
        if (sr.status === "COMPLETED" && sr.output !== undefined) {
          accumulated[sid] = sr.output;
        }
      }

      const context: WorkerContext<TInput, Record<string, unknown>> = {
        workflowId: run.workflowId,
        runId: run.runId,
        stepId: worker.id,
        input: run.input as TInput,
        accumulated,
        signal,
        tools: this.toolExecutor
          ? (toolId, toolInput) => {
              if (worker.allowedTools && !worker.allowedTools.includes(toolId)) {
                return Promise.resolve({
                  success: false,
                  error: {
                    code: "TOOL_NOT_ALLOWED",
                    message: `[Tool Security] Tool "${toolId}" is not in the allowlist for worker "${worker.id}"`,
                  },
                });
              }
              return this.toolExecutor!.execute(toolId, toolInput, {
                workflowId: run.workflowId,
                runId: run.runId,
                stepId: worker.id,
                toolId,
                signal,
              });
            }
          : undefined,
      };

      // ── Execute Worker ────────────────────────────────────────────────────
      try {
        let result;
        try {
          result = await (worker as Worker<TInput, unknown, Record<string, unknown>>).execute(
            context,
            signal
          );
        } catch (thrown) {
          // Normalize unhandled exceptions into structured failures
          throw new StepExecutionError(worker.id, thrown);
        }

        if (!result.success) {
          // Worker returned a structured failure (not a throw)
          // Preserve the original error code and message from the worker's result
          const errCode = result.error?.code ?? "WORKER_FAILURE";
          const errMsg = result.error?.message ?? "Worker returned success=false";
          throw new StepExecutionError(
            worker.id,
            Object.assign(new Error(errMsg), { code: errCode })
          );
        }

        // ── SUCCESS PATH ─────────────────────────────────────────────────────
        const stepFinishedAt = new Date().toISOString();
        const stepDurationMs = Date.now() - stepT0;

        // 1. Transition step: RUNNING → COMPLETED
        stepRun.status = StateMachine.transitionStep(stepRun.status, "COMPLETED");
        stepRun.finishedAt = stepFinishedAt;
        stepRun.durationMs = stepDurationMs;
        stepRun.output = result.output;
        run.updatedAt = stepFinishedAt;

        // 2. Persist checkpoint AFTER step is COMPLETED (spec §13)
        const checkpoint: StepCheckpoint = {
          checkpointId: `ckpt_${crypto.randomBytes(8).toString("hex")}`,
          workflowId: run.workflowId,
          workflowVersion: run.workflowVersion,
          runId: run.runId,
          stepId: worker.id,
          stepStatus: "COMPLETED",
          output: result.output,
          createdAt: stepFinishedAt,
        };
        await this.checkpointStore.save(checkpoint);

        // 3. Emit events
        this.eventBus.publish(RuntimeEventTypes.CHECKPOINT_CREATED, {
          workflowId: run.workflowId,
          runId: run.runId,
          stepId: worker.id,
          checkpointId: checkpoint.checkpointId,
          timestamp: stepFinishedAt,
        });

        this.eventBus.publish(RuntimeEventTypes.STEP_COMPLETED, {
          workflowId: run.workflowId,
          runId: run.runId,
          stepId: worker.id,
          durationMs: stepDurationMs,
          timestamp: stepFinishedAt,
        });

      } catch (err: unknown) {
        // ── FAILURE PATH ─────────────────────────────────────────────────────
        const stepFinishedAt = new Date().toISOString();
        const stepDurationMs = Date.now() - stepT0;
        const isStepExecError = err instanceof StepExecutionError;
        const errorMessage = err instanceof Error ? err.message : String(err);
        // For structured failures: extract the original code from the cause
        const causeCode =
          isStepExecError &&
          err.cause instanceof Error &&
          (err.cause as Error & { code?: string }).code
            ? (err.cause as Error & { code?: string }).code!
            : null;
        const errorCode = causeCode ?? (isStepExecError ? "STEP_EXECUTION_ERROR" : "UNKNOWN");

        // 1. Transition step: RUNNING → FAILED
        stepRun.status = StateMachine.transitionStep(stepRun.status, "FAILED");
        stepRun.finishedAt = stepFinishedAt;
        stepRun.durationMs = stepDurationMs;
        stepRun.error = { code: errorCode, message: errorMessage };
        run.updatedAt = stepFinishedAt;

        // 2. Emit step failure event
        this.eventBus.publish(RuntimeEventTypes.STEP_FAILED, {
          workflowId: run.workflowId,
          runId: run.runId,
          stepId: worker.id,
          durationMs: stepDurationMs,
          errorCode,
          errorMessage,
          timestamp: stepFinishedAt,
        });

        // 3. Transition workflow: RUNNING → FAILED
        run.status = StateMachine.transitionWorkflow(run.status, "FAILED");
        run.failure = {
          workflowId: run.workflowId,
          runId: run.runId,
          stepId: worker.id,
          errorCode,
          errorMessage,
          timestamp: stepFinishedAt,
        };
        run.updatedAt = stepFinishedAt;

        // 4. Emit workflow failure event
        this.eventBus.publish(RuntimeEventTypes.WORKFLOW_FAILED, {
          workflowId: run.workflowId,
          runId: run.runId,
          stepId: worker.id,
          errorCode,
          errorMessage,
          timestamp: stepFinishedAt,
        });

        // 5. DO NOT execute remaining steps (spec §14)
        return;
      }
    } // end step loop

    // Check if workflow was PAUSED or CANCELLED during step execution
    if (run.status === "PAUSED" || run.status === "CANCELLED") {
      return;
    }

    // ── All steps completed successfully ─────────────────────────────────────
    const completedAt = new Date().toISOString();
    run.status = StateMachine.transitionWorkflow(run.status, "COMPLETED");
    run.updatedAt = completedAt;

    this.eventBus.publish(RuntimeEventTypes.WORKFLOW_COMPLETED, {
      workflowId: run.workflowId,
      runId: run.runId,
      durationMs: Date.now() - runStartMs,
      timestamp: completedAt,
    });
  }

  /**
   * Prepare a run for resume.
   * Restores step statuses from checkpoints.
   * Steps with a valid COMPLETED checkpoint stay COMPLETED.
   * The failed step and all subsequent steps are reset to PENDING.
   */
  async prepareResume(
    definition: WorkflowDefinition,
    run: WorkflowRun
  ): Promise<void> {
    const checkpoints = await this.checkpointStore.getRun(run.runId);

    // A checkpoint is valid ONLY when workflowId, workflowVersion, runId, and stepStatus all match
    const validCheckpoints = checkpoints.filter(
      (c) =>
        c.workflowId === definition.id &&
        c.workflowVersion === definition.version &&
        c.runId === run.runId &&
        c.stepStatus === "COMPLETED"
    );

    // Index latest valid checkpoint per stepId
    const latestValidByStep = new Map<string, StepCheckpoint>();
    for (const cp of validCheckpoints) {
      latestValidByStep.set(cp.stepId, cp);
    }

    let foundFailed = false;

    for (const worker of definition.steps) {
      if (!run.steps[worker.id]) {
        run.steps[worker.id] = { stepId: worker.id, status: "PENDING" };
      }

      const stepRun = run.steps[worker.id];

      if (!foundFailed && latestValidByStep.has(worker.id)) {
        // Restore output from valid checkpoint
        const checkpoint = latestValidByStep.get(worker.id)!;
        stepRun.status = "COMPLETED";
        stepRun.output = checkpoint.output;
      } else {
        // Failed step + all subsequent → PENDING for re-execution
        foundFailed = true;
        stepRun.status = "PENDING";
        stepRun.error = undefined;
        stepRun.startedAt = undefined;
        stepRun.finishedAt = undefined;
        stepRun.durationMs = undefined;
        stepRun.output = undefined;
      }
    }
  }

  /**
   * Marks all steps from `fromStepId` onwards as SKIPPED when a cooperative
   * abort/cancel interrupts the workflow mid-flight. Remaining PENDING steps
   * are not executed; transitioning them to SKIPPED keeps the step state
   * machine valid and accurately reflects that they were deliberately
   * bypassed by cancellation rather than simply left unstarted.
   */
  private _cancelRemainingSteps(
    run: WorkflowRun,
    fromStepId: string,
    allSteps: ReadonlyArray<{ id: string }>
  ): void {
    let found = false;
    for (const step of allSteps) {
      if (step.id === fromStepId) {
        found = true;
        continue;
      }
      if (found && run.steps[step.id]?.status === "PENDING") {
        run.steps[step.id].status = "SKIPPED";
      }
    }
  }
}
