import { describe, it, expect } from "vitest";
import { AnalyticsEngine } from "../../lib/analytics/analytics-engine";

describe("FactoryOS v1 — Phase 13: Analytics & Performance Suite", () => {
  // 1. Local Model Cost Rule
  it("enforces local model cost rule (estimatedCostUsd: null, costDisplay: 'N/A (Local Compute)')", () => {
    AnalyticsEngine.recordInference("ollama", "BYOLM", 720, 1500);
    const summary = AnalyticsEngine.getSummary();

    const byolmStat = summary.providerBreakdown.find(p => p.executionMode === "BYOLM");
    expect(byolmStat).toBeDefined();
    expect(byolmStat?.estimatedCostUsd).toBeNull();
    expect(byolmStat?.costDisplay).toBe("N/A (Local Compute)");
    expect(byolmStat?.costDisplay).not.toBe("$0.00");
  });

  // 2. Cloud Model Cost & Token Usage Accounting
  it("tracks token usage and cost for cloud providers", () => {
    AnalyticsEngine.recordInference("google", "CLOUD", 190, 2000, 0.005);
    const summary = AnalyticsEngine.getSummary();

    const cloudStat = summary.providerBreakdown.find(p => p.executionMode === "CLOUD");
    expect(cloudStat).toBeDefined();
    expect(cloudStat?.estimatedCostUsd).toBeGreaterThan(0);
    expect(cloudStat?.totalTokensUsed).toBeGreaterThan(0);
  });

  // 3. Render Speed & System Storage Telemetry
  it("returns render speed metrics and storage utilization summary", () => {
    const summary = AnalyticsEngine.getSummary();
    expect(summary.totalShortsGenerated).toBeGreaterThan(0);
    expect(summary.avgRenderDurationSeconds).toBeGreaterThan(0);
    expect(summary.storageConsumedBytes).toBeDefined();
    expect(summary.storageConsumedBytes.permanent).toBeGreaterThanOrEqual(0);
  });

  // 4. Analytics API Endpoint
  it("serves performance summary via GET /api/analytics/summary", async () => {
    const { GET } = await import("../../app/api/analytics/summary/route");
    const secretKey = process.env.INTERNAL_API_SECRET_KEY || "factoryos-internal-secret-key-2026";
    process.env.INTERNAL_API_SECRET_KEY = secretKey;

    const req = new Request("http://localhost:3000/api/analytics/summary", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary.providerBreakdown).toBeDefined();
    expect(body.provenance?.source).toBe("/api/analytics/summary");
  });
});
