import { describe, it, expect } from "vitest";
import { CognitivePlaneEngine } from "../core/cognitive/CognitivePlaneEngine";
import { CognitiveRuntime } from "../core/cognitive/CognitiveRuntime";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Evidence Graph & Contradiction Resolution Suite", () => {
  it("1. Contradiction Resolution: Disputed claims between Guardian and Slayer are resolved via objective evidence", async () => {
    const plane = new CognitivePlaneEngine();
    const runtime = new CognitiveRuntime(plane);

    const incident = {
      incidentId: "inc_dispute_01",
      category: "DISPUTED_CRASH",
      severity: "HIGH" as const,
      floorId: "floor03_asset_realization",
      symptoms: ["Asset realization pipeline blocked"],
      observedMetrics: { vramUsedMb: 7500, driveAvailable: true },
      conflictingClaims: [
        { agentId: "guardian_floor03", claim: "Disk volume corruption" },
        { agentId: "slayer_rendering", claim: "GPU VRAM allocation pool exhausted" },
      ],
    };

    const response = await runtime.evaluateIncident(incident);
    expect(response).toBeDefined();
    expect(response.contradictionResolved).toBe(true);
    expect(response.confidence).toBeGreaterThanOrEqual(0.85);
    expect(response.evidenceIds.length).toBeGreaterThan(0);
    expect(response.rationale).not.toContain("chain-of-thought");
  });
});
