import { describe, it, expect } from "vitest";
import { CognitivePlaneEngine } from "../core/cognitive/CognitivePlaneEngine";
import { CognitiveRuntime } from "../core/cognitive/CognitiveRuntime";

describe("FactoryOS Frontier v2 — Phase 5: Cognitive Simulation Gate Suite", () => {
  it("1. Simulation Gate: Evaluates candidate repair options and chooses safest valid action", async () => {
    const plane = new CognitivePlaneEngine();
    const runtime = new CognitiveRuntime(plane);

    const incident = {
      incidentId: "inc_sim_01",
      category: "GPU_SATURATION",
      severity: "HIGH" as const,
      floorId: "floor03_asset_realization",
      symptoms: ["VRAM pressure critical at 98%"],
      observedMetrics: { vramPercent: 98 },
      candidateActions: [
        { actionId: "action_hard_reboot_node", title: "Hard Reboot Compute Node", riskLevel: "CRITICAL" as const },
        { actionId: "action_recycle_rendering_socket", title: "Recycle Rendering Socket", riskLevel: "LOW" as const },
        { actionId: "action_kill_all_workers", title: "Kill All Worker Processes", riskLevel: "HIGH" as const },
      ],
    };

    const response = await runtime.evaluateIncident(incident);
    expect(response).toBeDefined();
    expect(response.simulationEvaluated).toBe(true);
    expect(response.candidateActionId).toBe("action_recycle_rendering_socket");
    expect(response.recommendedAction).toBe("Recycle Rendering Socket");
  });
});
