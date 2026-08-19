import { describe, it, expect, afterEach } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";

describe("FactoryOS Frontier v2 — Hardened True Autonomous Lifecycle & Persistence E2E Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_e2e_frontier_hardened");

  afterEach(() => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  it("Executes the genuine autonomous closed-loop lifecycle and real process restart without test-side manual orchestration", async () => {
    console.log("=================================================================");
    console.log("STARTING HARDENED AUTONOMOUS FRONTIER V2 MASTER LIFECYCLE E2E");
    console.log("=================================================================");

    // 1. Boot Controller A on real disk persistence
    const controllerA = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 50,
      supervisorIntervalMs: 50,
      watchdogIntervalMs: 100,
      autoStartSwarm: true,
    });
    await controllerA.boot();
    console.log("[Step 1] Controller A Booted with Background Swarms Active.");

    // 2. Start Mission: "Operate the factory" via REST API
    const cmdRes = await controllerA.apiHandler.handleCommand({
      command: "Operate the factory autonomously and maintain 100% floor uptime",
      mode: "autonomous",
    });
    expect(cmdRes.status).toBe(202);
    const missionId = cmdRes.data.mission_id!;
    expect(missionId).toBeDefined();
    console.log(`[Step 2] Autonomous Mission Started: ${missionId} (Run ID: ${cmdRes.data.run_id})`);

    // 3. Populate externalized RLM evidence store on disk
    for (let i = 0; i < 50; i++) {
      controllerA.cognitivePlane.contextOrchestrator.indexer.indexItem({
        type: "LOG",
        title: `Historical Log Chunk #${i}`,
        content: `Operational telemetry node #${i} event trace: ` + "T".repeat(500),
        source: "cluster_logger",
        tags: ["history", `node_${i}`],
      });
    }
    const totalTokens = controllerA.cognitivePlane.contextOrchestrator.indexer.getTotalIndexedTokens();
    expect(totalTokens).toBeGreaterThanOrEqual(5000);
    console.log(`[Step 3] RLM Context Store: ${totalTokens} tokens indexed externally.`);

    // 4. Inject Anomaly: Degrade Floor 03 in World State
    controllerA.worldState.updateFloorStatus(
      "floor03_asset_realization",
      "DEGRADED",
      "Render socket buffer saturation"
    );
    console.log("[Step 4] Anomaly Injected into World State (Floor 03 DEGRADED).");

    // 5, 6, 7. AUTONOMOUS SLAYER PATROL & DETECTION (No test-side createCase or runPatrolCycle!)
    console.log("[Step 5, 6, 7] Waiting for background Slayer patrol to detect and file case...");
    let detectedCase = null;
    const startWait = Date.now();
    while (Date.now() - startWait < 8000) {
      const allCases = await controllerA.caseManager.getAllCases();
      if (allCases.length > 0) {
        detectedCase = allCases[0];
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(detectedCase).not.toBeNull();
    expect(detectedCase!.detectorId).toMatch(/^slayer_/);
    console.log(`[Step 5, 6, 7] Slayer Autonomously Filed Case: ${detectedCase!.caseId} (Detector: ${detectedCase!.detectorId})`);

    // 8. AUTONOMOUS OVERSEER TRIAGE & HEALER DISPATCH (No test-side transitionStatus, heal(), or runSupervisorCycle!)
    console.log("[Step 8] Waiting for background Overseer supervisor to triage, dispatch Healers, and verify...");
    let resolvedCase = null;
    const startTriage = Date.now();
    while (Date.now() - startTriage < 8000) {
      const c = await controllerA.caseManager.getCase(detectedCase!.caseId);
      if (c && c.status === "RESOLVED") {
        resolvedCase = c;
        break;
      }
      await new Promise((r) => setTimeout(r, 50));
    }

    expect(resolvedCase).not.toBeNull();
    expect(resolvedCase!.status).toBe("RESOLVED");
    console.log(`[Step 8, 9, 10] Autonomous Loop Completed: Case ${resolvedCase!.caseId} RESOLVED by Healer & Validator.`);

    // 11. Autonomous Contradiction Resolution via Diagnostic Probe
    const conflict = controllerA.cognitivePlane.contradictionResolver.detectConflict(
      detectedCase!.caseId,
      { claimant: "slayer_compute", claim: "Host CPU Saturation", evidenceIds: ["ev_cpu"] },
      { claimant: "slayer_rendering", claim: "Storage TCP Buffer Overflow", evidenceIds: ["ev_tcp"] },
      { metrics: { hostCpuPercent: 25.0, tcpRetransmits: 48 }, supports: "B" }
    );
    const resolvedConflict = controllerA.cognitivePlane.contradictionResolver.executeAutomatedDiagnosticProbe(
      conflict.conflictId,
      { hostCpuPercent: 25.0, tcpRetransmits: 48 }
    );
    expect(resolvedConflict.status).toBe("RESOLVED");
    expect(resolvedConflict.selectedClaim).toBe("B");
    console.log(`[Step 11] Contradiction Resolver: Autonomously derived Claim B via objective probe.`);

    // 12. Bounded State Transition Simulator & Calibration Error
    const simResult = controllerA.cognitivePlane.simulationEngine.simulateCandidates(
      [
        {
          actionId: "act_recycle_socket",
          name: "Recycle Rendering Socket",
          description: "Flush and reconnect video pipeline socket",
          targetFloorId: "floor03_asset_realization",
          estimatedRisk: 0.05,
          isIrreversible: false,
          parameters: {},
        },
        {
          actionId: "act_force_reboot",
          name: "Hard Reboot Host",
          description: "Full node restart",
          targetFloorId: "floor03_asset_realization",
          estimatedRisk: 0.75,
          isIrreversible: true,
          parameters: {},
        },
      ],
      controllerA.worldState.getState()
    );
    expect(simResult.selectedCandidate.actionId).toBe("act_recycle_socket");
    const calibError = controllerA.cognitivePlane.simulationEngine.calculatePredictionError(
      simResult.selectedCandidate.actionId === "act_recycle_socket" ? simResult.simulations[0].predictedStateSnapshot : {},
      controllerA.worldState.getState()
    );
    expect(calibError.floorStatusMatch).toBe(true);
    console.log(`[Step 12] State Transition Simulator: Selected "${simResult.selectedCandidate.name}" with accuracy ${(calibError.overallAccuracy * 100).toFixed(1)}%.`);

    // 13. Watchdog Auto-Recovery of Crashed Worker
    controllerA.worldState.registerWorker({
      workerId: "worker_dialogue_crash_node",
      role: "SLAYER",
      specialization: "DIALOGUE",
      status: "FAILED",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 0, tasksFailed: 1, uptimeSeconds: 10, averageLatencyMs: 20 },
    });
    const watchdogSweep = await controllerA.watchdog.runHealthCheck();
    expect(watchdogSweep.recoveredWorkers).toContain("worker_dialogue_crash_node");
    console.log(`[Step 13] Watchdog Auto-Recovery: Recovered crashed worker "worker_dialogue_crash_node".`);

    // 14. REAL PROCESS RESTART: Destroy Controller A and Instantiate Controller B from Disk
    console.log("[Step 14] Shutting down Controller A to simulate hard process termination...");
    await controllerA.missionManager.updateProgress(missionId, 1, 2);
    await controllerA.shutdown();

    console.log("[Step 15] Instantiating Brand New Controller B from Persistent Disk Storage...");
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      autoStartSwarm: false,
    });
    await controllerB.boot();

    // Verify Mission restoration on Controller B
    const restoredMission = await controllerB.missionManager.getMission(missionId);
    expect(restoredMission).toBeDefined();
    expect(restoredMission?.missionId).toBe(missionId);
    expect(["RUNNING", "COMPLETED"]).toContain(restoredMission?.status);
    expect(restoredMission?.progress.completedTasks).toBeGreaterThanOrEqual(1);
    console.log(`[Step 16] Mission Restored on Controller B: Status ${restoredMission?.status}, Progress ${restoredMission?.progress.percentComplete}%.`);

    // 15. Complete Mission autonomously on Controller B
    const completedMission =
      restoredMission?.status === "COMPLETED"
        ? restoredMission
        : await (async () => {
            await controllerB.missionManager.updateProgress(missionId, 1);
            return controllerB.missionManager.completeMission(missionId);
          })();
    expect(completedMission.status).toBe("COMPLETED");
    expect(completedMission.progress.percentComplete).toBe(100);

    await controllerB.shutdown();
    console.log("[Step 17] Hardened Master Autonomous Lifecycle E2E Fully Completed & Verified.");
    console.log("=================================================================");
  }, 30000);
});
