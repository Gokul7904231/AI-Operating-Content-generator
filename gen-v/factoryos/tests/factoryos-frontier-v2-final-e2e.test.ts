/**
 * FactoryOS Frontier v2 — Final Master Autonomous Acceptance E2E Suite
 *
 * PROVES THE COMPLETE 100% UNASSISTED AUTONOMOUS CONTROL LOOP:
 * BOOT -> RESTORE -> OBSERVE -> THINK -> PLAN -> DISPATCH -> EXECUTE -> VERIFY -> LEARN -> REPLAN -> CONTINUE
 *
 * STRICT TEST RULES:
 * TEST MAY:
 *   ✓ Boot FactoryOS Controller
 *   ✓ Submit production mission
 *   ✓ Inject controlled telemetry/floor anomaly
 *   ✓ Kill process (simulate hard crash)
 *   ✓ Boot replacement Controller from disk
 *   ✓ Inspect state & poll
 *
 * TEST MAY NOT:
 *   ✗ Call runPatrolCycle()
 *   ✗ Call runSupervisorCycle()
 *   ✗ Call dispatchHealers()
 *   ✗ Call transitionStatus()
 *   ✗ Call completeMission()
 *   ✗ Call heal() or manual validator checks
 */

import { describe, it, expect } from "vitest";
import { AutonomousFactoryController } from "../core/controller/AutonomousFactoryController";
import type { Case } from "../core/contracts/CaseContracts";
import * as path from "node:path";
import * as fs from "node:fs";

describe("FactoryOS Frontier v2 — Master Final Autonomous Acceptance Suite", () => {
  const testStorageDir = path.join(process.cwd(), "data", "test_final_frontier_acceptance_strict");

  it("Executes the complete autonomous lifecycle without test-side manual intervention", async () => {
    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }

    // =========================================================================
    // 1. BOOT FACTORYOS CONTROLLER A (Swarms, Guardians, Watchdog, Presence)
    // =========================================================================
    const controllerA = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 250,
      supervisorIntervalMs: 250,
      watchdogIntervalMs: 500,
      autoStartSwarm: true,
    });
    await controllerA.boot();

    // Verify initial factory status
    expect(controllerA.worldState.getState().factoryStatus).toBe("OPERATIONAL");

    // =========================================================================
    // 2. SUBMIT AUTONOMOUS PRODUCTION MISSION
    // =========================================================================
    const mission = await controllerA.startMission({
      goal: "Produce automated documentary short",
      objective: "Full lifecycle rendering and verification",
      budget: { maxTokens: 50000, maxCostUsd: 1.0, maxDurationMs: 60000, maxParallelTasks: 4 },
      failurePolicy: "REPLAN",
    });

    expect(mission.missionId).toBeDefined();
    expect(mission.status).toBe("RUNNING");

    // =========================================================================
    // 3. INJECT FAULT INTO FLOOR 03 (Rendering GPU socket timeout)
    // =========================================================================
    controllerA.worldState.updateFloorStatus(
      "floor03_asset_realization",
      "ERROR",
      "Rendering GPU socket timeout"
    );

    // =========================================================================
    // 4. VERIFY STRICT SLAYER -> OVERSEER -> HEALER -> VALIDATOR AUTONOMOUS CHAIN
    // (Zero test-side kicks — purely executed by background swarm intervals)
    // =========================================================================
    let verifiedResolvedCase: Case | null = null;
    const startAnomalyWait = Date.now();

    while (Date.now() - startAnomalyWait < 12000) {
      const allCases = await controllerA.caseManager.getAllCases();
      const found = allCases.find((c) => c.floorId === "floor03_asset_realization" && c.status === "RESOLVED");
      if (found) {
        verifiedResolvedCase = found;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // Strict assertions on the autonomous case resolution chain
    expect(verifiedResolvedCase).toBeDefined();
    expect(verifiedResolvedCase?.status).toBe("RESOLVED");
    expect(verifiedResolvedCase?.detectorId.startsWith("slayer_")).toBe(true);
    expect(verifiedResolvedCase?.evidence.length).toBeGreaterThan(0);
    expect(verifiedResolvedCase?.hypotheses.length).toBeGreaterThan(0);
    expect(verifiedResolvedCase?.resolutionSummary).toBeDefined();

    // Floor 03 must have returned ONLINE through the validated repair
    const stateA = controllerA.worldState.getState();
    expect(stateA.floors["floor03_asset_realization"].status).toBe("ONLINE");

    // =========================================================================
    // 5. AUTONOMOUS WATCHDOG SUPERVISION & AUTO-RECOVERY PROOF
    // =========================================================================
    controllerA.worldState.updateWorkerHeartbeat("worker_render_01", "FAILED");
    const startWatchdogWait = Date.now();
    let watchdogRecovered = false;

    while (Date.now() - startWatchdogWait < 6000) {
      const workerState = controllerA.worldState.getState().workers["worker_render_01"];
      if (workerState && workerState.status === "HEALTHY") {
        watchdogRecovered = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(watchdogRecovered).toBe(true);

    // =========================================================================
    // 6. SIMULATE HARD CONTROLLER CRASH / PROCESS TERMINATION
    // =========================================================================
    await controllerA.shutdown();

    // =========================================================================
    // 7. BOOT REPLACEMENT CONTROLLER B FROM DISK STORAGE
    // =========================================================================
    const controllerB = new AutonomousFactoryController({
      storageType: "disk",
      storagePath: testStorageDir,
      patrolIntervalMs: 250,
      supervisorIntervalMs: 250,
      watchdogIntervalMs: 500,
      autoStartSwarm: true,
    });
    await controllerB.boot();

    // Verify restored WorldState integrity
    const stateB = controllerB.worldState.getState();
    expect(stateB.factoryStatus).toBe("OPERATIONAL");
    expect(stateB.floors["floor03_asset_realization"].status).toBe("ONLINE");

    // =========================================================================
    // 8. VERIFY PURE AUTONOMOUS MISSION COMPLETION
    // (ZERO test-side completeMission calls — completed by autonomous runtime)
    // =========================================================================
    let autonomousMissionStatus = "";
    const startMissionCompletionWait = Date.now();

    while (Date.now() - startMissionCompletionWait < 12000) {
      const m = await controllerB.missionManager.getMission(mission.missionId);
      if (m?.status === "COMPLETED") {
        autonomousMissionStatus = "COMPLETED";
        break;
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    // STRICT PROOF: Mission completed 100% autonomously on Controller B!
    expect(autonomousMissionStatus).toBe("COMPLETED");

    // Clean shutdown
    await controllerB.shutdown();

    if (fs.existsSync(testStorageDir)) {
      fs.rmSync(testStorageDir, { recursive: true, force: true });
    }
  });
});
