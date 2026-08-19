/**
 * FactoryOS Frontier v2 — Cognitive Decision Context Contracts
 * Encapsulates the runtime decision context, evidence, and bounds for cognitive reasoning.
 */

import type { AnomalySeverity, CaseEvidence, CaseHypothesis } from "../contracts/CaseContracts";
import type { EvidenceGraph, RecursionBudget } from "./CognitiveContracts";

export type CognitiveComplexityLevel =
  | "DETERMINISTIC"
  | "FAST"
  | "DELIBERATE"
  | "RLM"
  | "MULTI_AGENT";

export interface IncidentContext {
  readonly incidentId: string;
  readonly caseId?: string;
  readonly floorId?: string;
  readonly target?: string;
  readonly category: string;
  readonly severity: AnomalySeverity;
  readonly symptoms: string[];
  readonly observedMetrics: Record<string, unknown>;
  readonly rawLogs?: string[];
  readonly conflictingClaims?: Array<{ agentId: string; claim: string }>;
  readonly candidateActions?: Array<{ actionId: string; title: string; riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" }>;
}

export interface CognitiveDecisionResponse {
  readonly incidentId: string;
  readonly complexityLevel: CognitiveComplexityLevel;
  readonly recommendedAction: string;
  readonly candidateActionId?: string;
  readonly confidence: number; // 0.0 to 1.0
  readonly rootCauseTheory: string;
  readonly rationale: string; // Safe, user-facing summary (never chain-of-thought)
  readonly evidenceIds: string[];
  readonly memoryMatchesCount: number;
  readonly relevantExperience?: Array<{ readonly experienceId: string; readonly title: string; readonly summary: string }>;
  readonly contradictionResolved: boolean;
  readonly simulationEvaluated: boolean;
  readonly rlmActivated: boolean;
  readonly tokensConsumed: number;
  readonly costUsd: number;
  readonly durationMs: number;
  readonly fallbackApplied: boolean;
}
