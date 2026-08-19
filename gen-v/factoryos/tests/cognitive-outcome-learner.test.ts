import { describe, it, expect } from "vitest";
import { CognitivePlaneEngine } from "../core/cognitive/CognitivePlaneEngine";
import { CognitiveOutcomeLearner } from "../core/cognitive/CognitiveOutcomeLearner";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Outcome Learning Suite", () => {
  it("1. Closed-Loop Learning: Records verified repair outcome into experience memory", async () => {
    const plane = new CognitivePlaneEngine();
    const learner = new CognitiveOutcomeLearner(plane.experienceMemory, plane.economics);

    await learner.recordOutcome({
      incidentId: "inc_learn_01",
      category: "RENDER_ARTIFACT",
      floorId: "floor03_asset_realization",
      proposedAction: "Recycle Rendering Socket",
      predictedSuccess: true,
      validatorPassed: true,
      durationMs: 450,
      symptoms: ["Black frame detected", "GPU socket timeout"],
    });

    // Verify similar experience is retrievable
    const memories = await plane.experienceMemory.recallByKeywords("RENDER_ARTIFACT Black frame detected");
    expect((memories[0].fullEvidence as any).outcome).toBe("SUCCESS");
    expect(memories[0].successRate).toBe(1.0);

    // Verify prediction error tracking
    expect(learner.getAveragePredictionError()).toBe(0.0);
  });
});
