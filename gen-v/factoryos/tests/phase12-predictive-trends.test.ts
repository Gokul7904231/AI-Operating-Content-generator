import { describe, it, expect } from "vitest";
import { PredictiveFactoryEngine } from "../core/cognitive/predictive/PredictiveFactoryEngine";
import type { WorldState } from "../core/contracts/WorldStateContracts";

describe("FactoryOS Frontier v2 — Phase 12: Predictive Telemetry Trends Suite", () => {
  it("1. Trend Detection: Forecasts VRAM exhaustion when usage climbs rapidly", () => {
    const engine = new PredictiveFactoryEngine();

    const mockWorldState: WorldState = {
      resources: { vramTotalMb: 8192, cpuPercent: 50, memoryUsedMb: 4000, memoryTotalMb: 16000, vramUsedMb: 6000, gpuAvailable: true, networkOnline: true, driveAvailable: true },
      floors: {},
      workers: {},
      activeCaseIds: [],
      activeRunIds: [],
      activeRepairs: [],
      factoryStatus: "OPERATIONAL",
      sequenceNumber: 1,
      schemaVersion: "1.0.0",
      systemConfidence: 0.95,
      updatedAt: new Date().toISOString(),
    };

    const now = Date.now();
    // Simulate rapid VRAM increase from 4500MB to 6000MB over 1 minute
    engine.recordSample({ timestamp: now - 60000, cpuPercent: 30, memoryUsedMb: 4000, vramUsedMb: 4500, floorQueueDepths: {} });
    engine.recordSample({ timestamp: now - 30000, cpuPercent: 40, memoryUsedMb: 4000, vramUsedMb: 5200, floorQueueDepths: {} });
    engine.recordSample({ timestamp: now, cpuPercent: 50, memoryUsedMb: 4000, vramUsedMb: 6000, floorQueueDepths: {} });

    const trends = engine.forecastTrends(mockWorldState);

    expect(trends.length).toBeGreaterThanOrEqual(1);
    const vramTrend = trends.find((t) => t.metricName === "gpu_vram");
    expect(vramTrend).toBeDefined();
    expect(vramTrend?.severity).toBe("HIGH");
    expect(vramTrend?.trendSummary).toContain("VRAM");
  });
});
