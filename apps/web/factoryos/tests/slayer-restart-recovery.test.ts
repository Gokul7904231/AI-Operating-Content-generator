import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Process Restart Recovery Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_slayer_restart_recovery");
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
      watchdogIntervalMs: 1000,
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

  it("1. Slayer Swarm Restart & Lease Reacquisition: Restores all 6 Slayers, reacquires zone leases, and resumes patrol", async () => {
    const slayersBefore = controller.slayerEngine.getAllSlayers();
    expect(slayersBefore.length).toBe(6);

    // Stop Controller A (simulating process exit)
    await controller.stop();

    // Boot fresh Controller B on persistent storage
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 500,
      supervisorIntervalMs: 500,
      watchdogIntervalMs: 1000,
      autoStartSwarm: true,
    });
    await controllerB.boot();

    const slayersAfter = controllerB.slayerEngine.getAllSlayers();
    expect(slayersAfter.length).toBe(6);

    const healthList = controllerB.slayerEngine.getAllSlayerHealth();
    expect(healthList.length).toBe(6);
    for (const h of healthList) {
      expect(h.status).toBe("PATROLLING");
      expect(h.currentZone).toBeDefined();
    }

    await controllerB.shutdown();
  });
});
