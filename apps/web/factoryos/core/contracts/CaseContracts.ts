/**
 * FactoryOS v1 — Case Management Contracts
 * Defines the complete lifecycle, symptoms, evidence, and resolution schemas for operational anomalies.
 */

export type CaseStatus =
  | "DETECTED"
  | "TRIAGED"
  | "INVESTIGATING"
  | "ROOT_CAUSE_IDENTIFIED"
  | "HEALING"
  | "VERIFYING"
  | "RESOLVED"
  | "FAILED"
  | "ROLLED_BACK"
  | "BLOCKED"
  | "ESCALATED"
  | "DUPLICATE";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AnomalyCategory =
  | "FLOOR_EXECUTION_ERROR"
  | "VALIDATION_REJECTION"
  | "RESOURCE_EXHAUSTION"
  | "RESOURCE_STARVATION"
  | "TIMELINE_DESYNC"
  | "NETWORK_TIMEOUT"
  | "RENDER_CORRUPTION"
  | "RENDER_ARTIFACT"
  | "GPU_SATURATION"
  | "STORAGE_DEGRADED"
  | "POLICY_VIOLATION"
  | "PERMISSION_VIOLATION"
  | "WORKER_STALL"
  | "WORKER_CRASH"
  | "HEARTBEAT_TIMEOUT"
  | "DEPENDENCY_FAILURE"
  | "DEPENDENCY_MISSING"
  | "PIPELINE_STALL"
  | "QUEUE_CONGESTION"
  | "CONTENT_SAFETY_VIOLATION"
  | "RAG_GROUNDING_FAILURE"
  | "SCHEMA_VALIDATION_ERROR";

export interface CaseEvidence {
  readonly evidenceId: string;
  readonly type: "LOG" | "METRIC" | "TRACE" | "ARTIFACT" | "DIAGNOSTIC_OUTPUT";
  readonly source: string;
  readonly description: string;
  readonly data: Record<string, unknown>;
  readonly collectedAt: string;
  readonly confidence: number; // 0.0 to 1.0
}

export interface CaseHypothesis {
  readonly hypothesisId: string;
  readonly theory: string;
  readonly likelihood: number; // 0.0 to 1.0
  readonly verified: boolean;
  readonly verifiedBy?: string; // Healer ID or Validator ID
  readonly rationale: string;
  readonly supportingEvidenceIds: string[];
}

export interface CaseTimelineEntry {
  readonly timestamp: string;
  readonly actor: string; // Slayer ID, Overseer, Healer ID, Validator ID
  readonly action: string;
  readonly fromStatus?: CaseStatus;
  readonly toStatus?: CaseStatus;
  readonly notes?: string;
}

export interface Case {
  readonly caseId: string;
  readonly title: string;
  readonly description: string;
  readonly floorId: string;
  readonly targetWorker?: string;
  readonly jobId?: string;
  readonly category: AnomalyCategory;
  readonly severity: AnomalySeverity;
  readonly priority: number; // 1 (highest) to 10 (lowest)
  status: CaseStatus;
  readonly detectorId: string; // Slayer agent ID or Watchdog
  readonly createdAt: string;
  updatedAt: string;
  
  // Investigation & Root Cause
  readonly symptoms: string[];
  readonly observedState: Record<string, unknown>;
  readonly baselineState?: Record<string, unknown>;
  evidence: CaseEvidence[];
  hypotheses: CaseHypothesis[];
  rootCause?: string;
  
  // Triage & Healing
  parentCaseId?: string; // For linking duplicate/cascading anomalies
  linkedCaseIds: string[];
  assignedSlayerId?: string;
  assignedHealerIds: string[];
  healerCountAllocated: number;
  repairPlan?: {
    readonly strategy: string;
    readonly targetComponent: string;
    readonly actions: string[];
    readonly rollbackActions: string[];
  };
  
  // Resolution & Verification
  verificationResults?: {
    readonly verified: boolean;
    readonly validatorId: string;
    readonly metricsNormalized: boolean;
    readonly invariantsPassed: boolean;
    readonly details: string;
  };
  resolutionSummary?: string;
  lessonsLearned?: string[];
  
  // Audit Timeline
  timeline: CaseTimelineEntry[];
}
