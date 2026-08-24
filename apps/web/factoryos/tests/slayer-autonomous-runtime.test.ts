import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Phase 4: True Autonomous Slayer Swarm Runtime Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_slayer_autonomous_suite");
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

  it("1. Pure Autonomous Detection & Investigation: Background Slayer detects anomaly and files case with ZERO manual kicks", async () => {
    let caseCreatedEvent = false;
    let detectedCaseId = "";

    controller.eventBus.subscribe("SLAYER_CASE_CREATED", (e: any) => {
      const payload = e?.payload || e;
      caseCreatedEvent = true;
      detectedCaseId = payload?.caseId;
    });

    // Inject floor 03 error into WorldState
    controller.worldState.updateFloorStatus("floor03_asset_realization", "ERROR", "GPU render pipeline failure");

    // Pure autonomous wait — NO manual calls to slayer.patrol() or slayer.investigate()
    const startTime = Date.now();
    while (!caseCreatedEvent && Date.now() - startTime < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(caseCreatedEvent).toBe(true);
    expect(detectedCaseId).toBeDefined();

    const filedCase = await controller.caseManager.getCase(detectedCaseId);
    expect(filedCase).toBeDefined();
    expect(filedCase?.floorId).toBe("floor03_asset_realization");
    expect(["DETECTED", "INVESTIGATING", "VERIFYING", "RESOLVED"]).toContain(filedCase?.status);

    // Verify Slayer returned to active PATROLLING status
    const slayerHealth = controller.slayerEngine.getSlayer("slayer_general_patrol")?.getHealth();
    expect(slayerHealth?.status).toBe("PATROLLING");
  });

  it("2. Multi-Slayer Cross-Floor Clustering: Correlates upstream/downstream anomalies into composite cluster autonomously", async () => {
    let clusterEventFired = false;

    controller.eventBus.subscribe("SLAYER_ANOMALY_CORRELATED", () => {
      clusterEventFired = true;
    });

    // Inject upstream Floor 01 and downstream Floor 02 anomalies
    controller.worldState.updateFloorStatus("floor01_strategy", "DEGRADED", "Strategy token stall");
    controller.worldState.updateFloorStatus("floor02_scripting", "ERROR", "Scripting input starvation");

    const startTime = Date.now();
    while (!clusterEventFired && Date.now() - startTime < 8000) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    expect(clusterEventFired).toBe(true);
    const clusters = controller.slayerEngine.correlationEngine.getClusters();
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters[0].correlationType).toBe("UPSTREAM_DOWNSTREAM");
  });
});
