/**
 * FactoryOS Frontier v2 — Mission Contracts
 * Defines the first-class persistent autonomous Mission primitive, state machine, and budget models.
 */

export type MissionState =
  | "CREATED"
  | "PLANNING"
  | "RUNNING"
  | "PAUSED"
  | "BLOCKED"
  | "REPLANNING"
  | "COMPLETING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "TERMINATED";

export interface MissionBudget {
  readonly maxTokens?: number;
  readonly maxCostUsd?: number;
  readonly maxDurationMs?: number;
  readonly maxParallelTasks?: number;
  tokensConsumed: number;
  costUsd: number;
  durationMs: number;
}

export interface MissionProgress {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  percentComplete: number;
  currentPhase: string;
}

export interface MissionEventRecord {
  readonly timestamp: string;
  readonly eventType: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

export type SuccessPredicateType =
  | "FLOOR_HEALTHY"
  | "NO_BLOCKING_CASES"
  | "TASKS_COMPLETE"
  | "VALIDATOR_PASSED"
  | "OBJECTIVE_MET"
  | "RESOURCE_CONDITION_MET";

export interface MissionSuccessCondition {
  readonly id: string;
  readonly predicateType: SuccessPredicateType;
  readonly target?: string;
  readonly expectedValue?: unknown;
  readonly description: string;
}

export interface MissionScope {
  readonly factoryId?: string;
  readonly projectId?: string;
  readonly floorIds?: string[];
  readonly workerIds?: string[];
  readonly agentIds?: string[];
}

export interface MissionCompletionResult {
  readonly eligible: boolean;
  readonly passed: boolean;
  readonly successConditions: { condition: string; passed: boolean; reason?: string }[];
  readonly failedConditions: string[];
  readonly outstandingTasks: string[];
  readonly unresolvedCases: string[];
  readonly validatorResults: { validatorId: string; status: "PASSED" | "FAILED" | "PENDING"; reason?: string }[];
  readonly scopeHealth: { healthy: boolean; issues: string[] };
  readonly objectiveResult: { met: boolean; summary: string };
  readonly evidence: Record<string, unknown>[];
}

export interface Mission {
  readonly missionId: string;
  readonly goal: string;
  readonly objective: string;
  readonly constraints: string[];
  readonly priority: number; // 1 = highest
  version: number;
  status: MissionState;
  readonly createdAt: string;
  updatedAt: string;
  readonly owner: string;
  readonly scope?: MissionScope;
  worldStateSnapshot?: Record<string, unknown>;
  taskIds: string[];
  activeRunId?: string;
  progress: MissionProgress;
  metrics: Record<string, number>;
  readonly successConditions: string[];
  readonly terminationConditions: string[];
  readonly failurePolicy: "RETRY" | "FAIL_FAST" | "REPLAN" | "PAUSE" | "ESCALATE";
  budget: MissionBudget;
  eventHistory: MissionEventRecord[];
  cancellationReason?: string;
  failureReason?: string;
}
