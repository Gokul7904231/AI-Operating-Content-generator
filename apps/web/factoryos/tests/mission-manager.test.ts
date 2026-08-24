import { describe, it, expect, beforeEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import { MissionManager } from "../core/missions/MissionManager";
import { InMemoryMissionRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS Frontier v2 — Mission Manager & REST API Suite", () => {
  let missionManager: MissionManager;
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    missionManager = new MissionManager(new InMemoryMissionRepository());
    controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();
  });

  it("01: Creates durable mission and advances through lifecycle states", async () => {
    const mission = await missionManager.createMission({
      goal: "Operate the factory autonomously",
      objective: "Maintain 100% floor uptime and process all queued jobs",
      priority: 1,
      budget: { maxTokens: 100000, maxCostUsd: 1.0 },
    });

    expect(mission.missionId).toMatch(/^mission_/);
    expect(mission.status).toBe("CREATED");
    expect(mission.eventHistory.length).toBe(1);

    // Start mission
    const running = await missionManager.startMission(mission.missionId, "run_test_001");
    expect(running.status).toBe("RUNNING");
    expect(running.activeRunId).toBe("run_test_001");

    // Update progress
    const progress = await missionManager.updateProgress(mission.missionId, 2, 5);
    expect(progress.progress.completedTasks).toBe(2);
    expect(progress.progress.percentComplete).toBe(40);

    // Pause mission
    const paused = await missionManager.pauseMission(mission.missionId, "Maintenance window");
    expect(paused.status).toBe("PAUSED");

    // Resume mission
    const resumed = await missionManager.resumeMission(mission.missionId);
    expect(resumed.status).toBe("RUNNING");

    // Complete mission
    const completed = await missionManager.completeMission(mission.missionId);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.progress.percentComplete).toBe(100);
  });

  it("02: Restores active missions across simulated process restart", async () => {
    const repo = new InMemoryMissionRepository();
    const manager1 = new MissionManager(repo);

    const m1 = await manager1.createMission({ goal: "Mission 1" });
    await manager1.startMission(m1.missionId);

    const m2 = await manager1.createMission({ goal: "Mission 2" });
    await manager1.startMission(m2.missionId);

    // Simulate process restart with fresh manager instance
    const manager2 = new MissionManager(repo);
    const restoredCount = await manager2.restoreActiveMissions();

    expect(restoredCount).toBe(2);
    const loaded = await manager2.getMission(m1.missionId);
    expect(loaded).toBeDefined();
    expect(loaded?.status).toBe("RUNNING");
  });

  it("03: POST /api/overseer/command returns 202 with run_id and mission_id", async () => {
    const res = await controller.apiHandler.handleCommand({
      command: "Operate the factory continuously",
      mode: "autonomous",
    });

    expect(res.status).toBe(202);
    expect(res.data.run_id).toBeDefined();
    expect(res.data.mission_id).toBeDefined();
    expect(res.data.status).toBe("accepted");

    // Check mission created in mission manager
    const mission = await controller.missionManager.getMission(res.data.mission_id!);
    expect(mission).toBeDefined();
    expect(mission?.goal).toBe("Operate the factory continuously");
  });

  it("04: REST API mission routes support GET, POST, pause, resume, and stop", async () => {
    // 1. Create mission via API
    const createRes = await controller.apiHandler.handleCreateMission({
      goal: "Generate 50 Shorts",
      priority: 2,
    });
    expect(createRes.status).toBe(201);
    const missionId = (createRes.data as any).missionId;

    // 2. GET /missions/:id
    const getRes = await controller.apiHandler.handleGetMission(missionId);
    expect(getRes.status).toBe(200);
    expect((getRes.data as any).goal).toBe("Generate 50 Shorts");

    // 3. Pause
    const pauseRes = await controller.apiHandler.handlePauseMission(missionId, { reason: "User paused" });
    expect(pauseRes.status).toBe(200);
    expect((pauseRes.data as any).status).toBe("PAUSED");

    // 4. Resume
    const resumeRes = await controller.apiHandler.handleResumeMission(missionId);
    expect(resumeRes.status).toBe(200);
    expect((resumeRes.data as any).status).toBe("RUNNING");

    // 5. Stop
    const stopRes = await controller.apiHandler.handleStopMission(missionId, { reason: "User cancelled" });
    expect(stopRes.status).toBe(200);
    expect((stopRes.data as any).status).toBe("CANCELLED");

    // 6. Plan endpoint
    const planRes = await controller.apiHandler.handleCreatePlan({ goal: "Optimize render queue" });
    expect(planRes.status).toBe(200);
    expect(planRes.data.plan).toBeDefined();
  });
});
