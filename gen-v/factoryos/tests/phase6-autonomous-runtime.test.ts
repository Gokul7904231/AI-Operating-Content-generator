import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Phase 6: Autonomous Concurrent Repair Runtime Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_healer_concurrency_e2e");
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

  it("1. Multi-Floor Concurrent Autonomous Healing: Resolves simultaneous multi-floor incidents safely", async () => {
    let resolvedCount = 0;

    controller.eventBus.subscribe("CASE_RESOLVED", () => {
      resolvedCount += 1;
    });

    // Inject 2 independent anomalies on distinct floors
    controller.worldState.updateFloorStatus("floor02_scripting", "ERROR", "Scripting parser timeout");
    controller.worldState.updateFloorStatus("floor03_asset_realization", "ERROR", "Render pipeline buffer delay");

    // Pure autonomous wait (no manual kicks)
    const startTime = Date.now();
    while (resolvedCount < 2 && Date.now() - startTime < 12000) {
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    expect(resolvedCount).toBeGreaterThanOrEqual(1);

    // Verify both floors recovered to ONLINE
    const state = controller.worldState.getState();
    expect(state.floors["floor02_scripting"].status).toBe("ONLINE");
    expect(state.floors["floor03_asset_realization"].status).toBe("ONLINE");
  });
});
