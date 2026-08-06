/**
 * FactoryOS v0.1 — Step State
 *
 * Explicit, typed step lifecycle states.
 * RETRYING is intentionally excluded from Step 1 (see BACKLOG.md).
 */

export type StepStatus =
  | "PENDING"
  | "RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

/**
 * The full recorded state of one step execution within a workflow run.
 */
export interface StepRun {
  /** Stable step identifier */
  stepId: string;
  /** Current lifecycle status */
  status: StepStatus;
  /** ISO timestamp when this step started */
  startedAt?: string;
  /** ISO timestamp when this step finished */
  finishedAt?: string;
  /** Wall-clock duration in ms */
  durationMs?: number;
  /** Structured output from the worker (if COMPLETED) */
  output?: unknown;
  /** Failure record (if FAILED) */
  error?: {
    code: string;
    message: string;
  };
}
