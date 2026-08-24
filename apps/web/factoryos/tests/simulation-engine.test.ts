import { describe, it, expect, beforeEach } from "vitest";
import { SimulationDecisionEngine } from "../core/cognitive/simulation/SimulationDecisionEngine";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";

describe("FactoryOS Frontier v2 — Simulation Decision Engine Suite", () => {
  let simulationEngine: SimulationDecisionEngine;
  let worldState: WorldStateEngine;

  beforeEach(() => {
    simulationEngine = new SimulationDecisionEngine();
    worldState = new WorldStateEngine();
  });

  it("01: Evaluates simulation value: bypasses for low risk and triggers for high uncertainty/risk", () => {
    // Low risk known action
    const lowRiskEval = simulationEngine.evaluateSimulationValue({
      uncertainty: 0.1,
      risk: 0.1,
      irreversibility: false,
      blastRadiusFloors: 1,
      expectedInformationGain: 0.1,
    });
    expect(lowRiskEval.shouldSimulate).toBe(false);
    expect(lowRiskEval.rationale).toContain("Simulation bypassed");

    // High risk multi-floor systemic action
    const highRiskEval = simulationEngine.evaluateSimulationValue({
      uncertainty: 0.8,
      risk: 0.9,
      irreversibility: true,
      blastRadiusFloors: 3,
      expectedInformationGain: 0.7,
    });
    expect(highRiskEval.shouldSimulate).toBe(true);
    expect(highRiskEval.rationale).toContain("Simulation recommended");
  });

  it("02: Simulates candidate options and selects candidate with highest composite score", () => {
    const candidates = [
      {
        actionId: "act_restart_socket",
        name: "Restart Video Socket Adapter",
        description: "Graceful socket recycle",
        estimatedRisk: 0.1,
        isIrreversible: false,
        parameters: { target: "socket_buffer" },
      },
      {
        actionId: "act_purge_cache",
        name: "Force Purge All Caches",
        description: "Hard cache purge across cluster",
        estimatedRisk: 0.6,
        isIrreversible: true,
        parameters: { target: "cluster_cache" },
      },
      {
        actionId: "act_wait_throttle",
        name: "Throttle and Wait 10s",
        description: "Slow down ingestion pipeline",
        estimatedRisk: 0.2,
        isIrreversible: false,
        parameters: { durationMs: 10000 },
      },
    ];

    const result = simulationEngine.simulateCandidates(candidates, worldState.getState());
    expect(result.simulations.length).toBe(3);
    expect(result.selectedCandidate).toBeDefined();
    // Restart or Throttle should score higher than Force Purge
    expect(result.selectedCandidate.actionId).not.toBe("act_purge_cache");
    expect(result.rationale).toContain("scored highest");
  });
});
