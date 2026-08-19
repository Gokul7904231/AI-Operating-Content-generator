/**
 * FactoryOS Frontier v2 — Phase 7: Autonomous Factory Watchdog 2.0 (Whole-Agent Supervisor)
 * Continuously monitors Overseer, Floor Guardians, Slayer Swarm, Healers, Event Consumers, and Task Leases.
 * Automatically recovers failed agents, reclaims abandoned leases, and quarantines repeat offenders.
 */

import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { CaseManager } from "../cases/CaseManager";
import type { LeaseManager } from "../leases/LeaseManager";
import type { MissionManager } from "../missions/MissionManager";

export interface WatchdogHealthReport {
  readonly healthyWorkers: string[];
  readonly staleWorkers: string[];
  readonly failedWorkers: string[];
  readonly recoveredWorkers: string[];
  readonly quarantinedWorkers: string[];
  readonly reclaimedTasks: string[];
  readonly monitoredAgents: {
    readonly overseerOnline: boolean;
    readonly activeGuardiansCount: number;
    readonly activeSlayersCount: number;
    readonly activeHealersCount: number;
  };
  readonly missionBreaches?: { missionId: string; breachReason: string }[];
  readonly timestamp: string;
}

export class FactoryWatchdog {
  private worldState: WorldStateEngine;
  private eventBus: DurableEventBus;
  private caseManager: CaseManager;
  private leaseManager?: LeaseManager;
  private missionManager?: MissionManager;
  private isRunning: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private failureCounts: Map<string, number> = new Map();
  private staleThresholdMs: number;

  constructor(
    worldState: WorldStateEngine,
    eventBus: DurableEventBus,
    caseManager: CaseManager,
    leaseManager?: LeaseManager,
    staleThresholdMs: number = 15000,
    missionManager?: MissionManager
  ) {
    this.worldState = worldState;
    this.eventBus = eventBus;
    this.caseManager = caseManager;
    this.leaseManager = leaseManager;
    this.staleThresholdMs = staleThresholdMs;
    this.missionManager = missionManager;
  }

  start(intervalMs: number = 2000): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.monitorInterval = setInterval(() => {
      this.runHealthCheck().catch(() => {});
    }, intervalMs);
  }

  stop(): void {
    this.isRunning = false;
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }

  async runHealthCheck(): Promise<WatchdogHealthReport> {
    const now = Date.now();
    const currentState = this.worldState.getState();
    const healthy: string[] = [];
    const stale: string[] = [];
    const failed: string[] = [];
    const recovered: string[] = [];
    const quarantined: string[] = [];
    const reclaimed: string[] = [];

    let overseerOnline = false;
    let activeGuardiansCount = 0;
    let activeSlayersCount = 0;
    let activeHealersCount = 0;

    // 1. Inspect all registered agents and workers
    for (const [workerId, worker] of Object.entries(currentState.workers)) {
      const lastSeenTime = new Date(worker.lastSeen).getTime();
      const elapsed = now - lastSeenTime;

      // Count agent specializations
      if (worker.role === "OPERATOR" && worker.status === "HEALTHY") overseerOnline = true;
      if (worker.role === "GUARDIAN" && worker.status === "HEALTHY") activeGuardiansCount += 1;
      if (worker.role === "SLAYER" && worker.status === "HEALTHY") activeSlayersCount += 1;
      if (worker.role === "HEALER" && worker.status === "HEALTHY") activeHealersCount += 1;

      if (worker.status === "FAILED") {
        failed.push(workerId);
        const count = (this.failureCounts.get(workerId) || 0) + 1;
        this.failureCounts.set(workerId, count);

        if (count >= 3) {
          // Repeated failure: Quarantine and create system case
          quarantined.push(workerId);
          this.worldState.updateWorkerHeartbeat(workerId, "QUARANTINED");
          await this.caseManager.createCase({
            title: `[Watchdog] Agent/Worker ${workerId} quarantined due to repeated failures`,
            description: `Agent ${workerId} failed ${count} consecutive health checks. Quarantined for supervisor triage.`,
            floorId: "system_kernel",
            targetWorker: workerId,
            category: "WORKER_STALL",
            severity: "HIGH",
            detectorId: "factory_watchdog",
            symptoms: [`Agent ${workerId} repeated failure count: ${count}`],
            observedState: { worker, failureCount: count },
          });

          await this.eventBus.publish("AGENT_QUARANTINED", {
            agentId: workerId,
            failureCount: count,
            timestamp: new Date().toISOString(),
          });
        } else {
          // Auto-recover worker
          recovered.push(workerId);
          this.worldState.updateWorkerHeartbeat(workerId, "HEALTHY");
          await this.eventBus.publish("AGENT_RECOVERED", {
            agentId: workerId,
            recoveryAttempt: count,
            timestamp: new Date().toISOString(),
          });
        }
      } else if (elapsed > this.staleThresholdMs && worker.status !== "QUARANTINED") {
        stale.push(workerId);
        this.worldState.updateWorkerHeartbeat(workerId, "DEGRADED");
      } else if (worker.status === "HEALTHY") {
        healthy.push(workerId);
        this.failureCounts.delete(workerId);
      }
    }

    // 2. Inspect expired task and resource leases
    if (this.leaseManager) {
      const expiredLeases = await this.leaseManager.getRecoverableTasks();
      for (const lease of expiredLeases) {
        reclaimed.push(lease.taskId);
        await this.leaseManager.release(lease.taskId, lease.ownerAgentId);
        await this.eventBus.publish("LEASE_RECLAIMED", {
          taskId: lease.taskId,
          previousOwner: lease.ownerAgentId,
        });
      }
    }

    // 3. Sweep active mission budgets
    let missionBreaches: { missionId: string; breachReason: string }[] | undefined;
    if (this.missionManager && typeof (this.missionManager as any).checkActiveMissionBudgets === "function") {
      const breaches = await (this.missionManager as any).checkActiveMissionBudgets();
      missionBreaches = breaches || [];
    }

    const report: WatchdogHealthReport = {
      healthyWorkers: healthy,
      staleWorkers: stale,
      failedWorkers: failed,
      recoveredWorkers: recovered,
      quarantinedWorkers: quarantined,
      reclaimedTasks: reclaimed,
      monitoredAgents: {
        overseerOnline,
        activeGuardiansCount,
        activeSlayersCount,
        activeHealersCount,
      },
      missionBreaches,
      timestamp: new Date().toISOString(),
    };

    await this.eventBus.publish("WATCHDOG_HEALTH_SWEEP", report as any);
    return report;
  }
}
