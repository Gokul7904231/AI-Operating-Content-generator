import { describe, it, expect } from "vitest";
import { ShadowAgentRunner } from "../core/cognitive/replay/CaseReplayEngine";

describe("FactoryOS Frontier v2 — Phase 15: Shadow Agent Promotion Safety Suite", () => {
  it("1. Shadow Agent Evaluation: Calculates agreement rate and checks promotion eligibility", () => {
    const runner = new ShadowAgentRunner();

    // Record 5 observations with high agreement (4/5 = 80% < 85%)
    for (let i = 0; i < 4; i++) {
      runner.recordObservation({
        shadowAgentId: "shadow_healer_v2",
        realAgentId: "healer_rendering",
        targetCaseId: `case_${i}`,
        realDiagnosis: "Socket timeout",
        shadowDiagnosis: "Socket timeout",
        confidenceReal: 0.9,
        confidenceShadow: 0.95,
        agreement: true,
        latencyDiffMs: -50,
      });
    }
    runner.recordObservation({
      shadowAgentId: "shadow_healer_v2",
      realAgentId: "healer_rendering",
      targetCaseId: "case_4",
      realDiagnosis: "Socket timeout",
      shadowDiagnosis: "Kernel panic",
      confidenceReal: 0.9,
      confidenceShadow: 0.6,
      agreement: false,
      latencyDiffMs: 10,
    });

    const evalResult = runner.getPromotionEligibility("shadow_healer_v2");
    expect(evalResult.totalObservations).toBe(5);
    expect(evalResult.agreementRate).toBe(0.8);
    expect(evalResult.isEligibleForPromotion).toBe(false); // Below 85% threshold
  });
});
