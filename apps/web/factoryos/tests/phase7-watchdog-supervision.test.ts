/**
 * FactoryOS Frontier v2 — Phase 7: Watchdog Supervision 2.0 Complete Suite
 * Tests covering whole-agent heartbeat tracking, suspect states, failure transitions,
 * auto recovery, backoff, quarantine, lease reclamation, and mission budget sweeps.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { FactoryWatchdog } from "../core/watchdog/FactoryWatchdog";
import { HeartbeatTracker } from "../core/watchdog/HeartbeatTracker";
import { CaseManager } from "../core/cases/CaseManager";
import { LeaseManager } from "../core/leases/LeaseManager";
import { MissionManager } from "../core/missions/MissionManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import {
  InMemoryCaseRepository,
  InMemoryWorldStateRepository,
  InMemoryMissionRepository,
  InMemoryLeaseRepository,
} from "../core/database/InMemoryDatabase";

describe("FactoryOS Frontier v2 — Phase 7: Watchdog Supervision 2.0 Suite", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let caseManager: CaseManager;
  let leaseManager: LeaseManager;
  let missionManager: MissionManager;
  let watchdog: FactoryWatchdog;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
    leaseManager = new LeaseManager(new InMemoryLeaseRepository());
    missionManager = new MissionManager(new InMemoryMissionRepository(), eventBus, worldState);
    watchdog = new FactoryWatchdog(
      worldState,
      eventBus,
      caseManager,
      leaseManager,
      6000,
      missionManager,
      {
        suspectThresholdMisses: 1,
        failureThresholdMisses: 3,
        maxRecoveryAttempts: 3,
        recoveryCooldownMs: 100,
        staleThresholdMs: 6000,
        heartbeatIntervalMs: 1000,
      }
    );
  });

  it("1, 2, 3, 4. Heartbeat State Machine: HEALTHY -> SUSPECT -> DEGRADED -> FAILED", () => {
    const tracker = new HeartbeatTracker({
      suspectThresholdMisses: 1,
      failureThresholdMisses: 3,
      heartbeatIntervalMs: 100,
      staleThresholdMs: 500,
    });

    tracker.register("guardian_floor01", "GUARDIAN", 100);

    // Initial state: HEALTHY
    const eval0 = tracker.evaluateHealth(Date.now());
    expect(eval0.healthy.map((r) => r.componentId)).toContain("guardian_floor01");

    // 1 interval missed -> SUSPECT
    const eval1 = tracker.evaluateHealth(Date.now() + 150);
    expect(eval1.suspect.map((r) => r.componentId)).toContain("guardian_floor01");

    // 2 intervals missed -> DEGRADED
    const eval2 = tracker.evaluateHealth(Date.now() + 250);
    expect(eval2.degraded.map((r) => r.componentId)).toContain("guardian_floor01");

    // 3+ intervals missed -> FAILED
    const eval3 = tracker.evaluateHealth(Date.now() + 350);
    expect(eval3.failed.map((r) => r.componentId)).toContain("guardian_floor01");
  });

  it("5, 6, 7, 8, 9. Auto-Recovery, Backoff, Quarantine Limit, and Event Emission", async () => {
    const emittedEvents: string[] = [];
    eventBus.subscribe("AGENT_RECOVERED", async (ev) => {
      emittedEvents.push("AGENT_RECOVERED");
    });
    eventBus.subscribe("AGENT_QUARANTINED", async (ev) => {
      emittedEvents.push("AGENT_QUARANTINED");
    });

    worldState.registerWorker({
      workerId: "flaky_worker_01",
      role: "WORKER",
      specialization: "RENDERING",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 0, tasksFailed: 1, uptimeSeconds: 10, averageLatencyMs: 20 },
    });

    // 1st failure: Recovered (attempt 1/3)
    const report1 = await watchdog.runHealthCheck();
    expect(report1.recoveredWorkers).toContain("flaky_worker_01");

    // Simulate worker failing again
    worldState.updateWorkerHeartbeat("flaky_worker_01", "FAILED");
    await new Promise((resolve) => setTimeout(resolve, 120)); // Pass cooldown

    // 2nd failure: Recovered (attempt 2/3)
    const report2 = await watchdog.runHealthCheck();
    expect(report2.recoveredWorkers).toContain("flaky_worker_01");

    // Simulate worker failing again
    worldState.updateWorkerHeartbeat("flaky_worker_01", "FAILED");
    await new Promise((resolve) => setTimeout(resolve, 120)); // Pass cooldown

    // 3rd failure: Quarantined & Escalated (attempt 3/3 exceeded)
    const report3 = await watchdog.runHealthCheck();
    expect(report3.quarantinedWorkers).toContain("flaky_worker_01");

    expect(emittedEvents).toContain("AGENT_RECOVERED");
    expect(emittedEvents).toContain("AGENT_QUARANTINED");

    // Verify system case created for quarantine
    const activeCases = await caseManager.getActiveCases();
    const quarantineCase = activeCases.find((c) => c.targetWorker === "flaky_worker_01");
    expect(quarantineCase).toBeDefined();
    expect(quarantineCase?.severity).toBe("HIGH");
  });

  it("10. Stale Task Lease Reclamation: Detects and frees expired task leases", async () => {
    // Acquire a short TTL task lease
    await leaseManager.acquire("task_render_442", "worker_crashed_node", 50);

    // Wait for lease TTL expiration
    await new Promise((resolve) => setTimeout(resolve, 70));

    const report = await watchdog.runHealthCheck();
    expect(report.reclaimedTasks).toContain("task_render_442");
  });

  it("14, 15, 16. Subsystem Monitoring: Supervises Guardians, Slayers, Healers, and Overseer", async () => {
    worldState.registerWorker({
      workerId: "overseer_master",
      role: "OPERATOR",
      specialization: "ORCHESTRATION",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 10, tasksFailed: 0, uptimeSeconds: 200, averageLatencyMs: 10 },
    });

    worldState.registerWorker({
      workerId: "guardian_floor02",
      role: "GUARDIAN",
      specialization: "FLOOR_OPERATIONS",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 5, tasksFailed: 0, uptimeSeconds: 150, averageLatencyMs: 15 },
    });

    worldState.registerWorker({
      workerId: "slayer_pipeline_01",
      role: "SLAYER",
      specialization: "PIPELINE_ANOMALY",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 3, tasksFailed: 0, uptimeSeconds: 120, averageLatencyMs: 25 },
    });

    worldState.registerWorker({
      workerId: "healer_rendering_01",
      role: "HEALER",
      specialization: "RENDERING",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 2, tasksFailed: 0, uptimeSeconds: 90, averageLatencyMs: 30 },
    });

    const report = await watchdog.runHealthCheck();

    expect(report.monitoredAgents.overseerOnline).toBe(true);
    expect(report.monitoredAgents.activeGuardiansCount).toBeGreaterThanOrEqual(1);
    expect(report.monitoredAgents.activeSlayersCount).toBeGreaterThanOrEqual(1);
    expect(report.monitoredAgents.activeHealersCount).toBeGreaterThanOrEqual(1);
  });

  it("17 & 18. Mission Budget & Duration Sweeps: Detects breached mission bounds", async () => {
    const mission = await missionManager.createMission({
      goal: "Over-budget test mission",
      priority: 5,
      budget: {
        maxCostUsd: 1.0,
        maxDurationMs: 50, // 50ms duration limit
        maxTokens: 5000,
      },
    });

    await missionManager.startMission(mission.missionId);

    // Wait for duration breach
    await new Promise((resolve) => setTimeout(resolve, 70));

    const report = await watchdog.runHealthCheck();
    expect(report.missionBreaches).toBeDefined();
    expect(report.missionBreaches?.some((b) => b.missionId === mission.missionId)).toBe(true);
  });

  it("19 & 20. Watchdog Event Emission: Emits WATCHDOG_HEALTH_SWEEP periodically", async () => {
    let sweepReceived = false;
    eventBus.subscribe("WATCHDOG_HEALTH_SWEEP", async () => {
      sweepReceived = true;
    });

    await watchdog.runHealthCheck();
    expect(sweepReceived).toBe(true);
  });
});
