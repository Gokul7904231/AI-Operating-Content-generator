/**
 * FactoryOS v0.1 — Workflow State
 *
 * Explicit, typed workflow lifecycle states.
 */

import type { StepRun } from "./StepState";

export type WorkflowStatus =
  | "PENDING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

/**
 * The full recorded state of one workflow run.
 *
 * `runId` is stable across resume operations for the same attempt.
 * See BACKLOG.md for parentRunId/attempt lineage (deferred).
 */
export interface WorkflowRun {
  /** Stable identifier for the workflow definition */
  workflowId: string;
  /** Workflow semver string */
  workflowVersion: string;
  /** Stable identifier for this execution */
  runId: string;
  /** Current lifecycle status */
  status: WorkflowStatus;
  /** Original input supplied at start */
  input: unknown;
  /** Per-step execution records, indexed by stepId */
  steps: Record<string, StepRun>;
  /** ISO timestamp of first start */
  createdAt: string;
  /** ISO timestamp of last status change */
  updatedAt: string;
  /** Failure metadata if the workflow has FAILED */
  failure?: {
    workflowId: string;
    runId: string;
    stepId: string;
    errorCode: string;
    errorMessage: string;
    timestamp: string;
  };
}
