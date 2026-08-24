import { describe, it, expect } from "vitest";
import { CognitivePlaneEngine } from "../core/cognitive/CognitivePlaneEngine";
import { CognitiveRuntime } from "../core/cognitive/CognitiveRuntime";

describe("FactoryOS Frontier v2 — Phase 9: Cognitive Memory Influence Suite", () => {
  it("1. Experience Memory Influence: Past successful repair directly influences subsequent incident triage", async () => {
    const plane = new CognitivePlaneEngine();
    const runtime = new CognitiveRuntime(plane);

    // Pre-seed experience memory with past verified repair
    plane.experienceMemory.storeExperience({
      category: "ANOMALY_RESOLUTION",
      title: "VRAM Exhaustion on Asset Realization Floor",
      summary: "Recycle VRAM buffer allocation and downscale texture cache",
      fullEvidence: { rootCause: "Texture cache leak", outcome: "SUCCESS" },
      floorId: "floor03_asset_realization",
      confidence: 0.95,
    });

    // New incident with matching category
    const incident = {
      incidentId: "inc_mem_test_01",
      category: "GPU_SATURATION",
      severity: "HIGH" as const,
      floorId: "floor03_asset_realization",
      symptoms: ["VRAM allocation 99%"],
      observedMetrics: { vramPercent: 99 },
    };

    const response = await runtime.evaluateIncident(incident);

    expect(response.relevantExperience).toBeDefined();
    expect(response.relevantExperience?.length).toBeGreaterThanOrEqual(1);
    expect(response.relevantExperience?.[0].summary).toContain("Recycle VRAM buffer");
    expect(response.rationale).toContain("Recycle VRAM buffer");
  });
});
