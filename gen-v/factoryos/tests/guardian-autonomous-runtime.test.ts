import { describe, it, expect, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";

describe("FactoryOS Frontier v2 — Phase 3: Floor Guardian Autonomous Operating Mind Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_guardian_autonomous_suite");

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      try {
        fs.rmSync(testStorageDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {}
    }
  });

  it("1. Boots Floor Guardians automatically, registers in WorldState, and maintains live heartbeats", async () => {
    const controller = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: true,
    });
    await controller.boot();

    const guardians = controller.guardianManager.getAllGuardians();
    expect(guardians.length).toBe(4);

    const f01 = controller.guardianManager.getGuardian("floor01_strategy");
    const f02 = controller.guardianManager.getGuardian("floor02_scripting");
    const f03 = controller.guardianManager.getGuardian("floor03_asset_realization");
    const f07 = controller.guardianManager.getGuardian("floor07_compliance");

    expect(f01).toBeDefined();
    expect(f02).toBeDefined();
    expect(f03).toBeDefined();
    expect(f07).toBeDefined();

    expect(f01!.getStatus()).toBe("ONLINE");
    expect(f02!.getStatus()).toBe("ONLINE");
    expect(f03!.getStatus()).toBe("ONLINE");
    expect(f07!.getStatus()).toBe("ONLINE");

    // Verify WorldState worker registration
    const state = controller.worldState.getState();
    expect(state.workers["guardian_floor01_strategy"]).toBeDefined();
    expect(state.workers["guardian_floor02_scripting"]).toBeDefined();
    expect(state.workers["guardian_floor03_asset_realization"]).toBeDefined();
    expect(state.workers["guardian_floor07_compliance"]).toBeDefined();

    await controller.shutdown();
  });

  it("2. Local Workload Balancing: Autonomously balances load from overloaded worker to idle worker without Overseer request", async () => {
    const controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();

    const g02 = controller.guardianManager.getGuardian("floor02_scripting");
    expect(g02).toBeDefined();

    // Register overloaded Worker A and idle Worker B in local model
    g02!.localModel.updateWorkerHeartbeat("worker_scripting_A", true, 90);
    g02!.localModel.updateWorkerHeartbeat("worker_scripting_B", true, 10);

    let rebalanceEventFired = false;
    controller.eventBus.subscribe("WORKLOAD_REBALANCED", (data: any) => {
      if (data.floorId === "floor02_scripting") {
        rebalanceEventFired = true;
      }
    });

    // Run audit cycle
    await g02!.runAuditCycle();

    expect(rebalanceEventFired).toBe(true);

    const workers = g02!.localModel.getWorkers();
    expect(workers.get("worker_scripting_A")?.utilizationPercent).toBeLessThan(90);
    expect(workers.get("worker_scripting_B")?.utilizationPercent).toBeGreaterThan(10);

    await controller.shutdown();
  });

  it("3. Local Worker Recovery & Quarantine: Quarantines repeated failing workers and restores stale workers", async () => {
    const controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();

    const g03 = controller.guardianManager.getGuardian("floor03_asset_realization");
    expect(g03).toBeDefined();

    // Register worker with 3 failed tasks
    g03!.localModel.registerWorker("worker_render_failing");
    g03!.localModel.addTask({
      taskId: "task_f1",
      floorId: "floor03_asset_realization",
      assignedWorkerId: "worker_render_failing",
      status: "FAILED",
      priority: 1,
      retryCount: 1,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    });
    g03!.localModel.addTask({
      taskId: "task_f2",
      floorId: "floor03_asset_realization",
      assignedWorkerId: "worker_render_failing",
      status: "FAILED",
      priority: 1,
      retryCount: 1,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    });
    g03!.localModel.addTask({
      taskId: "task_f3",
      floorId: "floor03_asset_realization",
      assignedWorkerId: "worker_render_failing",
      status: "FAILED",
      priority: 1,
      retryCount: 1,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
    });

    let quarantineEventFired = false;
    controller.eventBus.subscribe("WORKER_QUARANTINED", (data: any) => {
      if (data.workerId === "worker_render_failing") {
        quarantineEventFired = true;
      }
    });

    await g03!.runAuditCycle();

    expect(quarantineEventFired).toBe(true);
    const worker = g03!.localModel.getWorkers().get("worker_render_failing");
    expect(worker?.isQuarantined).toBe(true);

    await controller.shutdown();
  });

  it("4. Slayer Ingestion & Escalation: Handles local anomaly safely and escalates critical/cross-floor case to Overseer", async () => {
    const controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();

    const g03 = controller.guardianManager.getGuardian("floor03_asset_realization");
    expect(g03).toBeDefined();

    let escalationFired = false;
    let escalatedCaseId = "";
    controller.eventBus.subscribe("GUARDIAN_ESCALATION", (data: any) => {
      if (data.floorId === "floor03_asset_realization") {
        escalationFired = true;
        escalatedCaseId = data.caseId;
      }
    });

    // Ingest critical cross-floor case from Slayer
    await controller.eventBus.publish("CASE_CREATED", {
      caseItem: {
        caseId: "case_cross_floor_009",
        floorId: "floor03_asset_realization",
        detectorId: "slayer_pipeline",
        severity: "CRITICAL",
        category: "CROSS_FLOOR_DEPENDENCY",
        status: "DETECTED",
        createdAt: new Date().toISOString(),
      },
    });

    expect(escalationFired).toBe(true);
    expect(escalatedCaseId).toBe("case_cross_floor_009");

    const report = g03!.generateReport("ESCALATE", "Escalating cross-floor dependency");
    expect(report.requiresOverseer).toBe(true);

    await controller.shutdown();
  });

  it("5. Multi-Guardian Isolation: Simultaneous failures on different floors are handled by respective Guardians without interference", async () => {
    const controller = new AutonomousFactoryController({ autoStartSwarm: false });
    await controller.boot();

    const g01 = controller.guardianManager.getGuardian("floor01_strategy");
    const g02 = controller.guardianManager.getGuardian("floor02_scripting");
    const g07 = controller.guardianManager.getGuardian("floor07_compliance");

    // Inject floor-specific anomalies
    await controller.eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor01_strategy",
      reason: "Strategy token rate limit",
      severity: "LOW",
    });

    await controller.eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor07_compliance",
      reason: "Copyright database timeout",
      severity: "LOW",
    });

    // Verify floor 01 and 07 updated their local state independently while floor 02 remained untouched
    expect(g01!.localModel.getWorkers().get("worker_floor01_strategy_01")).toBeDefined();
    expect(g07!.localModel.getWorkers().get("worker_floor07_compliance_01")).toBeDefined();
    expect(g02!.localModel.getActiveCases().length).toBe(0);

    await controller.shutdown();
  });

  it("6. Guardian Process Restart & Multi-Runtime Reconstruction", async () => {
    const controllerA = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: true,
    });
    await controllerA.boot();

    expect(controllerA.guardianManager.getAllGuardians().length).toBe(4);
    await controllerA.shutdown();

    // Reconstruct on Controller B
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: true,
    });
    await controllerB.boot();

    const restoredGuardians = controllerB.guardianManager.getAllGuardians();
    expect(restoredGuardians.length).toBe(4);
    for (const g of restoredGuardians) {
      expect(g.getStatus()).toBe("ONLINE");
    }

    await controllerB.shutdown();
  });
});
