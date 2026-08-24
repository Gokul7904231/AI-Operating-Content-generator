/**
 * FactoryOS Frontier v3 — Policy Contracts
 * Defines multi-tiered governance: Cost Governor, Risk Gate, Approvals, and Skill Promotion.
 */

export type CostGovernorMode = "FREE_FIRST" | "BALANCED" | "PERFORMANCE_FIRST";

export type ToolRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type ToolSideEffect = "READ_ONLY" | "MUTATES_STATE" | "EXTERNAL_CALL" | "FINANCIAL" | "DESTRUCTIVE";

export type PolicyDecision = "ALLOW" | "DENY" | "REQUIRE_APPROVAL";

export interface CostGovernorPolicy {
  readonly mode: CostGovernorMode;
  readonly paidFallbackAllowed: boolean;
  readonly maxDailySpendUsd: number;
  readonly maxMonthlySpendUsd: number;
  readonly evaluationBudgetUsd: number;
  currentDailySpendUsd: number;
  currentMonthlySpendUsd: number;
  currentEvalSpendUsd: number;
}

export interface ApprovalRequest {
  readonly approvalId: string;
  readonly missionId: string;
  readonly taskId?: string;
  readonly requestedByAgent: string;
  readonly toolId: string;
  readonly actionName: string;
  readonly riskLevel: ToolRiskLevel;
  readonly reason: string;
  readonly payload: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  resolvedByUserId?: string;
  resolvedAt?: string;
  rejectionReason?: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export interface SkillPromotionThresholds {
  readonly tier1: {
    readonly requireZeroCritical: boolean;
    readonly requireZeroSecurityFindings: boolean;
  };
  readonly tier2: {
    readonly allowHighSimilarity: boolean;
    readonly maxSimilarityScore: number;
  };
  readonly tier3: {
    readonly defaultMinSkillLift: number;
    readonly defaultMinPassAtK: number;
    readonly perSkillOverrides?: Record<string, { minSkillLift: number; minPassAtK: number }>;
  };
}
