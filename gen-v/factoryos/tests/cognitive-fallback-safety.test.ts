import { describe, it, expect } from "vitest";
import { CognitivePlaneEngine } from "../core/cognitive/CognitivePlaneEngine";
import { CognitiveRuntime } from "../core/cognitive/CognitiveRuntime";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Fallback & Safety Suite", () => {
  it("1. Deterministic Fallback on Failure: Returns safe recovery strategy without crashing", async () => {
    const plane = new CognitivePlaneEngine();
    const runtime = new CognitiveRuntime(plane);

    // Force failure in context orchestrator to simulate subcall error
    plane.contextOrchestrator.investigator = {
      investigate: async () => {
        throw new Error("Simulated remote LLM / RLM endpoint outage");
      },
    } as any;

    const incident = {
      incidentId: "inc_fallback_01",
      category: "RESOURCE_STARVATION",
      severity: "CRITICAL" as const,
      floorId: "floor03_asset_realization",
      symptoms: ["Catastrophic compute starvation"],
      observedMetrics: { cpuPercent: 99 },
      rawLogs: ["A".repeat(4000)], // Triggers RLM branch
    };

    const response = await runtime.evaluateIncident(incident);
    expect(response).toBeDefined();
    expect(response.fallbackApplied).toBe(true);
    expect(response.complexityLevel).toBe("DETERMINISTIC");
    expect(response.recommendedAction).toBe("DRAIN_AND_RECYCLE_GPU_MEMORY");
    expect(response.rationale).toContain("Safe fallback for resource pressure");
  });
});
