 
/**
 * FactoryOS v0.1 — Runtime Events
 *
 * Structured telemetry events emitted by the FactoryOS runtime.
 * Events are OBSERVABILITY — they do not drive state.
 * State is authoritative; events are a secondary signal.
 *
 * Event failure rule (spec §18):
 *   A listener failure must NOT corrupt workflow state.
 *   The RuntimeEventBus catches and logs subscriber errors.
 *
 * Reuse strategy:
 *   We define FactoryOS-specific event types here.
 *   The underlying dispatch uses the same fire-and-forget pattern
 *   as the existing EventBus (gen-v/ai/event-bus.ts) but this module
 *   is intentionally self-contained to avoid coupling FactoryOS core
 *   to ShortsFactory's EventBus singleton.
 */

import crypto from "crypto";

// ─── Event Type Literals ───────────────────────────────────────────────────────

export const RuntimeEventTypes = {
  WORKFLOW_CREATED:   "workflow.created",
  WORKFLOW_STARTED:   "workflow.started",
  WORKFLOW_PAUSED:    "workflow.paused",
  WORKFLOW_RESUMED:   "workflow.resumed",
  WORKFLOW_COMPLETED: "workflow.completed",
  WORKFLOW_FAILED:    "workflow.failed",
  WORKFLOW_CANCELLED: "workflow.cancelled",

  STEP_STARTED:    "step.started",
  STEP_COMPLETED:  "step.completed",
  STEP_FAILED:     "step.failed",
  STEP_SKIPPED:    "step.skipped",

  CHECKPOINT_CREATED: "checkpoint.created",

  TOOL_STARTED:   "tool.started",
  TOOL_COMPLETED: "tool.completed",
  TOOL_FAILED:    "tool.failed",
} as const;

export type RuntimeEventType = (typeof RuntimeEventTypes)[keyof typeof RuntimeEventTypes];

// ─── Event Payloads ────────────────────────────────────────────────────────────

interface BasePayload {
  workflowId: string;
  runId: string;
  timestamp: string;
}

interface StepPayload extends BasePayload {
  stepId: string;
  durationMs?: number;
}

interface FailurePayload extends StepPayload {
  errorCode?: string;
  errorMessage?: string;
}

type WorkflowCreatedPayload    = BasePayload & { workflowVersion: string };
type WorkflowStartedPayload    = BasePayload;
type WorkflowPausedPayload     = BasePayload;
type WorkflowResumedPayload    = BasePayload;
type WorkflowCompletedPayload  = BasePayload & { durationMs: number };
type WorkflowFailedPayload     = BasePayload & { stepId: string; errorCode?: string; errorMessage?: string };
type WorkflowCancelledPayload  = BasePayload;
type StepStartedPayload        = StepPayload;
type StepCompletedPayload      = StepPayload;
type StepFailedPayload         = FailurePayload;
type StepSkippedPayload        = StepPayload;
type CheckpointCreatedPayload  = BasePayload & { stepId: string; checkpointId: string };

type EventPayloadMap = {
  "workflow.created":   WorkflowCreatedPayload;
  "workflow.started":   WorkflowStartedPayload;
  "workflow.paused":    WorkflowPausedPayload;
  "workflow.resumed":   WorkflowResumedPayload;
  "workflow.completed": WorkflowCompletedPayload;
  "workflow.failed":    WorkflowFailedPayload;
  "workflow.cancelled": WorkflowCancelledPayload;
  "step.started":       StepStartedPayload;
  "step.completed":     StepCompletedPayload;
  "step.failed":        StepFailedPayload;
  "step.skipped":       StepSkippedPayload;
  "checkpoint.created": CheckpointCreatedPayload;
};

export type RuntimeEventPayload<T extends RuntimeEventType> =
  T extends keyof EventPayloadMap ? EventPayloadMap[T] : Record<string, unknown>;

// ─── Event Envelope ────────────────────────────────────────────────────────────

export interface RuntimeEvent<T extends RuntimeEventType = RuntimeEventType> {
  id: string;
  type: T;
  payload: RuntimeEventPayload<T>;
}

// ─── Subscriber ───────────────────────────────────────────────────────────────

export type RuntimeEventCallback<T extends RuntimeEventType = RuntimeEventType> = (
  event: RuntimeEvent<T>
) => void | Promise<void>;

// ─── Event Bus ────────────────────────────────────────────────────────────────

/**
 * RuntimeEventBus
 *
 * Lightweight, self-contained pub/sub for FactoryOS runtime events.
 * Subscribers run fire-and-forget (via setTimeout(0)).
 * A failing subscriber will NOT propagate errors to the workflow.
 */
export class RuntimeEventBus {
  private subscribers = new Map<
    string,
    { type: RuntimeEventType | "*"; callback: RuntimeEventCallback }
  >();
  private history: RuntimeEvent[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 500) {
    this.maxHistory = maxHistory;
  }

  publish<T extends RuntimeEventType>(type: T, payload: RuntimeEventPayload<T>): void {
    const event: RuntimeEvent<T> = {
      id: `fos_evt_${crypto.randomBytes(8).toString("hex")}`,
      type,
      payload,
    };

    this.history.push(event as RuntimeEvent);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Fire-and-forget — subscriber failures must not corrupt state
    setTimeout(() => {
      for (const [subId, sub] of this.subscribers.entries()) {
        if (sub.type === type || sub.type === "*") {
          try {
            const result = (sub.callback as RuntimeEventCallback<T>)(event);
            if (result instanceof Promise) {
              result.catch((err) => {
                console.error(
                  `[RuntimeEventBus] Subscriber ${subId} async failure for event "${type}":`,
                  err
                );
              });
            }
          } catch (err) {
            console.error(
              `[RuntimeEventBus] Subscriber ${subId} threw for event "${type}":`,
              err
            );
          }
        }
      }
    }, 0);
  }

  subscribe<T extends RuntimeEventType>(
    type: T | "*",
    callback: RuntimeEventCallback<T>
  ): string {
    const id = `fos_sub_${crypto.randomBytes(6).toString("hex")}`;
    this.subscribers.set(id, { type, callback: callback as RuntimeEventCallback });
    return id;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  getHistory(): ReadonlyArray<RuntimeEvent> {
    return this.history;
  }

  /** Test helper — get events filtered by type */
  getByType<T extends RuntimeEventType>(type: T): Array<RuntimeEvent<T>> {
    return this.history.filter((e) => e.type === type) as Array<RuntimeEvent<T>>;
  }

  /** Test helper — clear history */
  clearHistory(): void {
    this.history = [];
  }
}
