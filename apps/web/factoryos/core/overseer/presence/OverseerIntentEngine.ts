/**
 * FactoryOS Frontier v2 — Overseer Intent Engine
 * Arbitrates operational priorities, manages active intent lifetimes, and enforces graceful state decay.
 */

import {
  type OverseerIntent,
  type IntentPriority,
  type ActiveIntentRecord,
  INTENT_PRIORITY_RANK,
} from "./OverseerPresenceContracts";
import { OverseerPresencePolicy, type PolicyValidationContext } from "./OverseerPresencePolicy";

export interface PushIntentOptions {
  priority?: IntentPriority;
  durationMs?: number;
  cause: string;
  sourceEvent?: string;
  correlationId?: string;
  isPersistent?: boolean;
}

const DEFAULT_INTENT_DURATIONS: Partial<Record<OverseerIntent, number>> = {
  GREETING: 2500,
  SUCCESS: 2000,
  PROUD: 2500,
  FAREWELL: 2500,
  CURIOUS: 3000,
  VERIFYING: 4000,
  RECOVERING: 5000,
};

export class OverseerIntentEngine {
  private activeIntents: Map<string, ActiveIntentRecord> = new Map();
  private currentApprovedIntent: OverseerIntent = "IDLE";

  constructor() {
    this.pushIntent("IDLE", {
      priority: "IDLE",
      cause: "Baseline idle readiness",
      isPersistent: true,
    });
  }

  getActiveIntents(): ActiveIntentRecord[] {
    this.purgeExpired();
    return Array.from(this.activeIntents.values());
  }

  getCurrentIntent(): OverseerIntent {
    return this.currentApprovedIntent;
  }

  /**
   * Pushes a new candidate intent with priority and duration.
   */
  pushIntent(intent: OverseerIntent, options: PushIntentOptions): ActiveIntentRecord {
    const now = Date.now();
    const duration = options.durationMs ?? DEFAULT_INTENT_DURATIONS[intent] ?? (options.isPersistent ? 0 : 3000);
    const expiresAt = options.isPersistent || duration <= 0 ? undefined : new Date(now + duration).toISOString();

    const priority = options.priority ?? this.inferDefaultPriority(intent);

    const record: ActiveIntentRecord = {
      intent,
      priority,
      cause: options.cause,
      sourceEvent: options.sourceEvent,
      correlationId: options.correlationId,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      isPersistent: options.isPersistent ?? (priority === "CRITICAL_SAFETY" || priority === "IDLE"),
    };

    const key = `${intent}_${options.sourceEvent || options.correlationId || record.createdAt}`;
    this.activeIntents.set(key, record);

    return record;
  }

  /**
   * Clears intents for a specific category/event.
   */
  clearIntent(intent: OverseerIntent): void {
    for (const [key, record] of this.activeIntents.entries()) {
      if (record.intent === intent) {
        this.activeIntents.delete(key);
      }
    }
  }

  /**
   * Resolves current highest priority intent and runs it through the Truth Gate policy.
   */
  resolveEffectiveIntent(policyCtx: Omit<PolicyValidationContext, "candidateIntent">): OverseerIntent {
    this.purgeExpired();

    let highestRecord: ActiveIntentRecord | null = null;
    let highestRank = -1;

    for (const record of this.activeIntents.values()) {
      const rank = INTENT_PRIORITY_RANK[record.priority];
      if (rank > highestRank) {
        highestRank = rank;
        highestRecord = record;
      }
    }

    const candidate = highestRecord?.intent ?? "IDLE";

    // Pass through Truth Gate Policy
    const verdict = OverseerPresencePolicy.evaluateTruthGate({
      ...policyCtx,
      candidateIntent: candidate,
    });

    this.currentApprovedIntent = verdict.approvedIntent;
    return this.currentApprovedIntent;
  }

  private purgeExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.activeIntents.entries()) {
      if (record.expiresAt && new Date(record.expiresAt).getTime() <= now) {
        this.activeIntents.delete(key);
      }
    }

    if (this.activeIntents.size === 0) {
      this.pushIntent("IDLE", {
        priority: "IDLE",
        cause: "Baseline idle readiness",
        isPersistent: true,
      });
    }
  }

  private inferDefaultPriority(intent: OverseerIntent): IntentPriority {
    switch (intent) {
      case "CRITICAL":
        return "CRITICAL_SAFETY";
      case "WARNING":
      case "CONCERNED":
      case "RECOVERING":
        return "ACTIVE_INCIDENT";
      case "SUCCESS":
      case "PROUD":
      case "VERIFYING":
      case "DEEP_THINKING":
        return "HIGH_MISSION";
      case "LISTENING":
      case "GREETING":
      case "FAREWELL":
        return "USER_INTERACTION";
      case "OBSERVING":
      case "THINKING":
      case "CURIOUS":
        return "NORMAL_FACTORY";
      case "WAITING":
      case "SLEEP":
        return "CASUAL_AMBIENT";
      case "IDLE":
      default:
        return "IDLE";
    }
  }
}
