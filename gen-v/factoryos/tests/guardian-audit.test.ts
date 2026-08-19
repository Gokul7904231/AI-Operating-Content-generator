import { describe, it, expect } from "vitest";
import { GuardianAuditEngine } from "../core/guardian/GuardianAuditEngine";
import type { FloorState, WorkerState } from "../core/contracts/WorldStateContracts";

describe("FactoryOS Frontier v2 — Floor Guardian Audit Engine Suite", () => {
  const auditEngine = new GuardianAuditEngine("floor03_asset_realization");

  it("1. Health Classification & Scoring: Healthy floor yields score 1.0", () => {
    const floor: FloorState = {
      floorId: "floor03_asset_realization",
      name: "Floor 03 — Asset Realization",
      status: "ONLINE",
      activeWorkers: 2,
      queueDepth: 2,
      activeJobs: [],
      lastHeartbeat: new Date().toISOString(),
      recentAnomalies: [],
    };

    const workers: WorkerState[] = [
      {
        workerId: "worker_f03_render_1",
        role: "EXECUTOR",
        specialization: "floor03_asset_realization",
        status: "HEALTHY",
        lastSeen: new Date().toISOString(),
        metrics: { tasksCompleted: 10, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
      },
    ];

    const report = auditEngine.auditFloor(floor, workers, [], 2);
    expect(report.health).toBe("HEALTHY");
    expect(report.score).toBe(1.0);
    expect(report.healthyWorkers).toBe(1);
  });

  it("2. Anomaly Degradation: Failed worker reduces score and marks DEGRADED", () => {
    const floor: FloorState = {
      floorId: "floor03_asset_realization",
      name: "Floor 03 — Asset Realization",
      status: "DEGRADED",
      activeWorkers: 2,
      queueDepth: 4,
      activeJobs: [],
      lastHeartbeat: new Date().toISOString(),
      recentAnomalies: [],
    };

    const workers: WorkerState[] = [
      {
        workerId: "worker_f03_render_1",
        role: "EXECUTOR",
        specialization: "floor03_asset_realization",
        status: "FAILED",
        lastSeen: new Date().toISOString(),
        metrics: { tasksCompleted: 10, tasksFailed: 2, uptimeSeconds: 100, averageLatencyMs: 20 },
      },
    ];

    const report = auditEngine.auditFloor(floor, workers, [], 4);
    expect(report.health).toBe("DEGRADED");
    expect(report.score).toBeLessThanOrEqual(0.75);
    expect(report.findings.length).toBeGreaterThan(0);
  });
});
