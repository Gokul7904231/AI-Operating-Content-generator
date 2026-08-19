import { describe, it, expect } from "vitest";
import { SlayerConfidenceEngine } from "../core/slayers/SlayerConfidenceEngine";
import type { AnomalyObservation, SlayerReputation } from "../core/contracts/SlayerContracts";

describe("FactoryOS Frontier v2 — Phase 4: Slayer False-Positive Dampening Suite", () => {
  const confidenceEngine = new SlayerConfidenceEngine(2);

  const reputation: SlayerReputation = {
    agentId: "slayer_general_patrol",
    specialization: "GENERAL_PATROL",
    xp: 100,
    trustScore: 0.95,
    casesDiscovered: 5,
    validAnomalies: 5,
    falsePositives: 0,
    rootCauseAccuracy: 0.95,
    evidenceQualityScore: 0.95,
    lastUpdated: new Date().toISOString(),
  };

  it("1. Transient Noise Dampening: Single low-severity observation is dampened", () => {
    const observation: AnomalyObservation = {
      observationId: "obs_noise_1",
      floorId: "floor02_scripting",
      target: "worker_script_1",
      category: "WORKER_STALL",
      severity: "LOW",
      description: "Minor latency blip",
      rawMetrics: { latencyMs: 35 },
      observedAt: new Date().toISOString(),
    };

    const evalResult = confidenceEngine.evaluateConfidence(observation, reputation);
    expect(evalResult.isConfirmed).toBe(false);
    expect(evalResult.rationale).toContain("Transient signal");
  });

  it("2. Persistent Low-Severity Confirmation: Multi-tick consistent observations confirm anomaly", () => {
    const observation: AnomalyObservation = {
      observationId: "obs_noise_2",
      floorId: "floor02_scripting",
      target: "worker_script_1",
      category: "WORKER_STALL",
      severity: "LOW",
      description: "Minor latency blip",
      rawMetrics: { latencyMs: 35 },
      observedAt: new Date().toISOString(),
    };

    // Second observation on same floor/target
    const evalResult = confidenceEngine.evaluateConfidence(observation, reputation);
    expect(evalResult.isConfirmed).toBe(true);
    expect(evalResult.effectiveConfidence).toBeGreaterThanOrEqual(0.65);
  });

  it("3. Critical Anomaly Immediate Bypass: High/Critical severity is immediately confirmed without dampening delay", () => {
    confidenceEngine.clearAll();

    const criticalObs: AnomalyObservation = {
      observationId: "obs_critical_1",
      floorId: "floor03_asset_realization",
      target: "gpu_render_node",
      category: "RENDER_ARTIFACT",
      severity: "CRITICAL",
      description: "GPU pipeline complete hardware stall",
      rawMetrics: { vramPercent: 100 },
      observedAt: new Date().toISOString(),
    };

    const evalResult = confidenceEngine.evaluateConfidence(criticalObs, reputation);
    expect(evalResult.isConfirmed).toBe(true);
    expect(evalResult.effectiveConfidence).toBeGreaterThanOrEqual(0.9);
    expect(evalResult.rationale).toContain("Immediate confirmation for CRITICAL");
  });
});
