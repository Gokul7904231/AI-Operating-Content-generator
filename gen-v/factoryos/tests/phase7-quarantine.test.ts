import { describe, it, expect } from "vitest";
import { FactoryWatchdog } from "../core/watchdog/FactoryWatchdog";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS Frontier v2 — Phase 7: Watchdog Agent Quarantine Suite", () => {
  it("1. Repeat Failure Quarantine: Repeatedly failing agent is quarantined and escalated via system case", async () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
    const watchdog = new FactoryWatchdog(worldState, eventBus, caseManager, undefined, 5000);

    worldState.registerWorker({
      workerId: "worker_crash_loop",
      role: "WORKER",
      specialization: "RENDERING",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 0, tasksFailed: 5, uptimeSeconds: 0, averageLatencyMs: 0 },
    });

    // Run 1: Failure 1 (auto-recovered)
    await watchdog.runHealthCheck();
    worldState.updateWorkerHeartbeat("worker_crash_loop", "FAILED");

    // Run 2: Failure 2 (auto-recovered)
    await watchdog.runHealthCheck();
    worldState.updateWorkerHeartbeat("worker_crash_loop", "FAILED");

    // Run 3: Failure 3 -> QUARANTINE
    const report3 = await watchdog.runHealthCheck();

    expect(report3.quarantinedWorkers).toContain("worker_crash_loop");

    const state = worldState.getState();
    expect(state.workers["worker_crash_loop"].status).toBe("QUARANTINED");

    const activeCases = await caseManager.getActiveCases();
    const quarantineCase = activeCases.find((c) => c.targetWorker === "worker_crash_loop");
    expect(quarantineCase).toBeDefined();
    expect(quarantineCase?.title).toContain("quarantined");
  });
});
