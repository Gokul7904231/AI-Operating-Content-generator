import { describe, it, expect } from "vitest";
import { StrategicMetaThinker } from "../core/cognitive/meta/StrategicMetaThinker";
import type { Case } from "../core/contracts/CaseContracts";
import type { WorldState } from "../core/contracts/WorldStateContracts";

describe("FactoryOS Frontier v2 — Phase 9: Cognitive Meta-Thinker Replanning Suite", () => {
  it("1. Meta-Cognition: Detects stalled investigation loop and triggers strategic replan", () => {
    const metaThinker = new StrategicMetaThinker();

    const mockCase: Case = {
      caseId: "case_stalled_01",
      title: "Stalled pipeline investigation",
      floorId: "floor02_scripting",
      category: "PIPELINE_STALL",
      severity: "MEDIUM",
      status: "INVESTIGATING",
      detectorId: "slayer_pipeline",
      createdAt: new Date().toISOString(),
    } as unknown as Case;

    const mockWorldState = {} as WorldState;

    const evaluation = metaThinker.evaluateStrategy(mockCase, mockWorldState, {
      currentPlanSteps: ["Step 1", "Step 2"],
      completedSteps: [],
      evidenceCount: 16,
      iterationCount: 6,
      elapsedTimeMs: 15000,
      activeAgents: ["slayer_pipeline", "slayer_pipeline"], // Duplicate agent detected
      isRepetitiveTelemetry: true,
    });

    expect(evaluation.isInvestigationStuck).toBe(true);
    expect(evaluation.areAgentsDuplicatingWork).toBe(true);
    expect(evaluation.shouldReplan).toBe(true);
    expect(evaluation.recommendedAdjustments.length).toBeGreaterThan(0);
  });
});
