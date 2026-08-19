/**
 * FactoryOS Frontier v2 — Strategic Meta-Thinker
 * Supervises the reasoning process, detects loops/stalls, evaluates plan validity, and steers high-level strategy.
 */

import { randomUUID } from "node:crypto";
import type { MetaThinkingEvaluation } from "../CognitiveContracts";
import type { Case } from "../../contracts/CaseContracts";
import type { WorldState } from "../../contracts/WorldStateContracts";

export interface ReasoningAuditContext {
  readonly currentPlanSteps: string[];
  readonly completedSteps: string[];
  readonly evidenceCount: number;
  readonly iterationCount: number;
  readonly elapsedTimeMs: number;
  readonly activeAgents: string[];
  readonly isRepetitiveTelemetry: boolean;
}

export class StrategicMetaThinker {
  evaluateStrategy(
    caseItem: Case,
    worldState: WorldState,
    auditContext: ReasoningAuditContext
  ): MetaThinkingEvaluation {
    const evaluationId = `meta_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
    const adjustments: string[] = [];

    // 1. Is investigation stuck?
    const isStuck =
      auditContext.iterationCount > 5 && auditContext.completedSteps.length === 0;
    if (isStuck) {
      adjustments.push("Investigation appears stuck with no completed steps after 5 iterations. Trigger alternative hypothesis testing.");
    }

    // 2. Are we collecting useless/redundant evidence?
    const isCollectingUseless = auditContext.isRepetitiveTelemetry || (auditContext.evidenceCount > 15 && !caseItem.rootCause);
    if (isCollectingUseless) {
      adjustments.push("Excessive redundant evidence collected without root-cause narrowing. Prune context and apply diagnostic probe.");
    }

    // 3. Are agents duplicating work?
    const uniqueAgents = new Set(auditContext.activeAgents);
    const areDuplicating = auditContext.activeAgents.length > uniqueAgents.size;
    if (areDuplicating) {
      adjustments.push("Duplicate agent assignments detected on same target. Reclaim duplicate leases.");
    }

    // 4. Is recursion excessive?
    const isRecursionExcessive = auditContext.elapsedTimeMs > 45000 || auditContext.iterationCount > 8;
    if (isRecursionExcessive) {
      adjustments.push("Recursion depth/time exceeding economic thresholds. Enforce immediate plan synthesis.");
    }

    // 5. Should replan?
    const shouldReplan = isStuck || caseItem.status === "ROLLED_BACK" || caseItem.status === "FAILED";
    if (shouldReplan) {
      adjustments.push("Plan invalidation triggered: construct updated Task DAG with alternative specialist.");
    }

    // 6. Should change allocation?
    const shouldChangeAllocation =
      caseItem.severity === "CRITICAL" && caseItem.assignedHealerIds.length < 2;
    if (shouldChangeAllocation) {
      adjustments.push("Critical severity case under-allocated: augment squad with specialist Diagnostic + Worker healers.");
    }

    const shouldTerminate =
      caseItem.status === "RESOLVED" || (isRecursionExcessive && auditContext.completedSteps.length > 0);

    const planIsStillValid = !shouldReplan && !isStuck;

    const confidenceScore = Math.max(
      0.2,
      1.0 -
        (isStuck ? 0.4 : 0) -
        (isCollectingUseless ? 0.2 : 0) -
        (isRecursionExcessive ? 0.2 : 0)
    );

    return {
      evaluationId,
      planIsStillValid,
      isInvestigationStuck: isStuck,
      isCollectingUselessEvidence: isCollectingUseless,
      areAgentsDuplicatingWork: areDuplicating,
      isRecursionExcessive,
      shouldReplan,
      shouldChangeAllocation,
      shouldTerminate,
      confidenceScore,
      rationale: adjustments.length > 0 ? adjustments.join("; ") : "Current strategy is optimal and progressing as planned.",
      recommendedAdjustments: adjustments,
    };
  }
}
