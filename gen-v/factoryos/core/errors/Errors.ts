/**
 * FactoryOS v0.1 — Domain Errors
 *
 * All runtime invariant violations use typed errors, never generic `new Error("something")`.
 */

/** Thrown when a state transition is not in the allowed set */
export class InvalidStateTransitionError extends Error {
  readonly name = "InvalidStateTransitionError";
  constructor(
    public readonly from: string,
    public readonly to: string,
    public readonly target: string // "workflow" | "step"
  ) {
    super(
      `[FactoryOS] Invalid ${target} state transition: ${from} → ${to}`
    );
  }
}

/** Thrown when a workflow definition is not found in the runtime */
export class WorkflowNotFoundError extends Error {
  readonly name = "WorkflowNotFoundError";
  constructor(public readonly workflowId: string) {
    super(`[FactoryOS] Workflow not found: ${workflowId}`);
  }
}

/** Thrown when a run ID does not correspond to any tracked run */
export class RunNotFoundError extends Error {
  readonly name = "RunNotFoundError";
  constructor(public readonly runId: string) {
    super(`[FactoryOS] Run not found: ${runId}`);
  }
}

/** Thrown when a step throws an exception during execution */
export class StepExecutionError extends Error {
  readonly name = "StepExecutionError";
  constructor(
    public readonly stepId: string,
    public readonly cause: unknown
  ) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`[FactoryOS] Step "${stepId}" threw: ${message}`);
  }
}

/** Thrown on checkpoint persistence/retrieval failures */
export class CheckpointError extends Error {
  readonly name = "CheckpointError";
  constructor(message: string, public readonly cause?: unknown) {
    super(`[FactoryOS] Checkpoint error: ${message}`);
  }
}

/** Thrown when two resume/start operations race against the same runId */
export class ConcurrentRunError extends Error {
  readonly name = "ConcurrentRunError";
  constructor(public readonly runId: string) {
    super(
      `[FactoryOS] Concurrent execution attempt on run "${runId}". Only one execution path is allowed at a time.`
    );
  }
}

/** Thrown when a workflow definition is structurally invalid or contains duplicate step IDs */
export class InvalidWorkflowDefinitionError extends Error {
  readonly name = "InvalidWorkflowDefinitionError";
  constructor(public readonly reason: string) {
    super(`[FactoryOS] Invalid workflow definition: ${reason}`);
  }
}

/** Thrown when attempting to resume a workflow with a different version than the original run */
export class WorkflowVersionMismatchError extends Error {
  readonly name = "WorkflowVersionMismatchError";
  constructor(
    public readonly expectedVersion: string,
    public readonly actualVersion: string
  ) {
    super(
      `[FactoryOS] Workflow version mismatch on resume: expected "${expectedVersion}", got "${actualVersion}"`
    );
  }
}

/** Thrown when attempting to invoke a tool that is not registered */
export class ToolNotFoundError extends Error {
  readonly name = "ToolNotFoundError";
  constructor(public readonly toolId: string) {
    super(`[FactoryOS] Tool not found: "${toolId}"`);
  }
}

/** Thrown when registering a tool ID that already exists in the registry */
export class DuplicateToolRegistrationError extends Error {
  readonly name = "DuplicateToolRegistrationError";
  constructor(public readonly toolId: string) {
    super(`[FactoryOS] Tool "${toolId}" is already registered`);
  }
}

/** Thrown when tool input validation fails */
export class ToolValidationError extends Error {
  readonly name = "ToolValidationError";
  constructor(public readonly toolId: string, public readonly reason: string) {
    super(`[FactoryOS] Validation failed for tool "${toolId}": ${reason}`);
  }
}

/** Thrown when an unhandled exception occurs inside a tool execution */
export class ToolExecutionError extends Error {
  readonly name = "ToolExecutionError";
  constructor(public readonly toolId: string, public readonly cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`[FactoryOS] Tool "${toolId}" execution threw: ${message}`);
  }
}

/** Thrown when output repair fails or exceeds max attempts */
export class RepairExecutionError extends Error {
  readonly name = "RepairExecutionError";
  constructor(message: string) {
    super(`[FactoryOS] Output repair failed: ${message}`);
  }
}
