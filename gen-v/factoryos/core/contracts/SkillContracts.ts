/**
 * FactoryOS Frontier v3 — Skill Contracts
 * Defines versioned, machine-readable operational packages and lifecycle stages.
 */

export type SkillLifecycleState =
  | "DRAFT"
  | "VALIDATING"
  | "EXPERIMENTAL"
  | "PROMOTED"
  | "DEPRECATED"
  | "QUARANTINED";

export interface SkillManifest {
  readonly id: string;
  readonly version: string;
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly lifecycleState: SkillLifecycleState;
  readonly targetCapabilities: string[];
  readonly requiredTools: string[];
  readonly requiredPermissions: string[];
  readonly triggerConditions: {
    readonly intents?: string[];
    readonly keywords?: string[];
    readonly taskTypes?: string[];
  };
  readonly safetyBoundaries: {
    readonly maxRiskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    readonly financialBoundUsd?: number;
    readonly isolationRequired?: boolean;
    readonly humanApprovalRequired?: boolean;
  };
  readonly executionSequence: Array<{
    readonly stepIndex: number;
    readonly name: string;
    readonly toolOrAgent: string;
    readonly deterministic: boolean;
    readonly timeoutMs?: number;
  }>;
  readonly decisionRules: Array<{
    readonly condition: string;
    readonly action: string;
  }>;
  readonly evaluationProfile?: {
    readonly isCritical: boolean;
    readonly minSkillLift: number;
    readonly minPassAtK: number;
    readonly tier1Strict: boolean;
    readonly tier2EmbeddingDedup: boolean;
    readonly tier3AgentEval: boolean;
  };
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SkillExecutionPackage {
  readonly manifest: SkillManifest;
  readonly inputsSchema: Record<string, unknown>;
  readonly outputsSchema: Record<string, unknown>;
  readonly policyRules: Record<string, unknown>;
  readonly skillMdContent: string;
}
