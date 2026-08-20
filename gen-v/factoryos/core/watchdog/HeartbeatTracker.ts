/**
 * FactoryOS Frontier v2 — Subsystem & Whole-Agent Heartbeat Tracker
 * Direct tracking of heartbeats, state machines, missed intervals, and quarantine metrics.
 */

import type {
  AgentHealthState,
  AgentHeartbeatRecord,
  SubsystemType,
  WatchdogSupervisionPolicy,
} from "../contracts/WatchdogContracts";

export const DEFAULT_WATCHDOG_POLICY: WatchdogSupervisionPolicy = {
  suspectThresholdMisses: 1,
  failureThresholdMisses: 3,
  maxRecoveryAttempts: 3,
  recoveryCooldownMs: 5000,
  staleThresholdMs: 15000,
  heartbeatIntervalMs: 2000,
};

export class HeartbeatTracker {
  private records: Map<string, AgentHeartbeatRecord> = new Map();
  private policy: WatchdogSupervisionPolicy;

  constructor(policy: Partial<WatchdogSupervisionPolicy> = {}) {
    this.policy = { ...DEFAULT_WATCHDOG_POLICY, ...policy };
  }

  /**
   * Registers a subsystem or agent for active heartbeat tracking.
   */
  register(
    componentId: string,
    componentType: SubsystemType,
    expectedIntervalMs: number = this.policy.heartbeatIntervalMs,
    metadata?: Record<string, unknown>
  ): AgentHeartbeatRecord {
    const existing = this.records.get(componentId);
    if (existing) {
      existing.lastHeartbeat = new Date().toISOString();
      existing.status = "HEALTHY";
      existing.consecutiveMisses = 0;
      return existing;
    }

    const record: AgentHeartbeatRecord = {
      componentId,
      componentType,
      lastHeartbeat: new Date().toISOString(),
      expectedIntervalMs,
      status: "HEALTHY",
      consecutiveMisses: 0,
      recoveryAttempts: 0,
      metadata,
    };

    this.records.set(componentId, record);
    return record;
  }

  /**
   * Records a heartbeat signal from a component.
   */
  recordHeartbeat(componentId: string, metadata?: Record<string, unknown>): boolean {
    const record = this.records.get(componentId);
    if (!record) return false;

    record.lastHeartbeat = new Date().toISOString();
    record.consecutiveMisses = 0;
    if (record.status !== "QUARANTINED") {
      record.status = "HEALTHY";
    }
    if (metadata) {
      record.metadata = { ...record.metadata, ...metadata };
    }
    return true;
  }

  /**
   * Evaluates all tracked components against expected intervals and transitions state machine.
   */
  evaluateHealth(now: number = Date.now()): {
    healthy: AgentHeartbeatRecord[];
    suspect: AgentHeartbeatRecord[];
    degraded: AgentHeartbeatRecord[];
    failed: AgentHeartbeatRecord[];
    quarantined: AgentHeartbeatRecord[];
    recovering: AgentHeartbeatRecord[];
  } {
    const healthy: AgentHeartbeatRecord[] = [];
    const suspect: AgentHeartbeatRecord[] = [];
    const degraded: AgentHeartbeatRecord[] = [];
    const failed: AgentHeartbeatRecord[] = [];
    const quarantined: AgentHeartbeatRecord[] = [];
    const recovering: AgentHeartbeatRecord[] = [];

    for (const record of this.records.values()) {
      if (record.status === "QUARANTINED") {
        quarantined.push(record);
        continue;
      }

      const lastTime = new Date(record.lastHeartbeat).getTime();
      const elapsed = now - lastTime;
      const missedIntervals = Math.floor(elapsed / record.expectedIntervalMs);

      if (missedIntervals >= this.policy.failureThresholdMisses || elapsed >= this.policy.staleThresholdMs) {
        record.consecutiveMisses = missedIntervals;
        record.status = "FAILED";
        failed.push(record);
      } else if (missedIntervals >= this.policy.suspectThresholdMisses) {
        record.consecutiveMisses = missedIntervals;
        record.status = missedIntervals > 1 ? "DEGRADED" : "SUSPECT";
        if (record.status === "DEGRADED") {
          degraded.push(record);
        } else {
          suspect.push(record);
        }
      } else if (record.status === "RECOVERING") {
        recovering.push(record);
      } else {
        record.status = "HEALTHY";
        healthy.push(record);
      }
    }

    return { healthy, suspect, degraded, failed, quarantined, recovering };
  }

  /**
   * Attempts auto-recovery for a failed component.
   * Enforces max recovery limit and cooldown.
   */
  attemptRecovery(componentId: string, now: number = Date.now()): {
    allowed: boolean;
    quarantined: boolean;
    attemptNumber: number;
    reason: string;
  } {
    const record = this.records.get(componentId);
    if (!record) {
      return { allowed: false, quarantined: false, attemptNumber: 0, reason: "Component not found" };
    }

    if (record.status === "QUARANTINED") {
      return { allowed: false, quarantined: true, attemptNumber: record.recoveryAttempts, reason: "Component already quarantined" };
    }

    // Check cooldown
    if (record.lastRecoveryAt) {
      const elapsedSinceLast = now - new Date(record.lastRecoveryAt).getTime();
      if (elapsedSinceLast < this.policy.recoveryCooldownMs) {
        return {
          allowed: false,
          quarantined: false,
          attemptNumber: record.recoveryAttempts,
          reason: `Recovery in cooldown (${elapsedSinceLast}ms < ${this.policy.recoveryCooldownMs}ms)`,
        };
      }
    }

    record.recoveryAttempts += 1;
    record.lastRecoveryAt = new Date(now).toISOString();

    if (record.recoveryAttempts > this.policy.maxRecoveryAttempts) {
      record.status = "QUARANTINED";
      return {
        allowed: false,
        quarantined: true,
        attemptNumber: record.recoveryAttempts,
        reason: `Exceeded max recovery attempts (${record.recoveryAttempts} > ${this.policy.maxRecoveryAttempts})`,
      };
    }

    record.status = "RECOVERING";
    return {
      allowed: true,
      quarantined: false,
      attemptNumber: record.recoveryAttempts,
      reason: `Auto-recovery attempt ${record.recoveryAttempts}/${this.policy.maxRecoveryAttempts}`,
    };
  }

  /**
   * Manually resets recovery status once component confirms health.
   */
  markRecovered(componentId: string): void {
    const record = this.records.get(componentId);
    if (record) {
      record.status = "HEALTHY";
      record.consecutiveMisses = 0;
      record.lastHeartbeat = new Date().toISOString();
    }
  }

  /**
   * Quarantines a component explicitly.
   */
  quarantine(componentId: string): void {
    const record = this.records.get(componentId);
    if (record) {
      record.status = "QUARANTINED";
    }
  }

  getRecord(componentId: string): AgentHeartbeatRecord | undefined {
    const rec = this.records.get(componentId);
    return rec ? structuredClone(rec) : undefined;
  }

  getAllRecords(): AgentHeartbeatRecord[] {
    return Array.from(this.records.values()).map((r) => structuredClone(r));
  }

  clear(): void {
    this.records.clear();
  }
}
