import { describe, it, expect } from "vitest";
import { CaseReplayEngine } from "../core/cognitive/replay/CaseReplayEngine";
import type { Case } from "../core/contracts/CaseContracts";
import type { DecisionRecord } from "../core/contracts/OverseerThinkingContracts";

describe("FactoryOS Frontier v2 — Phase 15: Case Replay & Counterfactual Evaluation Suite", () => {
  it("1. Counterfactual Policy Replay: Compares alternative candidate repair policy against historical decision", () => {
    const replayEngine = new CaseReplayEngine();

    const mockCase: Case = {
      caseId: "case_hist_01",
      title: "Audio synthesizer drop",
      floorId: "floor03_asset_realization",
      category: "RENDER_ARTIFACT",
      severity: "HIGH",
      status: "RESOLVED",
      detectorId: "slayer_rendering",
      createdAt: new Date().toISOString(),
    } as unknown as Case;

    const historicalDecision: DecisionRecord = {
      decisionId: "dec_hist_01",
      caseId: "case_hist_01",
      optionsConsidered: ["Full Node Restart", "Socket Flush"],
      selectedOption: "Full Node Restart",
      reasoningSummary: "Applied full node restart",
      riskAssessment: 0.4,
      costEstimateTokens: 4000,
      executionTimeMs: 1200,
      timestamp: new Date().toISOString(),
    } as unknown as DecisionRecord;

    const result = replayEngine.replayCase(mockCase, historicalDecision, () => ({
      selectedOption: "Socket Flush",
      tokensEstimated: 800,
      latencyEstimatedMs: 150,
    }));

    expect(result.baselineDecision).toBe("Full Node Restart");
    expect(result.candidateDecision).toBe("Socket Flush");
    expect(result.candidateImprovedEfficiency).toBe(true);
    expect(result.decisionAgreement).toBe(false);
  });
});
