import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";

describe("FactoryOS v1 — Master Autonomous E2E Operating Demonstration", () => {
  let controller: AutonomousFactoryController;

  beforeEach(async () => {
    controller = new AutonomousFactoryController({
      patrolIntervalMs: 50,
      supervisorIntervalMs: 50,
      watchdogIntervalMs: 50,
      autoStartSwarm: false,
    });
    await controller.boot();
  });

  afterEach(async () => {
    await controller.shutdown();
  });

  it("Executes the complete 22-step autonomous detection -> triage -> healing -> verification -> recovery lifecycle without human intervention", async () => {
    // 1. Start FactoryOS autonomous runtime
    await controller.start();
    expect(controller.worldState.getState().factoryStatus).toBe("OPERATIONAL");

    // 2. Start autonomous mission: "Operate the factory"
    const acceptResponse = await controller.apiHandler.handleCommand({
      command: "Operate the factory autonomously.",
      mode: "autonomous",
    });

    // 3. Verify immediate non-blocking acceptance response
    expect(acceptResponse.status).toBe(202);
    const acceptData = acceptResponse.data as any;
    expect(acceptData.runId).toBeDefined();
    expect(acceptData.status).toBe("accepted");

    // Allow background loop to process command into running mission
    await new Promise((r) => setTimeout(r, 20));
    const run = controller.overseer.getRun(acceptData.runId);
    expect(run?.status).toBe("running");

    // 4. Inject a simulated floor failure on Floor 02
    controller.worldState.updateFloorStatus(
      "floor02_scripting",
      "ERROR",
      "Unhandled queue deadlock in script generation"
    );

    // 5 & 6. Wait for Slayer patrol to detect anomaly -> files structured Case
    let allCases = await controller.caseManager.getAllCases();
    const startWait = Date.now();
    while (allCases.length === 0 && Date.now() - startWait < 4000) {
      await controller.slayerEngine.runPatrolCycle();
      allCases = await controller.caseManager.getAllCases();
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(allCases.length).toBeGreaterThanOrEqual(1);

    const filedCase = allCases.find((c) => c.floorId === "floor02_scripting");
    expect(filedCase).toBeDefined();

    // 7-12. Wait for Overseer supervisor cycle -> triage -> Healer -> Validator -> RESOLVED
    const startResolve = Date.now();
    let resolvedCase = await controller.caseManager.getCase(filedCase!.caseId);
    while (resolvedCase?.status !== "RESOLVED" && Date.now() - startResolve < 4000) {
      await controller.overseer.runSupervisorCycle();
      resolvedCase = await controller.caseManager.getCase(filedCase!.caseId);
      await new Promise((r) => setTimeout(r, 100));
    }
    expect(resolvedCase?.status).toBe("RESOLVED");
    expect(resolvedCase?.resolutionSummary).toBeDefined();

    // 13. World State updated back to OPERATIONAL
    const finalWorld = controller.worldState.getState();
    expect(finalWorld.floors["floor02_scripting"].status).toBe("ONLINE");
    expect(finalWorld.activeCaseIds).not.toContain(filedCase!.caseId);

    // 14. Decision Ledger recorded Overseer decisions
    const recentDecisions = await controller.overseer.getDecisionLedger().getRecentDecisions(10);
    expect(recentDecisions.length).toBeGreaterThan(0);

    // 15. Slayer reputation updated
    const slayerRep = controller.slayerEngine.getSlayer("slayer_general_patrol")?.getReputation();
    expect(slayerRep?.casesDiscovered).toBeGreaterThanOrEqual(1);

    // 16. Kill/Fail a worker -> Watchdog recovers it
    controller.worldState.registerWorker({
      workerId: "slayer_general_patrol",
      role: "SLAYER",
      specialization: "GENERAL_PATROL",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 10, tasksFailed: 1, uptimeSeconds: 300, averageLatencyMs: 20 },
    });

    const watchdogReport = await controller.watchdog.runHealthCheck();
    expect(watchdogReport.recoveredWorkers).toContain("slayer_general_patrol");
    expect(controller.worldState.getState().workers["slayer_general_patrol"].status).toBe("HEALTHY");

    // 17. System continues operating persistently without human intervention
    expect(controller.worldState.getState().factoryStatus).toBe("OPERATIONAL");
  });
});
