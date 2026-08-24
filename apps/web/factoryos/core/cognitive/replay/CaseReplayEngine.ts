/**
 * FactoryOS Frontier v2 — Case Replay Engine & Shadow Agent Runner
 * Enables safe deterministic evaluation of new Overseer policies and shadow agent comparisons.
 */

import { randomUUID } from "node:crypto";
import type { Case } from "../../contracts/CaseContracts";
import type { DecisionRecord } from "../../contracts/OverseerThinkingContracts";

export interface ReplayComparisonResult {
  readonly replayId: string;
  readonly caseId: string;
  readonly baselineDecision: string;
  readonly candidateDecision: string;
  readonly baselineCostTokens: number;
  readonly candidateCostTokens: number;
  readonly baselineLatencyMs: number;
  readonly candidateLatencyMs: number;
  readonly candidateImprovedEfficiency: boolean;
  readonly decisionAgreement: boolean;
  readonly notes: string;
}

export class CaseReplayEngine {
  replayCase(
    caseItem: Case,
    historicalDecision: DecisionRecord,
    candidatePolicyEvaluator: (caseItem: Case) => { selectedOption: string; tokensEstimated: number; latencyEstimatedMs: number }
  ): ReplayComparisonResult {
    const replayId = `rep_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
    const candidateEval = candidatePolicyEvaluator(caseItem);

    const baselineTokens = historicalDecision.costEstimateTokens || 2000;
    const baselineLatency = historicalDecision.executionTimeMs || 800;

    const candidateImproved =
      candidateEval.tokensEstimated < baselineTokens || candidateEval.latencyEstimatedMs < baselineLatency;

    return {
      replayId,
      caseId: caseItem.caseId,
      baselineDecision: historicalDecision.selectedOption,
      candidateDecision: candidateEval.selectedOption,
      baselineCostTokens: baselineTokens,
      candidateCostTokens: candidateEval.tokensEstimated,
      baselineLatencyMs: baselineLatency,
      candidateLatencyMs: candidateEval.latencyEstimatedMs,
      candidateImprovedEfficiency: candidateImproved,
      decisionAgreement: historicalDecision.selectedOption === candidateEval.selectedOption,
      notes: `Candidate evaluated with ${candidateEval.tokensEstimated} tokens (${candidateImproved ? "improved" : "similar"} efficiency).`,
    };
  }
}

export interface ShadowAgentObservation {
  readonly shadowAgentId: string;
  readonly realAgentId: string;
  readonly targetCaseId: string;
  readonly realDiagnosis: string;
  readonly shadowDiagnosis: string;
  readonly confidenceReal: number;
  readonly confidenceShadow: number;
  readonly agreement: boolean;
  readonly latencyDiffMs: number;
}

export class ShadowAgentRunner {
  private observations: ShadowAgentObservation[] = [];

  recordObservation(obs: ShadowAgentObservation): void {
    this.observations.push(structuredClone(obs));
  }

  getPromotionEligibility(shadowAgentId: string): {
    totalObservations: number;
    agreementRate: number;
    isEligibleForPromotion: boolean;
  } {
    const agentObs = this.observations.filter((o) => o.shadowAgentId === shadowAgentId);
    if (agentObs.length < 5) {
      return {
        totalObservations: agentObs.length,
        agreementRate: 0.0,
        isEligibleForPromotion: false,
      };
    }

    const agreements = agentObs.filter((o) => o.agreement).length;
    const rate = agreements / agentObs.length;

    return {
      totalObservations: agentObs.length,
      agreementRate: rate,
      isEligibleForPromotion: rate >= 0.85,
    };
  }
}
