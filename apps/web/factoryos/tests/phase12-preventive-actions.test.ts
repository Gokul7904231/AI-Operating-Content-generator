import { describe, it, expect } from "vitest";
import { PredictiveFactoryEngine } from "../core/cognitive/predictive/PredictiveFactoryEngine";
import type { DegradationTrend } from "../core/cognitive/CognitiveContracts";

describe("FactoryOS Frontier v2 — Phase 12: Preventive Action Planning Suite", () => {
  it("1. Non-Destructive Proactive Planning: Plans FLUSH_GPU_TEXTURE_CACHE upon VRAM trend", () => {
    const engine = new PredictiveFactoryEngine();

    const mockTrend: DegradationTrend = {
      floorId: "floor03_asset_realization",
      metricName: "gpu_vram",
      currentRateOfChange: 1500,
      estimatedTimeToThresholdMs: 25000,
      failureProbability: 0.88,
      severity: "HIGH",
      trendSummary: "VRAM consumption growing at +1500MB/min",
    };

    const actions = engine.planPreventiveActions([mockTrend]);

    expect(actions.length).toBe(1);
    expect(actions[0].actionType).toBe("FLUSH_GPU_TEXTURE_CACHE");
    expect(actions[0].riskScore).toBeLessThan(0.3); // Safe, low-risk
  });
});
