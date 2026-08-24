/**
 * FactoryOS Frontier v2 — Floor Guardian Decision Engine
 * Plans autonomous local recovery, rebalancing, and escalation actions.
 */

import type { GuardianDecision, GuardianAuditReport } from "./GuardianContracts";
import type { GuardianPolicy } from "./GuardianPolicy";
import type { GuardianMemory } from "./GuardianMemory";
import type { WorkerState } from "../contracts/WorldStateContracts";

export class GuardianDecisionEngine {
  private floorId: string;
  private policy: GuardianPolicy;
  private memory: GuardianMemory;

  constructor(floorId: string, policy: GuardianPolicy, memory: GuardianMemory) {
    this.floorId = floorId;
    this.policy = policy;
    this.memory = memory;
  }

  planActions(
    audit: GuardianAuditReport,
    workers: WorkerState[],
    loadBalance: { needsRebalance: boolean; overloadedWorkers: string[]; idleWorkers: string[] }
  ): GuardianDecision[] {
    const decisions: GuardianDecision[] = [];
    const now = new Date().toISOString();

    // 1. Check for mandatory escalation
    if (this.policy.shouldEscalate({ floorId: this.floorId, severity: audit.health === "CRITICAL" ? "CRITICAL" : "LOW" })) {
      decisions.push({
        action: "ESCALATE",
        targetId: this.floorId,
        reason: `Critical floor state on ${this.floorId}: ${audit.findings.join("; ")}`,
        confidence: 0.95,
        requiresOverseerApproval: false,
        timestamp: now,
      });
      return decisions;
    }

    // 2. Check for failed/degraded workers
    const failedWorkers = workers.filter((w) => w.status === "FAILED" || w.status === "OFFLINE");
    for (const w of failedWorkers) {
      const incident = this.memory.getWorkerIncident(w.workerId);
      const failures = incident?.failureCount || 0;

      if (failures >= 2) {
        decisions.push({
          action: "QUARANTINE_WORKER",
          targetId: w.workerId,
          reason: `Worker ${w.workerId} failed recovery ${failures} times. Quarantining.`,
          confidence: 0.95,
          requiresOverseerApproval: false,
          timestamp: now,
        });
        decisions.push({
          action: "ESCALATE",
          targetId: w.workerId,
          reason: `Worker ${w.workerId} quarantined after repeated failures.`,
          confidence: 0.9,
          requiresOverseerApproval: false,
          timestamp: now,
        });
      } else {
        decisions.push({
          action: "RECOVER_WORKER",
          targetId: w.workerId,
          reason: `Auto-recovering degraded worker ${w.workerId} on floor ${this.floorId}`,
          confidence: 0.9,
          requiresOverseerApproval: false,
          timestamp: now,
        });
      }
    }

    // 3. Check for Load Rebalance
    if (loadBalance.needsRebalance) {
      decisions.push({
        action: "REBALANCE",
        targetId: this.floorId,
        reason: `Rebalancing tasks from overloaded workers (${loadBalance.overloadedWorkers.join(", ")}) to idle workers (${loadBalance.idleWorkers.join(", ")})`,
        confidence: 0.85,
        parameters: {
          overloaded: loadBalance.overloadedWorkers,
          idle: loadBalance.idleWorkers,
        },
        requiresOverseerApproval: false,
        timestamp: now,
      });
    }

    // 4. Queue Congestion Throttle
    if (audit.queueDepth > 15) {
      decisions.push({
        action: "THROTTLE_CONCURRENCY",
        targetId: this.floorId,
        reason: `Throttling concurrency to reduce queue depth (${audit.queueDepth})`,
        confidence: 0.8,
        requiresOverseerApproval: false,
        timestamp: now,
      });
    }

    return decisions;
  }
}
