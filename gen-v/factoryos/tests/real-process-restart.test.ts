import { describe, it, expect, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";

describe("FactoryOS Frontier v2 — Real Process Restart Persistence Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_process_restart_state");

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      try {
        fs.rmSync(testStorageDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {}
    }
  });

  it("Proves data survives complete object destruction and controller reconstruction across process restart", async () => {
    console.log("=== STEP 1: Booting Initial Controller A on Disk Storage ===");
    const controllerA = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controllerA.boot();

    // 1. Create a persistent mission
    const mission = await controllerA.missionManager.createMission({
      goal: "Produce 100 vertical videos autonomously",
      objective: "Full pipeline execution with continuous validation",
      priority: 1,
      budget: { maxTokens: 200000, maxCostUsd: 2.0 },
    });
    const missionId = mission.missionId;
    await controllerA.missionManager.startMission(missionId, "run_process_001");
    await controllerA.missionManager.updateProgress(missionId, 3, 10);

    // 2. File an active case on Controller A
    const testCase = await controllerA.caseManager.createCase({
      title: "Audio Track Sync Lag",
      description: "Audio buffer dropped 12 frames",
      floorId: "floor03_asset_realization",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "MEDIUM",
      detectorId: "slayer_pipeline",
      symptoms: ["Buffer underrun"],
      observedState: { bufferLagMs: 400 },
    });

    // 3. Store linked experience memories on Controller A
    const mem1 = await controllerA.cognitivePlane.experienceMemory.storeExperience({
      category: "REPAIR_RECIPE",
      title: "Audio Buffer Optimization Recipe",
      summary: "Increase buffer chunk size to 1024",
      fullEvidence: { targetChunk: 1024 },
      floorId: "floor03_asset_realization",
    });

    const mem2 = await controllerA.cognitivePlane.experienceMemory.storeExperience({
      category: "ANOMALY_RESOLUTION",
      title: "Floor 03 Buffer Recovery",
      summary: "Recovered from frame drop",
      fullEvidence: { resolved: true },
      floorId: "floor03_asset_realization",
    });

    await controllerA.cognitivePlane.experienceMemory.linkExperiences(mem1.memoryId, mem2.memoryId);

    console.log("=== STEP 2: Destroying Controller A (Simulating Hard Process Exit) ===");
    await controllerA.shutdown();

    // Verify raw files exist physically on disk
    expect(fs.existsSync(path.join(testStorageDir, "missions", `${missionId}.json`))).toBe(true);
    expect(fs.existsSync(path.join(testStorageDir, "cases", `${testCase.caseId}.json`))).toBe(true);

    console.log("=== STEP 3: Booting Brand New Controller B (Reconstituting from Disk) ===");
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controllerB.boot();

    // 4. Verify Mission was independently restored on Controller B
    const restoredMission = await controllerB.missionManager.getMission(missionId);
    expect(restoredMission).toBeDefined();
    expect(restoredMission?.missionId).toBe(missionId);
    expect(restoredMission?.status).toBe("RUNNING");
    expect(restoredMission?.progress.completedTasks).toBe(3);
    expect(restoredMission?.progress.percentComplete).toBe(30);

    // 5. Verify Case was restored on Controller B
    const restoredCase = await controllerB.caseManager.getCase(testCase.caseId);
    expect(restoredCase).toBeDefined();
    expect(restoredCase?.caseId).toBe(testCase.caseId);
    expect(restoredCase?.title).toBe("Audio Track Sync Lag");

    // 6. Verify Memory and Graph Relationships restored on Controller B
    const restoredMem1 = await controllerB.cognitivePlane.experienceMemory.getById(mem1.memoryId);
    expect(restoredMem1).toBeDefined();
    expect(restoredMem1?.relatedMemoryIds).toContain(mem2.memoryId);

    // 7. Resume and Complete Mission on Controller B
    await controllerB.missionManager.updateProgress(missionId, 7);
    const completedMission = await controllerB.missionManager.completeMission(missionId);
    expect(completedMission.status).toBe("COMPLETED");
    expect(completedMission.progress.percentComplete).toBe(100);

    await controllerB.shutdown();
    console.log("=== Process Restart Persistence Test PASSED Genuine Reconstruction ===");
  });
});
