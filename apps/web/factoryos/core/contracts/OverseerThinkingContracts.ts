/**
 * FactoryOS v1 — Overseer Thinking & Planning Contracts
 * Defines multi-mode reasoning (Reflex, Deliberate, Deep), Task DAGs, and Decision Ledgers.
 */

export type ThinkingMode = "REFLEX" | "DELIBERATE" | "DEEP";

export type TaskStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "BLOCKED"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "RETRYING";

export interface TaskNode {
  readonly taskId: string;
  readonly name: string;
  readonly description: string;
  readonly requiredAgentType: "SLAYER" | "HEALER" | "VALIDATOR" | "SPECIALIST" | "TOOL" | string;
  readonly targetComponent?: string;
  readonly dependencies: string[]; // taskIds that must succeed first
  readonly payload: Record<string, unknown>;
  status: TaskStatus;
  assignedAgentId?: string;
  attemptCount: number;
  maxAttempts: number;
  result?: Record<string, unknown>;
  error?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface TaskDAG {
  readonly dagId: string;
  readonly goalId: string;
  readonly nodes: Record<string, TaskNode>;
  readonly rootTaskIds: string[];
  readonly createdAt: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED";
}

export interface GoalDefinition {
  readonly goalId: string;
  readonly rawCommand: string;
  readonly objective: string;
  readonly thinkingModeSelected: ThinkingMode;
  readonly modeSelectionReason: string;
  readonly priority: number;
  readonly createdAt: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "PAUSED" | "CANCELLED";
}

export interface DecisionRecord {
  readonly decisionId: string;
  readonly goalId?: string;
  readonly caseId?: string;
  readonly stateSnapshot: Record<string, unknown>;
  readonly thinkingMode: ThinkingMode;
  readonly availableOptions: string[];
  readonly selectedOption: string;
  readonly reasoningSummary: string;
  readonly predictedOutcome: string;
  actualOutcome?: string;
  predictionError?: number;
  readonly agentsUsed: string[];
  readonly toolsUsed: string[];
  readonly executionTimeMs: number;
  readonly costEstimateTokens?: number;
  readonly verified: boolean;
  readonly timestamp: string;
  lessonsLearned?: string[];
}
