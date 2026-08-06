/**
 * FactoryOS v0.1 — State Machine
 *
 * All state transitions are validated centrally here.
 * Illegal transitions throw InvalidStateTransitionError immediately.
 * NO code outside this module may mutate workflow/step status directly.
 *
 * Workflow Transition Rules:
 *   PENDING   → RUNNING
 *   RUNNING   → COMPLETED | FAILED | PAUSED | CANCELLED
 *   PAUSED    → RUNNING | CANCELLED
 *   FAILED    → RUNNING   (only via explicit resume operation)
 *   COMPLETED → (terminal — no transitions allowed)
 *   CANCELLED → (terminal — no transitions allowed)
 *
 * Step Transition Rules:
 *   PENDING  → RUNNING | SKIPPED
 *   RUNNING  → COMPLETED | FAILED
 *   COMPLETED → (terminal)
 *   FAILED   → (terminal, within this run — resume creates new RUNNING)
 *   SKIPPED  → (terminal)
 */

import type { WorkflowStatus } from "./WorkflowState";
import type { StepStatus } from "./StepState";
import { InvalidStateTransitionError } from "../errors/Errors";

// ─── Workflow Transition Table ────────────────────────────────────────────────

const WORKFLOW_TRANSITIONS: Record<WorkflowStatus, ReadonlySet<WorkflowStatus>> = {
  PENDING:   new Set<WorkflowStatus>(["RUNNING"]),
  RUNNING:   new Set<WorkflowStatus>(["COMPLETED", "FAILED", "PAUSED", "CANCELLED"]),
  PAUSED:    new Set<WorkflowStatus>(["RUNNING", "CANCELLED"]),
  FAILED:    new Set<WorkflowStatus>(["RUNNING"]),
  COMPLETED: new Set<WorkflowStatus>([]),   // terminal
  CANCELLED: new Set<WorkflowStatus>([]),   // terminal
};

// ─── Step Transition Table ────────────────────────────────────────────────────

const STEP_TRANSITIONS: Record<StepStatus, ReadonlySet<StepStatus>> = {
  PENDING:   new Set<StepStatus>(["RUNNING", "SKIPPED"]),
  RUNNING:   new Set<StepStatus>(["COMPLETED", "FAILED"]),
  COMPLETED: new Set<StepStatus>([]),   // terminal
  FAILED:    new Set<StepStatus>([]),   // terminal (resume re-creates step in PENDING)
  SKIPPED:   new Set<StepStatus>([]),   // terminal
};

// ─── StateMachine ─────────────────────────────────────────────────────────────

export const StateMachine = {
  /**
   * Validate and return the next workflow status.
   * Throws InvalidStateTransitionError if the transition is illegal.
   */
  transitionWorkflow(from: WorkflowStatus, to: WorkflowStatus): WorkflowStatus {
    const allowed = WORKFLOW_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
      throw new InvalidStateTransitionError(from, to, "workflow");
    }
    return to;
  },

  /**
   * Validate and return the next step status.
   * Throws InvalidStateTransitionError if the transition is illegal.
   */
  transitionStep(from: StepStatus, to: StepStatus): StepStatus {
    const allowed = STEP_TRANSITIONS[from];
    if (!allowed || !allowed.has(to)) {
      throw new InvalidStateTransitionError(from, to, "step");
    }
    return to;
  },

  /** Returns true if the workflow status is terminal (no further transitions). */
  isWorkflowTerminal(status: WorkflowStatus): boolean {
    return status === "COMPLETED" || status === "CANCELLED";
  },

  /** Returns true if the step status is terminal within its current run. */
  isStepTerminal(status: StepStatus): boolean {
    return status === "COMPLETED" || status === "FAILED" || status === "SKIPPED";
  },

  /**
   * Lists all allowed next statuses for a given workflow status.
   * Useful for debugging and documentation.
   */
  allowedWorkflowTransitions(from: WorkflowStatus): WorkflowStatus[] {
    return Array.from(WORKFLOW_TRANSITIONS[from] ?? []);
  },

  /**
   * Lists all allowed next statuses for a given step status.
   */
  allowedStepTransitions(from: StepStatus): StepStatus[] {
    return Array.from(STEP_TRANSITIONS[from] ?? []);
  },
};
