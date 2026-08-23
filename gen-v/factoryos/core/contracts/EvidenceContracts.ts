/**
 * FactoryOS Frontier v3 — Evidence Contracts
 * Defines immutable machine-readable evidence audit records for mission actions.
 */

export interface MissionEvidence {
  readonly evidenceId: string;
  readonly missionId: string;
  readonly taskId?: string;
  readonly agentRole: string;
  readonly toolId?: string;
  readonly action: string;
  readonly inputHash: string;
  readonly outputHash: string;
  readonly status: "SUCCESS" | "FAILED" | "RECOVERED" | "BLOCKED";
  readonly executionTimeMs: number;
  readonly providerSelected?: string;
  readonly modelSelected?: string;
  readonly workerAssigned?: string;
  readonly estimatedCostUsd: number;
  readonly validationPassed: boolean;
  readonly approvalId?: string;
  readonly errorDetails?: {
    readonly code: string;
    readonly message: string;
    readonly classification: string;
  };
  readonly artifactsProduced?: string[];
  readonly timestamp: string;
}
