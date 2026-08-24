import { describe, it, expect, beforeEach } from "vitest";
import { CaseReplayEngine, ShadowAgentRunner } from "../core/cognitive/replay/CaseReplayEngine";
import type { Case } from "../core/contracts/CaseContracts";
import type { DecisionRecord } from "../core/contracts/OverseerThinkingContracts";

describe("FactoryOS Frontier v2 — Case Replay & Shadow Agent Suite", () => {
  let replayEngine: CaseReplayEngine;
  let shadowRunner: ShadowAgentRunner;

  beforeEach(() => {
    replayEngine = new CaseReplayEngine();
    shadowRunner = new ShadowAgentRunner();
  });

  it("01: Replays historical case trajectory and compares baseline vs candidate policy", () => {
    const mockCase: Case = {
      caseId: "case_hist_replay_01",
      title: "Audio Desync Case",
      description: "Audio desync on Floor 03",
      floorId: "floor03_asset_realization",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "MEDIUM",
      priority: 2,
      status: "RESOLVED",
      detectorId: "slayer_general_patrol",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: ["1.2s desync"],
      observedState: {},
      evidence: [],
      hypotheses: [],
      linkedCaseIds: [],
      assignedHealerIds: ["healer_rendering"],
      healerCountAllocated: 1,
      timeline: [],
    };

    const historicalDecision: DecisionRecord = {
      decisionId: "dec_hist_01",
      goalId: "goal_01",
      stateSnapshot: {},
      thinkingMode: "DEEP",
      availableOptions: ["FFMPEG_RESTART", "ADJUST_ASYNC_FLAG"],
      selectedOption: "ADJUST_ASYNC_FLAG",
      reasoningSummary: "Adjusted async flag",
      predictedOutcome: "Audio synced",
      agentsUsed: ["healer_rendering"],
      toolsUsed: ["ffmpeg_patch"],
      executionTimeMs: 1200,
      costEstimateTokens: 3500,
      verified: true,
      timestamp: new Date().toISOString(),
    };

    const comparison = replayEngine.replayCase(mockCase, historicalDecision, (c) => ({
      selectedOption: "ADJUST_ASYNC_FLAG",
      tokensEstimated: 800, // Reduced from 3500 tokens
      latencyEstimatedMs: 250, // Reduced from 1200ms
    }));

    expect(comparison.replayId).toMatch(/^rep_/);
    expect(comparison.decisionAgreement).toBe(true);
    expect(comparison.candidateImprovedEfficiency).toBe(true);
    expect(comparison.candidateCostTokens).toBe(800);
  });

  it("02: Evaluates shadow agent observations and enforces >=85% agreement for promotion", () => {
    const shadowId = "shadow_slayer_02";

    // Record 6 observations (5 agreed, 1 disagreed = 83.3% -> not eligible)
    for (let i = 0; i < 5; i++) {
      shadowRunner.recordObservation({
        shadowAgentId: shadowId,
        realAgentId: "slayer_compute",
        targetCaseId: `case_${i}`,
        realDiagnosis: "GPU Saturation",
        shadowDiagnosis: "GPU Saturation",
        confidenceReal: 0.95,
        confidenceShadow: 0.94,
        agreement: true,
        latencyDiffMs: -50,
      });
    }

    shadowRunner.recordObservation({
      shadowAgentId: shadowId,
      realAgentId: "slayer_compute",
      targetCaseId: "case_5",
      realDiagnosis: "GPU Saturation",
      shadowDiagnosis: "Driver Glitch",
      confidenceReal: 0.95,
      confidenceShadow: 0.6,
      agreement: false,
      latencyDiffMs: 20,
    });

    const eligibility1 = shadowRunner.getPromotionEligibility(shadowId);
    expect(eligibility1.totalObservations).toBe(6);
    expect(eligibility1.agreementRate).toBeCloseTo(0.833, 2);
    expect(eligibility1.isEligibleForPromotion).toBe(false);

    // Add 2 more agreed observations (7/8 = 87.5% -> eligible)
    for (let i = 6; i < 8; i++) {
      shadowRunner.recordObservation({
        shadowAgentId: shadowId,
        realAgentId: "slayer_compute",
        targetCaseId: `case_${i}`,
        realDiagnosis: "VRAM Leak",
        shadowDiagnosis: "VRAM Leak",
        confidenceReal: 0.96,
        confidenceShadow: 0.95,
        agreement: true,
        latencyDiffMs: -30,
      });
    }

    const eligibility2 = shadowRunner.getPromotionEligibility(shadowId);
    expect(eligibility2.agreementRate).toBe(0.875);
    expect(eligibility2.isEligibleForPromotion).toBe(true);
  });
});
