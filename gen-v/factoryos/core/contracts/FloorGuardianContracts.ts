/**
 * FactoryOS Frontier v2 — Floor Guardian Contracts
 * Formal contracts for autonomous local floor operating minds.
 */

export type GuardianStatus =
  | "BOOTING"
  | "ONLINE"
  | "DEGRADED"
  | "RECOVERING"
  | "BLOCKED"
  | "QUARANTINED"
  | "STOPPING"
  | "STOPPED";

export type FloorCondition = "HEALTHY" | "ATTENTION" | "DEGRADED" | "CRITICAL";

export type GuardianActionDecision =
  | "NO_ACTION"
  | "MONITOR"
  | "RETRY"
  | "REBALANCE"
  | "CONTAIN"
  | "RECOVER"
  | "ESCALATE";

export interface GuardianWorkerMetrics {
  readonly tasksAssigned: number;
  readonly tasksCompleted: number;
  readonly tasksFailed: number;
  readonly utilizationPercent: number;
  readonly lastHeartbeat: string;
  readonly isStale: boolean;
  readonly isQuarantined: boolean;
}

export interface GuardianLocalTask {
  readonly taskId: string;
  readonly floorId: string;
  readonly assignedWorkerId?: string;
  readonly status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "BLOCKED";
  readonly priority: number;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly createdAt: string;
  readonly payload?: Record<string, unknown>;
}

export interface GuardianLocalCase {
  readonly caseId: string;
  readonly floorId: string;
  readonly detectorId: string;
  readonly severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly category: string;
  readonly status: "DETECTED" | "TRIAGED" | "RESOLVING" | "RESOLVED" | "ESCALATED" | "FAILED";
  readonly localRepairAttempted: boolean;
  readonly createdAt: string;
}

export interface GuardianReport {
  readonly reportId: string;
  readonly guardianId: string;
  readonly floorId: string;
  readonly status: GuardianStatus;
  readonly healthScore: number; // 0.0 to 1.0
  readonly workerCount: number;
  readonly healthyWorkers: number;
  readonly queueDepth: number;
  readonly activeTasks: number;
  readonly activeCases: number;
  readonly resolvedCases: number;
  readonly actionsTaken: string[];
  readonly remainingRisks: string[];
  readonly resourcePressure: number; // 0.0 to 1.0
  readonly recommendation: string;
  readonly requiresOverseer: boolean;
  readonly evidenceReferences: string[];
  readonly timestamp: string;
}

export interface FloorExperienceRecord {
  readonly memoryId: string;
  readonly floorId: string;
  readonly anomalyType: string;
  readonly successfulAction: string;
  readonly recoveryTimeMs: number;
  readonly timestamp: string;
}
