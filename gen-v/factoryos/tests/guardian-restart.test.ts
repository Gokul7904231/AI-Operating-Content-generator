import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Floor Guardian Process Restart Recovery Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_guardian_restart_runtime");
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

  it("1. Guardian State Reconstruction: Restores all 4 floor guardians across process restart", async () => {
    const guardiansBefore = controller.guardianManager.getAllGuardians();
    expect(guardiansBefore.length).toBe(4);

    // Stop Controller A
    await controller.stop();

    // Boot Controller B on same persisted storage
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 500,
      supervisorIntervalMs: 500,
      watchdogIntervalMs: 1000,
      autoStartSwarm: true,
    });

    await controllerB.boot();

    const guardiansAfter = controllerB.guardianManager.getAllGuardians();
    expect(guardiansAfter.length).toBe(4);

    for (const g of guardiansAfter) {
      expect(g.floorId).toBeDefined();
      expect(g.getState()).toBeDefined();
    }

    await controllerB.shutdown();
  });
});
