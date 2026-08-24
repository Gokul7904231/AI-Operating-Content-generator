import { describe, it, expect, beforeEach } from "vitest";
import { PredictiveFactoryEngine } from "../core/cognitive/predictive/PredictiveFactoryEngine";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";

describe("FactoryOS Frontier v2 — Predictive Factory Suite (Predict -> Prevent -> Verify)", () => {
  let predictiveEngine: PredictiveFactoryEngine;
  let worldState: WorldStateEngine;

  beforeEach(() => {
    predictiveEngine = new PredictiveFactoryEngine();
    worldState = new WorldStateEngine();
  });

  it("01: Detects rising CPU and VRAM exhaustion trends before threshold breach", () => {
    const baseTime = Date.now();

    // Record climbing telemetry over 5 samples (5 minutes)
    predictiveEngine.recordSample({
      timestamp: baseTime,
      cpuPercent: 50,
      memoryUsedMb: 2048,
      vramUsedMb: 2000,
      floorQueueDepths: { floor02_scripting: 2 },
    });

    predictiveEngine.recordSample({
      timestamp: baseTime + 60000,
      cpuPercent: 60,
      memoryUsedMb: 3000,
      vramUsedMb: 3500,
      floorQueueDepths: { floor02_scripting: 5 },
    });

    predictiveEngine.recordSample({
      timestamp: baseTime + 120000,
      cpuPercent: 72,
      memoryUsedMb: 4000,
      vramUsedMb: 5000,
      floorQueueDepths: { floor02_scripting: 8 },
    });

    predictiveEngine.recordSample({
      timestamp: baseTime + 180000,
      cpuPercent: 86,
      memoryUsedMb: 5000,
      vramUsedMb: 6800,
      floorQueueDepths: { floor02_scripting: 12 },
    });

    const trends = predictiveEngine.forecastTrends(worldState.getState());
    expect(trends.length).toBeGreaterThanOrEqual(2);

    const cpuTrend = trends.find((t) => t.metricName === "host_cpu");
    expect(cpuTrend).toBeDefined();
    expect(cpuTrend?.currentRateOfChange).toBeGreaterThan(5.0);
    expect(cpuTrend?.failureProbability).toBeGreaterThan(0.7);

    const vramTrend = trends.find((t) => t.metricName === "gpu_vram");
    expect(vramTrend).toBeDefined();
    expect(vramTrend?.currentRateOfChange).toBeGreaterThan(100);
  });

  it("02: Formulates safe, non-destructive preventive action plans", () => {
    const mockTrends = [
      {
        floorId: "system_kernel",
        metricName: "host_cpu",
        currentRateOfChange: 12.0,
        estimatedTimeToThresholdMs: 45000,
        failureProbability: 0.88,
        severity: "HIGH" as const,
        trendSummary: "CPU climbing rapidly",
      },
      {
        floorId: "floor03_asset_realization",
        metricName: "gpu_vram",
        currentRateOfChange: 500,
        estimatedTimeToThresholdMs: 30000,
        failureProbability: 0.9,
        severity: "HIGH" as const,
        trendSummary: "VRAM climbing rapidly",
      },
    ];

    const actions = predictiveEngine.planPreventiveActions(mockTrends);
    expect(actions.length).toBe(2);

    const throttle = actions.find((a) => a.actionType === "THROTTLE_CONCURRENT_WORKERS");
    expect(throttle).toBeDefined();
    expect(throttle?.riskScore).toBeLessThan(0.3); // Safe action

    const cacheFlush = actions.find((a) => a.actionType === "FLUSH_GPU_TEXTURE_CACHE");
    expect(cacheFlush).toBeDefined();
    expect(cacheFlush?.requiresGuardianApproval).toBe(false);
  });
});
