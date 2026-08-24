import { describe, it, expect, afterEach, beforeEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { MissionManager } from "../core/missions/MissionManager";
import { DiskMissionRepository, PersistentDiskDatabase } from "../core/database/PersistentDiskDatabase";
import { InMemoryMissionRepository } from "../core/database/InMemoryDatabase";
import { MissionStateMachine, InvalidMissionStateTransitionError } from "../core/missions/MissionStateMachine";
import { MissionConcurrencyConflictError } from "../core/missions/MissionErrors";
import { MissionCompletionEvaluator } from "../core/missions/MissionCompletionEvaluator";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import { TaskDAGExecutor } from "../core/overseer/TaskDAGPlanner";
import { TaskDAG } from "../core/contracts/OverseerThinkingContracts";

describe("FactoryOS Frontier v2 — Hardened Mission System Architecture Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_mission_hardened_suite");

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  describe("1. State Machine & Transition Rules", () => {
    it("Enforces valid state transitions and blocks invalid/terminal transitions", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({
        goal: "State machine verification mission",
        priority: 1,
      });

      expect(mission.status).toBe("CREATED");

      // Valid: CREATED -> RUNNING (via startMission CREATED -> PLANNING -> RUNNING)
      const running = await manager.startMission(mission.missionId);
      expect(running.status).toBe("RUNNING");

      // Valid: RUNNING -> PAUSED -> RUNNING
      const paused = await manager.pauseMission(mission.missionId, "Pause test");
      expect(paused.status).toBe("PAUSED");

      const resumed = await manager.resumeMission(mission.missionId);
      expect(resumed.status).toBe("RUNNING");

      // Invalid direct transition: CREATED state cannot jump straight from COMPLETED or FAILED
      expect(() =>
        MissionStateMachine.assertTransition(mission.missionId, "CREATED", "COMPLETED")
      ).toThrow(InvalidMissionStateTransitionError);

      // Terminal state check: COMPLETED cannot transition to anything
      expect(() =>
        MissionStateMachine.assertTransition(mission.missionId, "COMPLETED", "RUNNING")
      ).toThrow(InvalidMissionStateTransitionError);

      // System TERMINATED transition
      const terminated = await manager.terminateMission(mission.missionId, "System administrative shutdown");
      expect(terminated.status).toBe("TERMINATED");

      // Terminal check: TERMINATED cannot transition out
      expect(() =>
        MissionStateMachine.assertTransition(mission.missionId, "TERMINATED", "RUNNING")
      ).toThrow(InvalidMissionStateTransitionError);
    });
  });

  describe("2. Persistence & Multi-Runtime Restart Test (Runtime A -> Destroy -> Runtime B)", () => {
    it("Proves mission state survives destruction of Runtime A instance and continues on Runtime B", async () => {
      const diskDb = new PersistentDiskDatabase(testStorageDir);
      const repos = diskDb.getRepos();

      // Runtime A
      let runtimeA: MissionManager | null = new MissionManager(repos.missions);
      const missionA = await runtimeA.createMission({
        goal: "Multi-runtime process crash mission",
        budget: { maxTokens: 100000, maxCostUsd: 1.5 },
        scope: { projectId: "proj_alpha", floorIds: ["floor01_scripting", "floor02_audio"] },
      });
      const missionId = missionA.missionId;

      await runtimeA.startMission(missionId, "run_runtime_a");
      await runtimeA.updateProgress(missionId, 4, 10);
      await runtimeA.recordBudgetConsumption(missionId, { tokens: 15000, costUsd: 0.15 });

      const stateBeforeCrash = await runtimeA.getMission(missionId);
      expect(stateBeforeCrash?.status).toBe("RUNNING");
      expect(stateBeforeCrash?.progress.completedTasks).toBe(4);
      expect(stateBeforeCrash?.version).toBeGreaterThanOrEqual(4);

      // DESTROY Runtime A instance completely
      runtimeA = null;

      // Runtime B (Fresh instance reconstituted from disk)
      const diskDbB = new PersistentDiskDatabase(testStorageDir);
      const reposB = diskDbB.getRepos();
      const runtimeB = new MissionManager(reposB.missions);

      const restoredCount = await runtimeB.restoreActiveMissions();
      expect(restoredCount).toBe(1);

      const missionB = await runtimeB.getMission(missionId);
      expect(missionB).toBeDefined();
      expect(missionB?.missionId).toBe(missionId);
      expect(missionB?.status).toBe("RUNNING");
      expect(missionB?.progress.completedTasks).toBe(4);
      expect(missionB?.metrics.tokensConsumed).toBe(15000);
      expect(missionB?.scope?.projectId).toBe("proj_alpha");

      // Continue execution on Runtime B
      await runtimeB.updateProgress(missionId, 6);
      const progressB = await runtimeB.getMission(missionId);
      expect(progressB?.progress.completedTasks).toBe(10);
      expect(progressB?.progress.percentComplete).toBe(100);
    });
  });

  describe("3. Optimistic Concurrency Control (OCC) & Conflict Resolution", () => {
    it("Detects stale version conflict and successfully executes reload + merge/retry", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({ goal: "Concurrent update mission" });
      const missionId = mission.missionId;
      await manager.startMission(missionId);

      // Simulate low-level stale update attempt directly against repository with version mismatch
      const fresh = await repo.getMissionById(missionId);
      expect(fresh).toBeDefined();
      const staleVersion = fresh!.version;

      // First save increments version
      await repo.saveMission({ ...fresh!, goal: "Updated by Agent 1" }, staleVersion);

      // Second save with SAME staleVersion must throw MissionConcurrencyConflictError
      await expect(
        repo.saveMission({ ...fresh!, goal: "Updated by Agent 2" }, staleVersion)
      ).rejects.toThrow(MissionConcurrencyConflictError);

      // Manager level atomic update automatically handles retries
      const parallel1 = manager.updateProgress(missionId, 1, 10);
      const parallel2 = manager.recordBudgetConsumption(missionId, { tokens: 1000 });
      const parallel3 = manager.updateProgress(missionId, 2);

      await Promise.all([parallel1, parallel2, parallel3]);

      const finalState = await manager.getMission(missionId);
      expect(finalState).toBeDefined();
      expect(finalState!.progress.completedTasks).toBe(3);
      expect(finalState!.metrics.tokensConsumed).toBe(1000);
      expect(finalState!.version).toBeGreaterThan(staleVersion);
    });
  });

  describe("4. Budget Enforcement (Tokens, Cost, Duration, Max Parallelism)", () => {
    it("Triggers MISSION_BUDGET_EXCEEDED on token breach and applies FAIL_FAST policy", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({
        goal: "Token budget test",
        failurePolicy: "FAIL_FAST",
        budget: { maxTokens: 1000, maxCostUsd: 10.0 },
      });
      await manager.startMission(mission.missionId);

      const res = await manager.recordBudgetConsumption(mission.missionId, { tokens: 1500 });
      expect(res.budgetExceeded).toBe(true);
      expect(res.mission.status).toBe("FAILED");
      expect(res.mission.failureReason).toContain("Token budget exceeded");
    });

    it("Triggers MISSION_BUDGET_EXCEEDED on cost breach and applies PAUSE policy", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({
        goal: "Cost budget test",
        failurePolicy: "PAUSE",
        budget: { maxTokens: 10000, maxCostUsd: 0.5 },
      });
      await manager.startMission(mission.missionId);

      const res = await manager.recordBudgetConsumption(mission.missionId, { costUsd: 0.75 });
      expect(res.budgetExceeded).toBe(true);
      expect(res.mission.status).toBe("PAUSED");
    });

    it("Triggers duration budget breach check", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({
        goal: "Duration budget test",
        failurePolicy: "FAIL_FAST",
        budget: { maxDurationMs: 100 }, // 100ms
      });
      await manager.startMission(mission.missionId);

      // Wait 150ms to exceed duration budget
      await new Promise((r) => setTimeout(r, 150));

      const res = await manager.recordBudgetConsumption(mission.missionId, { tokens: 10 });
      expect(res.budgetExceeded).toBe(true);
      expect(res.mission.status).toBe("FAILED");
      expect(res.mission.failureReason).toContain("Duration budget exceeded");
    });

    it("Enforces maxParallelTasks limit inside TaskDAGExecutor", async () => {
      const executor = new TaskDAGExecutor();

      const dag: TaskDAG = {
        dagId: "dag_parallel_test",
        goalId: "goal_001",
        rootTaskIds: ["t1", "t2", "t3", "t4", "t5"],
        status: "PENDING",
        createdAt: new Date().toISOString(),
        nodes: {
          t1: { taskId: "t1", name: "Task 1", description: "Task 1", requiredAgentType: "TOOL", status: "PENDING", dependencies: [], payload: {}, attemptCount: 0, maxAttempts: 1 },
          t2: { taskId: "t2", name: "Task 2", description: "Task 2", requiredAgentType: "TOOL", status: "PENDING", dependencies: [], payload: {}, attemptCount: 0, maxAttempts: 1 },
          t3: { taskId: "t3", name: "Task 3", description: "Task 3", requiredAgentType: "TOOL", status: "PENDING", dependencies: [], payload: {}, attemptCount: 0, maxAttempts: 1 },
          t4: { taskId: "t4", name: "Task 4", description: "Task 4", requiredAgentType: "TOOL", status: "PENDING", dependencies: [], payload: {}, attemptCount: 0, maxAttempts: 1 },
          t5: { taskId: "t5", name: "Task 5", description: "Task 5", requiredAgentType: "TOOL", status: "PENDING", dependencies: [], payload: {}, attemptCount: 0, maxAttempts: 1 },
        },
      };

      let activeCount = 0;
      let maxObservedParallel = 0;

      const mockExecutor = async () => {
        activeCount++;
        maxObservedParallel = Math.max(maxObservedParallel, activeCount);
        await new Promise((r) => setTimeout(r, 20));
        activeCount--;
        return { status: "OK" };
      };

      // Limit maxParallelTasks to 2
      const executed = await executor.executeDAG(dag, { TOOL: mockExecutor }, { maxParallelTasks: 2 });
      expect(executed.status).toBe("COMPLETED");
      expect(maxObservedParallel).toBeLessThanOrEqual(2);
    });
  });

  describe("5. MissionCompletionEvaluator & Administrative Bypass Rules", () => {
    it("Rejects completion when there is an unresolved high-severity case in scope", async () => {
      const controller = new AutonomousFactoryController({ autoStartSwarm: false });
      await controller.boot();

      const mission = await controller.missionManager.createMission({
        goal: "Floor completion test",
        scope: { floorIds: ["floor03_asset_realization"] },
      });
      await controller.missionManager.startMission(mission.missionId);

      // File an active HIGH severity case on floor 03
      await controller.caseManager.createCase({
        title: "Critical Frame Buffer Corruption",
        description: "Buffer overflow on floor 03",
        floorId: "floor03_asset_realization",
        category: "FLOOR_EXECUTION_ERROR",
        severity: "HIGH",
        detectorId: "slayer_test",
        symptoms: ["Buffer overflow"],
        observedState: { bufferSize: 1024 },
      });

      // Standard completeMission MUST be rejected by MissionCompletionEvaluator
      await expect(
        controller.missionManager.completeMission(mission.missionId)
      ).rejects.toThrow(/Unresolved cases remaining/);

      await controller.shutdown();
    });

    it("Completes mission successfully when all completion conditions are satisfied", async () => {
      const controller = new AutonomousFactoryController({ autoStartSwarm: false });
      await controller.boot();

      const mission = await controller.missionManager.createMission({
        goal: "Healthy completion test",
        scope: { floorIds: ["floor02_scripting"] },
      });
      await controller.missionManager.startMission(mission.missionId);
      await controller.missionManager.updateProgress(mission.missionId, 1, 1);

      const completed = await controller.missionManager.completeMission(mission.missionId);
      expect(completed.status).toBe("COMPLETED");
      expect(completed.progress.percentComplete).toBe(100);

      await controller.shutdown();
    });

    it("Restricts emergency force completion to privileged admin path with valid token", async () => {
      const repo = new InMemoryMissionRepository();
      const manager = new MissionManager(repo);

      const mission = await manager.createMission({ goal: "Admin force completion mission" });
      await manager.startMission(mission.missionId);

      // Invalid token must fail
      await expect(
        manager.forceCompleteMissionAdmin(mission.missionId, { adminToken: "invalid", reason: "Emergency" })
      ).rejects.toThrow(/Privileged administrative authentication failed/);

      // Valid admin token succeeds
      const forced = await manager.forceCompleteMissionAdmin(mission.missionId, {
        adminToken: process.env.FACTORYOS_ADMIN_TOKEN || "ADMIN_PRIVILEGED_SECRET",
        reason: "Overriding failed worker condition under administrative authority",
      });
      expect(forced.status).toBe("COMPLETED");
      expect(forced.eventHistory.some((e) => e.message.includes("forcibly completed by admin"))).toBe(true);
    });
  });

  describe("6. Advanced Watchdog Sweeps & Persistent Multi-Writer Disk OCC", () => {
    it("Watchdog health check automatically sweeps and detects silent over-duration missions", async () => {
      const controller = new AutonomousFactoryController({ autoStartSwarm: false });
      await controller.boot();

      const mission = await controller.missionManager.createMission({
        goal: "Silent duration breach mission",
        failurePolicy: "FAIL_FAST",
        budget: { maxDurationMs: 50 }, // 50ms budget
      });
      await controller.missionManager.startMission(mission.missionId);

      // Wait 100ms so duration is breached
      await new Promise((r) => setTimeout(r, 100));

      // Run Watchdog health check sweep
      const report = await controller.watchdog.runHealthCheck();
      expect(report.missionBreaches).toBeDefined();
      expect(report.missionBreaches!.some((b) => b.missionId === mission.missionId)).toBe(true);

      const breachedMission = await controller.missionManager.getMission(mission.missionId);
      expect(breachedMission?.status).toBe("FAILED");
      expect(breachedMission?.failureReason).toContain("Duration budget exceeded");

      await controller.shutdown();
    });

    it("Handles persistent disk-backed multi-writer concurrent updates with version conflict resolution", async () => {
      const diskDb = new PersistentDiskDatabase(testStorageDir);
      const repos = diskDb.getRepos();

      const manager1 = new MissionManager(repos.missions);
      const manager2 = new MissionManager(repos.missions);

      const mission = await manager1.createMission({ goal: "Disk multi-writer test" });
      const missionId = mission.missionId;
      await manager1.startMission(missionId);

      // Multi-writer update across distinct instances targeting the same disk storage
      await manager1.updateProgress(missionId, 2, 10);
      await manager2.recordBudgetConsumption(missionId, { tokens: 500 });
      await manager1.updateProgress(missionId, 3);

      const finalState = await manager1.getMission(missionId);
      expect(finalState).toBeDefined();
      expect(finalState!.progress.completedTasks).toBe(5);
      expect(finalState!.budget.tokensConsumed).toBe(500);
      expect(finalState!.version).toBeGreaterThan(3);
    });
  });
});
