/**
 * FactoryOS Frontier v2 — Phase 4: Persistent Slayer Swarm Contracts
 * Defines autonomous detective patrol, detection zone leases, investigation budgets,
 * confidence calibration, cross-floor anomaly clustering, and Slayer health schemas.
 */

import type { AnomalyCategory, AnomalySeverity, CaseEvidence, CaseHypothesis } from "./CaseContracts";

export type SlayerSpecialization =
  | "GENERAL_PATROL"
  | "GPU_COMPUTE"
  | "DATABASE"
  | "PIPELINE"
  | "RENDERING"
  | "WORKER_EXECUTION"
  | "API_INFRASTRUCTURE"
  | "CONTENT_QUALITY"
  | "SECURITY_PERMISSION";

export type DetectionZone =
  | "zone_general_patrol"
  | "zone_compute"
  | "zone_pipeline"
  | "zone_rendering"
  | "zone_quality"
  | "zone_security"
  | string;

export interface InvestigationBudget {
  readonly maxInvestigationDepth: number;
  readonly maxDurationMs: number;
  readonly maxEvidenceCount: number;
  readonly maxSubcalls: number;
  readonly maxToolInvocations: number;
  readonly maxTokens: number;
  readonly maxCostUsd: number;
}

export interface SlayerReputation {
  readonly agentId: string;
  readonly specialization: SlayerSpecialization;
  xp: number;
  trustScore: number; // 0.0 to 1.0
  casesDiscovered: number;
  validAnomalies: number;
  falsePositives: number;
  rootCauseAccuracy: number; // 0.0 to 1.0
  evidenceQualityScore: number; // 0.0 to 1.0
  lastUpdated: string;
}

export interface AnomalyObservation {
  readonly observationId: string;
  readonly floorId: string;
  readonly target: string;
  readonly category: AnomalyCategory;
  readonly severity: AnomalySeverity;
  readonly description: string;
  readonly rawMetrics: Record<string, unknown>;
  readonly observedAt: string;
}

export interface SlayerReport {
  readonly reportId: string;
  readonly slayerId: string;
  readonly specialization: SlayerSpecialization;
  readonly observation: AnomalyObservation;
  readonly symptoms: string[];
  readonly correlatedEvents: string[];
  readonly hypotheses: CaseHypothesis[];
  readonly evidence: CaseEvidence[];
  readonly estimatedRootCause: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly suggestedSeverity: AnomalySeverity;
  readonly suggestedActions: string[];
  readonly generatedAt: string;
}

export interface SlayerAgentConfig {
  readonly agentId: string;
  readonly name: string;
  readonly specialization: SlayerSpecialization;
  readonly zoneId: DetectionZone;
  readonly patrolIntervalMs: number;
  readonly targetFloors: string[];
  readonly maxConcurrentInvestigations?: number;
  readonly budget?: Partial<InvestigationBudget>;
}

export interface SlayerCluster {
  readonly clusterId: string;
  readonly memberCaseIds: string[];
  readonly affectedFloorIds: string[];
  readonly correlationType:
    | "UPSTREAM_DOWNSTREAM"
    | "SHARED_RESOURCE"
    | "COMMON_ROOT_CAUSE"
    | "TEMPORAL"
    | "UNKNOWN";
  readonly confidence: number;
  readonly evidenceIds: string[];
  readonly rootCauseHypothesis: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AnomalyCorrelation {
  readonly sourceAnomalyId: string;
  readonly targetAnomalyId: string;
  readonly relationship:
    | "CAUSES"
    | "DEPENDS_ON"
    | "AMPLIFIES"
    | "CORRELATED_WITH"
    | "SHARES_RESOURCE";
  readonly confidence: number;
  readonly evidenceIds: string[];
}

export interface SlayerHealth {
  readonly slayerId: string;
  readonly specialization: SlayerSpecialization;
  readonly status:
    | "STARTING"
    | "PATROLLING"
    | "INVESTIGATING"
    | "REPORTING"
    | "DEGRADED"
    | "RECOVERING"
    | "QUARANTINED";
  readonly lastHeartbeat: string;
  readonly currentZone?: string;
  readonly currentInvestigationId?: string;
  readonly investigationsCompleted: number;
  readonly falsePositiveRate: number;
  readonly confidenceScore: number;
}
