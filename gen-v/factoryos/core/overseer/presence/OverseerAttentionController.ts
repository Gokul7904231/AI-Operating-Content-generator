/**
 * FactoryOS Frontier v2 — Overseer Attention Controller
 * Tracks grounded operational focal points, calculates spatial gaze coordinates, and arbitrates focus.
 */

import type { AttentionTarget, AttentionTargetType } from "./OverseerPresenceContracts";

const FLOOR_GAZE_COORDINATES: Record<string, { x: number; y: number }> = {
  floor01_strategy: { x: -0.4, y: -0.3 },
  floor02_scripting: { x: -0.4, y: 0.3 },
  floor03_asset_realization: { x: 0.5, y: 0.4 },
  floor07_compliance: { x: 0.5, y: -0.4 },
  factory: { x: 0.0, y: 0.0 },
  user: { x: 0.0, y: -0.05 },
  chat: { x: 0.0, y: 0.3 },
  voiceInput: { x: 0.0, y: -0.1 },
};

export class OverseerAttentionController {
  private currentTarget: AttentionTarget;

  constructor() {
    const now = new Date().toISOString();
    this.currentTarget = {
      target: "factory",
      reason: "Monitoring overall factory status",
      priority: "LOW",
      confidence: 0.9,
      gazeX: 0.0,
      gazeY: 0.0,
      startedAt: now,
      durationMs: 5000,
      expiresAt: new Date(Date.now() + 5000).toISOString(),
    };
  }

  getCurrentAttention(): AttentionTarget {
    this.checkExpiration();
    return structuredClone(this.currentTarget);
  }

  /**
   * Sets a grounded operational attention target.
   */
  setAttention(
    target: AttentionTargetType,
    reason: string,
    priority: AttentionTarget["priority"] = "NORMAL",
    options: { targetId?: string; confidence?: number; durationMs?: number } = {}
  ): AttentionTarget {
    // Priority check
    const priorityRank: Record<AttentionTarget["priority"], number> = {
      CRITICAL: 4,
      HIGH: 3,
      NORMAL: 2,
      LOW: 1,
    };

    if (
      this.currentTarget &&
      new Date(this.currentTarget.expiresAt).getTime() > Date.now() &&
      priorityRank[this.currentTarget.priority] > priorityRank[priority]
    ) {
      // Current higher priority attention active
      return structuredClone(this.currentTarget);
    }

    const coords = FLOOR_GAZE_COORDINATES[target] || { x: 0.0, y: 0.0 };
    const duration = options.durationMs ?? (priority === "CRITICAL" ? 10000 : 4000);
    const now = Date.now();

    this.currentTarget = {
      target,
      targetId: options.targetId,
      reason,
      priority,
      confidence: options.confidence ?? 0.85,
      gazeX: coords.x,
      gazeY: coords.y,
      startedAt: new Date(now).toISOString(),
      durationMs: duration,
      expiresAt: new Date(now + duration).toISOString(),
    };

    return structuredClone(this.currentTarget);
  }

  /**
   * Clears or returns gaze to user / factory.
   */
  resetToUser(): AttentionTarget {
    return this.setAttention("user", "Engaged with user", "NORMAL", { durationMs: 4000 });
  }

  private checkExpiration(): void {
    if (new Date(this.currentTarget.expiresAt).getTime() <= Date.now()) {
      const now = Date.now();
      this.currentTarget = {
        target: "factory",
        reason: "General factory supervision",
        priority: "LOW",
        confidence: 0.9,
        gazeX: 0.0,
        gazeY: 0.0,
        startedAt: new Date(now).toISOString(),
        durationMs: 5000,
        expiresAt: new Date(now + 5000).toISOString(),
      };
    }
  }
}
