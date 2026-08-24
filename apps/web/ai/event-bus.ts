import crypto from "crypto";

export interface ShortFactoryEvent<T = any> {
  id: string;
  type: string; // e.g. "script.generated", "render.completed"
  timestamp: number;
  traceId: string;
  payload: T;
}

export type EventCallback<T = any> = (event: ShortFactoryEvent<T>) => void | Promise<void>;

export const WorkflowEvents = {
  WORKFLOW_STARTED:    "workflow.started",
  WORKFLOW_COMPLETED:  "workflow.completed",
  WORKFLOW_FAILED:     "workflow.failed",
  SCRIPT_GENERATED:    "script.generated",
  CRITIC_COMPLETED:    "critic.completed",
  CRITIC_FAILED:       "critic.failed",
  SCENE_GENERATED:     "scene.generated",
  VOICE_GENERATED:     "voice.generated",
  IMAGE_GENERATED:     "image.generated",
  RENDER_STARTED:      "render.started",
  RENDER_COMPLETED:    "render.completed",
  STORAGE_STARTED:     "storage.started",
  STORAGE_COMPLETED:   "storage.completed",
  PUBLISHER_STARTED:   "publisher.started",
  PUBLISHER_COMPLETED: "publisher.completed",
  LEARNING_UPDATED:    "learning.updated",
} as const;

class EventBusClass {
  private subscribers = new Map<string, { type: string; callback: EventCallback }>();
  private eventHistory: ShortFactoryEvent[] = [];

  /**
   * Publishes an event to the Event Bus asynchronously.
   */
  publish<T>(type: string, payload: T, traceId: string): void {
    const event: ShortFactoryEvent<T> = {
      id: `evt_${crypto.randomBytes(8).toString("hex")}`,
      type,
      timestamp: Date.now(),
      traceId,
      payload,
    };

    this.eventHistory.push(event);
    if (this.eventHistory.length > 200) {
      this.eventHistory.shift();
    }

    console.log(`[EventBus] Publishing event: "${type}" (ID: ${event.id}, Trace: ${traceId})`);

    // Dispatch asynchronously to prevent blocking the main thread execution
    setTimeout(() => {
      for (const [subId, sub] of this.subscribers.entries()) {
        if (sub.type === type || sub.type === "*") {
          try {
            const res = sub.callback(event);
            if (res instanceof Promise) {
              res.catch((err) => {
                console.error(`[EventBus] Subscriber ${subId} failed asynchronously for event ${type}:`, err);
              });
            }
          } catch (err) {
            console.error(`[EventBus] Subscriber ${subId} threw error for event ${type}:`, err);
          }
        }
      }
    }, 0);
  }

  /**
   * Returns recent events history.
   */
  getHistory(): ShortFactoryEvent[] {
    return this.eventHistory;
  }

  /**
   * Subscribes a listener to a specific event type.
   * Use "*" as the type to listen to all events.
   * Returns a subscription ID that can be used to unsubscribe later.
   */
  subscribe<T>(type: string, callback: EventCallback<T>): string {
    const subscriptionId = `sub_${crypto.randomBytes(6).toString("hex")}`;
    this.subscribers.set(subscriptionId, { type, callback });
    return subscriptionId;
  }

  /**
   * Removes a subscription from the Event Bus.
   */
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }
}

export const EventBus = new EventBusClass();
export type EventBusInstance = typeof EventBus;

// ─────────────────────────────────────────────────────────────────────────────
// Typed Event Constants — Storage Layer
// ─────────────────────────────────────────────────────────────────────────────

/** Event constants for the Storage Provider layer. */
export const StorageEvents = {
  UPLOAD_STARTED:    "storage.upload.started",
  UPLOAD_COMPLETED:  "storage.upload.completed",
  UPLOAD_FAILED:     "storage.upload.failed",
  UPLOAD_DEAD:       "storage.upload.dead",
  DELETE_COMPLETED:  "storage.delete.completed",
  CLEANUP_STARTED:   "storage.cleanup.started",
  CLEANUP_COMPLETED: "storage.cleanup.completed",
  CLEANUP_FAILED:    "storage.cleanup.failed",
  // Upload Queue
  QUEUE_ENQUEUED:    "storage.queue.enqueued",
  // Mirror Mode
  MIRROR_STARTED:    "storage.mirror.started",
  MIRROR_COMPLETED:  "storage.mirror.completed",
  MIRROR_PARTIAL:    "storage.mirror.partial",
} as const;

/** Narrower alias for Drive-specific events (same values, kept for clarity). */
export const DriveEvents = StorageEvents;

/** Event constants for the Publisher Queue layer. */
export const PublishEvents = {
  QUEUED:     "publish.queued",
  STARTED:    "publish.started",
  COMPLETED:  "publish.completed",
  FAILED:     "publish.failed",
  DEAD:       "publish.dead",
} as const;

/** Engine runtime events. */
export const EngineEvents = {
  JOB_STARTED:       "job.started",
  JOB_COMPLETED:     "job.completed",
  JOB_FAILED:        "job.failed",
  RENDER_COMPLETED:  "render.completed",   // triggers StorageQueue
  SCRIPT_GENERATED:  "script.generated",
  METADATA_GENERATED:"metadata.generated",
} as const;

export type StorageEventType  = (typeof StorageEvents)[keyof typeof StorageEvents];
export type PublishEventType  = (typeof PublishEvents)[keyof typeof PublishEvents];
export type EngineEventType   = (typeof EngineEvents)[keyof typeof EngineEvents];

