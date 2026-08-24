import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Phase 7: Autonomous Watchdog Supervision Runtime Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_watchdog_autonomous_suite");
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
    controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 500,
      supervisorIntervalMs: 500,
      watchdogIntervalMs: 500,
      autoStartSwarm: true,
    });
    await controller.boot();
  });

  afterEach(async () => {
    if (controller) {
      await controller.shutdown();
    }
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("1. Autonomous Worker Supervision & Recovery: Watchdog detects worker failure and auto-recovers in background", async () => {
    let recoveredFired = false;

    controller.eventBus.subscribe("AGENT_RECOVERED", (e: any) => {
      const payload = e?.payload || e;
      if (payload?.agentId === "worker_audio_crash_node") {
        recoveredFired = true;
      }
    });

    controller.worldState.registerWorker({
      workerId: "worker_audio_crash_node",
      role: "WORKER",
      specialization: "AUDIO",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 0, tasksFailed: 1, uptimeSeconds: 10, averageLatencyMs: 20 },
    });

    // Pure autonomous wait (no manual kicks)
    const startTime = Date.now();
    while (!recoveredFired && Date.now() - startTime < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(recoveredFired).toBe(true);

    const state = controller.worldState.getState();
    expect(state.workers["worker_audio_crash_node"].status).toBe("HEALTHY");
  });
});
