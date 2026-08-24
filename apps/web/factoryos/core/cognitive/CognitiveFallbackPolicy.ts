/**
 * FactoryOS Frontier v2 — Cognitive Fallback Policy Engine
 * Provides deterministic safe fallbacks when cognitive modules encounter errors, timeouts, or budget exhaustion.
 */

import type { IncidentContext, CognitiveDecisionResponse } from "./CognitiveDecisionContext";

export class CognitiveFallbackPolicy {
  /**
   * Evaluates deterministic safe fallback based on incident severity and scope.
   */
  generateFallbackDecision(
    incident: IncidentContext,
    failureReason: string,
    durationMs: number = 50
  ): CognitiveDecisionResponse {
    let recommendedAction = "RESTART_WORKER";
    let candidateActionId = "action_restart_worker";
    let rationale = `Deterministic safe fallback applied: ${failureReason}`;

    if (incident.category === "RESOURCE_STARVATION" || incident.category === "GPU_SATURATION") {
      recommendedAction = "DRAIN_AND_RECYCLE_GPU_MEMORY";
      candidateActionId = "action_recycle_gpu";
      rationale = `Safe fallback for resource pressure: drain and recycle compute allocations (${failureReason}).`;
    } else if (incident.category === "PIPELINE_STALL" || incident.category === "QUEUE_CONGESTION") {
      recommendedAction = "PAUSE_UPSTREAM_AND_FLUSH_QUEUE";
      candidateActionId = "action_flush_queue";
      rationale = `Safe fallback for pipeline stall: throttle upstream queue intake (${failureReason}).`;
    } else if (incident.severity === "CRITICAL") {
      recommendedAction = "ESCALATE_TO_OVERSEER_AND_QUARANTINE";
      candidateActionId = "action_quarantine";
      rationale = `Critical incident safe fallback: isolate target and escalate (${failureReason}).`;
    }

    return {
      incidentId: incident.incidentId,
      complexityLevel: "DETERMINISTIC",
      recommendedAction,
      candidateActionId,
      confidence: 0.7,
      rootCauseTheory: `Fallback theory for ${incident.category} on ${incident.floorId || "global"}`,
      rationale,
      evidenceIds: [],
      memoryMatchesCount: 0,
      contradictionResolved: false,
      simulationEvaluated: false,
      rlmActivated: false,
      tokensConsumed: 0,
      costUsd: 0,
      durationMs,
      fallbackApplied: true,
    };
  }
}
