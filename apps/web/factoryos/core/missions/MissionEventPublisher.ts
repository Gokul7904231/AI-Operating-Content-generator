/**
 * FactoryOS Frontier v2 — Mission Event Publisher
 * Provides event-safe, idempotent, outbox-pattern publishing for Mission lifecycle events.
 */

import type { DurableEventBus } from "../events/DurableEventBus";
import type { EventTopic } from "../contracts/EventContracts";

export class MissionEventPublisher {
  private publishedKeys: Set<string> = new Set();
  private eventBus?: DurableEventBus;

  constructor(eventBus?: DurableEventBus) {
    this.eventBus = eventBus;
  }

  setEventBus(eventBus?: DurableEventBus): void {
    this.eventBus = eventBus;
  }

  async publishLifecycleEvent(
    topic: EventTopic,
    missionId: string,
    version: number,
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.eventBus) return false;

    const idempotencyKey = `mission_evt_${missionId}_${topic}_v${version}`;
    if (this.publishedKeys.has(idempotencyKey)) {
      return false; // Idempotent skip
    }

    const envelopePayload = {
      missionId,
      version,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    try {
      await this.eventBus.publish(topic, envelopePayload, {
        correlationId: missionId,
        idempotencyKey,
        source: "MissionManager",
      });
      this.publishedKeys.add(idempotencyKey);
      return true;
    } catch (err) {
      console.error(`[MissionEventPublisher] Failed to publish ${topic} for ${missionId}:`, err);
      // Retain key to retry or handle via outbox
      throw err;
    }
  }
}
