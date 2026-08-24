import { describe, it, expect, beforeEach } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { LeaseManager } from "../core/leases/LeaseManager";
import { FactoryWatchdog } from "../core/watchdog/FactoryWatchdog";

describe("FactoryOS v1 — Factory Watchdog & Recovery Suite", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let leaseManager: LeaseManager;
  let caseManager: CaseManager;
  let watchdog: FactoryWatchdog;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine();
    leaseManager = new LeaseManager();
    caseManager = new CaseManager(undefined, eventBus, worldState);
    watchdog = new FactoryWatchdog(worldState, eventBus, caseManager, leaseManager, 1000);
  });

  it("01: Detects failed workers and automatically recovers them", async () => {
    worldState.registerWorker({
      workerId: "test_worker_failed",
      role: "SLAYER",
      specialization: "GENERAL_PATROL",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 5, tasksFailed: 1, uptimeSeconds: 50, averageLatencyMs: 10 },
    });

    const report = await watchdog.runHealthCheck();
    expect(report.failedWorkers).toContain("test_worker_failed");
    expect(report.recoveredWorkers).toContain("test_worker_failed");
    expect(worldState.getState().workers["test_worker_failed"].status).toBe("HEALTHY");
  });

  it("02: Quarantines workers that repeatedly fail health checks", async () => {
    worldState.registerWorker({
      workerId: "test_worker_repeat_fail",
      role: "HEALER",
      specialization: "WORKER",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 1, tasksFailed: 3, uptimeSeconds: 10, averageLatencyMs: 50 },
    });

    // Run 3 consecutive failure cycles
    await watchdog.runHealthCheck();
    worldState.updateWorkerHeartbeat("test_worker_repeat_fail", "FAILED");
    await watchdog.runHealthCheck();
    worldState.updateWorkerHeartbeat("test_worker_repeat_fail", "FAILED");
    await watchdog.runHealthCheck();

    expect(worldState.getState().workers["test_worker_repeat_fail"].status).toBe("QUARANTINED");
    const activeCases = await caseManager.getActiveCases();
    const quarantineCase = activeCases.find((c) => c.targetWorker === "test_worker_repeat_fail");
    expect(quarantineCase).toBeDefined();
    expect(quarantineCase?.title).toContain("quarantined");
  });

  it("03: Reclaims expired task ownership leases and publishes failure event", async () => {
    // Acquire lease with short TTL (10ms)
    await leaseManager.acquire("task_abandoned_01", "crashed_worker", 10);

    // Wait for expiration
    await new Promise((r) => setTimeout(r, 25));

    const report = await watchdog.runHealthCheck();
    expect(report.reclaimedTasks).toContain("task_abandoned_01");

    const events = await eventBus.replay();
    const reclaimedEv = events.find((e) => e.topic === "LEASE_RECLAIMED" && (e.payload as any).taskId === "task_abandoned_01");
    expect(reclaimedEv).toBeDefined();
  });
});
