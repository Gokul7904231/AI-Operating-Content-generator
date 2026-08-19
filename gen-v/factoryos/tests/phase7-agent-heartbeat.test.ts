import { describe, it, expect } from "vitest";
import { FactoryWatchdog } from "../core/watchdog/FactoryWatchdog";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS Frontier v2 — Phase 7: Watchdog Agent Heartbeat & Recovery Suite", () => {
  it("1. Whole-Agent Supervision: Tracks agent heartbeats and auto-recovers transiently failed workers", async () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
    const watchdog = new FactoryWatchdog(worldState, eventBus, caseManager, undefined, 5000);

    // Register active agents
    worldState.registerWorker({
      workerId: "overseer_control_plane",
      role: "OPERATOR",
      specialization: "ORCHESTRATION",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 5, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
    });

    worldState.registerWorker({
      workerId: "slayer_compute",
      role: "SLAYER",
      specialization: "GPU_COMPUTE",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 0, tasksFailed: 1, uptimeSeconds: 10, averageLatencyMs: 50 },
    });

    const report = await watchdog.runHealthCheck();

    expect(report.monitoredAgents.overseerOnline).toBe(true);
    expect(report.failedWorkers).toContain("slayer_compute");
    expect(report.recoveredWorkers).toContain("slayer_compute");

    // Worker status should now be updated to HEALTHY
    const state = worldState.getState();
    expect(state.workers["slayer_compute"].status).toBe("HEALTHY");
  });
});
