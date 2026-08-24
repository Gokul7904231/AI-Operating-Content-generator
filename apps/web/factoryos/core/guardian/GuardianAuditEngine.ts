/**
 * FactoryOS Frontier v2 — Guardian Audit Engine
 * Inspects floor workers, queue metrics, resource health, and calculates floor health score.
 */

import type { FloorHealthStatus, GuardianAuditReport } from "./GuardianContracts";
import type { FloorState, WorkerState } from "../contracts/WorldStateContracts";
import type { Case } from "../contracts/CaseContracts";

export class GuardianAuditEngine {
  private floorId: string;

  constructor(floorId: string) {
    this.floorId = floorId;
  }

  auditFloor(
    floor: FloorState | undefined,
    workers: WorkerState[],
    activeCases: Case[],
    queueDepth: number = 0
  ): GuardianAuditReport {
    const findings: string[] = [];

    const totalWorkers = workers.length;
    const healthyWorkers = workers.filter((w) => w.status === "HEALTHY").length;
    const failedWorkers = workers.filter((w) => w.status === "FAILED" || w.status === "OFFLINE").length;

    const floorCases = activeCases.filter((c) => c.floorId === this.floorId && c.status !== "RESOLVED");
    const criticalCases = floorCases.filter((c) => c.severity === "CRITICAL");
    const highCases = floorCases.filter((c) => c.severity === "HIGH");

    let score = 1.0;
    let health: FloorHealthStatus = "HEALTHY";

    if (failedWorkers > 0) {
      score -= failedWorkers * 0.25;
      findings.push(`${failedWorkers} worker(s) failed or offline.`);
    }

    if (queueDepth > 15) {
      score -= 0.2;
      findings.push(`Queue congestion detected: ${queueDepth} pending tasks.`);
    }

    if (criticalCases.length > 0) {
      score -= 0.6;
      health = "CRITICAL";
      findings.push(`Critical incident active: ${criticalCases[0].title}`);
    } else if (highCases.length > 0 || floor?.status === "ERROR") {
      score -= 0.4;
      health = "DEGRADED";
      findings.push(`High severity case or floor error active: ${highCases[0]?.title || floor?.status}`);
    } else if (score < 0.7 || floor?.status === "DEGRADED") {
      health = "DEGRADED";
    }

    score = Math.max(0.0, Math.min(1.0, score));

    return {
      floorId: this.floorId,
      timestamp: new Date().toISOString(),
      health,
      score,
      workerCount: totalWorkers,
      healthyWorkers,
      queueDepth,
      activeTasks: floor?.activeJobs?.length || 0,
      failedTasks: failedWorkers,
      recentAnomalies: floorCases.length,
      findings,
      recommendedActions: [],
    };
  }
}
