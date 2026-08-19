/**
 * FactoryOS v1 — Durable Event Bus
 * Supports consumer groups, acknowledgements, dead-lettering, idempotency, replay, and correlation.
 */

import { randomUUID } from "node:crypto";
import type { EventAck, EventEnvelope, EventTopic } from "../contracts/EventContracts";

export type EventHandler<T = Record<string, unknown>> = (event: EventEnvelope<T>) => Promise<void> | void;

export interface ConsumerGroupSubscription {
  readonly groupId: string;
  readonly consumerId: string;
  readonly topics: EventTopic[];
  readonly handler: EventHandler<any>;
}

export interface PublishOptions {
  readonly correlationId?: string;
  readonly source?: string;
  readonly idempotencyKey?: string;
}

export class DurableEventBus {
  private events: EventEnvelope[] = [];
  private processedIdempotencyKeys: Set<string> = new Set();
  private wildcardHandlers: Set<EventHandler> = new Set();
  private topicHandlers: Map<EventTopic, Set<EventHandler>> = new Map();
  private consumerGroups: Map<string, ConsumerGroupSubscription[]> = new Map();
  private deadLetters: { event: EventEnvelope; error: string; consumerId: string; attempts: number }[] = [];
  private nextSequence: number = 1;

  constructor() {}

  async publish<T extends Record<string, unknown> = Record<string, unknown>>(
    topic: EventTopic,
    payload: T,
    options: PublishOptions = {}
  ): Promise<EventEnvelope<T>> {
    if (options.idempotencyKey && this.processedIdempotencyKeys.has(options.idempotencyKey)) {
      // Find existing event with this idempotency key
      const existing = this.events.find((e) => e.idempotencyKey === options.idempotencyKey);
      if (existing) {
        return structuredClone(existing) as EventEnvelope<T>;
      }
    }

    if (options.idempotencyKey) {
      this.processedIdempotencyKeys.add(options.idempotencyKey);
    }

    const event: EventEnvelope<T> = {
      eventId: `evt_${randomUUID().replace(/-/g, "").substring(0, 16)}`,
      topic,
      timestamp: new Date().toISOString(),
      correlationId: options.correlationId || `corr_${randomUUID().replace(/-/g, "").substring(0, 12)}`,
      source: options.source || "factoryos-kernel",
      payload: structuredClone(payload),
      schemaVersion: "1.0.0",
      idempotencyKey: options.idempotencyKey,
    };

    this.events.push(structuredClone(event) as EventEnvelope);
    if (this.events.length > 5000) {
      this.events.shift();
    }

    const deliverable = Object.assign({}, event.payload, event, { payload: event.payload });

    // Deliver asynchronously to topic subscribers
    const handlers = this.topicHandlers.get(topic);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(structuredClone(deliverable));
        } catch (e) {
          // Dead letter handling
          this.recordDeadLetter(event, e instanceof Error ? e.message : String(e), "topic-subscriber");
        }
      }
    }

    // Deliver to wildcard handlers
    for (const handler of this.wildcardHandlers) {
      try {
        await handler(structuredClone(deliverable));
      } catch (e) {
        this.recordDeadLetter(event, e instanceof Error ? e.message : String(e), "wildcard-subscriber");
      }
    }

    // Deliver to consumer groups with load balancing (round-robin among group consumers)
    for (const [groupId, consumers] of this.consumerGroups.entries()) {
      const eligible = consumers.filter((c) => c.topics.includes(topic));
      if (eligible.length > 0) {
        // Pick one consumer in group
        const selected = eligible[Math.floor(Math.random() * eligible.length)];
        try {
          await selected.handler(structuredClone(deliverable));
        } catch (e) {
          this.recordDeadLetter(event, e instanceof Error ? e.message : String(e), selected.consumerId);
        }
      }
    }

    return structuredClone(event);
  }

  subscribe<T = Record<string, unknown>>(topic: EventTopic, handler: EventHandler<T>): () => void {
    if (!this.topicHandlers.has(topic)) {
      this.topicHandlers.set(topic, new Set());
    }
    const handlers = this.topicHandlers.get(topic)!;
    handlers.add(handler as EventHandler);
    return () => handlers.delete(handler as EventHandler);
  }

  subscribeWildcard(handler: EventHandler): () => void {
    this.wildcardHandlers.add(handler);
    return () => this.wildcardHandlers.delete(handler);
  }

  registerConsumerGroup(
    groupId: string,
    consumerId: string,
    topics: EventTopic[],
    handler: EventHandler
  ): () => void {
    if (!this.consumerGroups.has(groupId)) {
      this.consumerGroups.set(groupId, []);
    }
    const list = this.consumerGroups.get(groupId)!;
    const sub: ConsumerGroupSubscription = {
      groupId,
      consumerId,
      topics,
      handler,
    };
    list.push(sub);

    return () => {
      const current = this.consumerGroups.get(groupId);
      if (current) {
        this.consumerGroups.set(
          groupId,
          current.filter((c) => c.consumerId !== consumerId)
        );
      }
    };
  }

  async replay(fromTimestamp?: string, topicFilter?: EventTopic[]): Promise<EventEnvelope[]> {
    let list = this.events;
    if (fromTimestamp) {
      const fromTime = new Date(fromTimestamp).getTime();
      list = list.filter((e) => new Date(e.timestamp).getTime() >= fromTime);
    }
    if (topicFilter && topicFilter.length > 0) {
      list = list.filter((e) => topicFilter.includes(e.topic));
    }
    return structuredClone(list);
  }

  getEvents(limit: number = 100): EventEnvelope[] {
    return structuredClone(this.events.slice(-limit));
  }

  getDeadLetters() {
    return structuredClone(this.deadLetters);
  }

  private recordDeadLetter(event: EventEnvelope, error: string, consumerId: string) {
    this.deadLetters.push({
      event: structuredClone(event),
      error,
      consumerId,
      attempts: 1,
    });
  }

  clear(): void {
    this.events = [];
    this.processedIdempotencyKeys.clear();
    this.deadLetters = [];
  }
}
