/**
 * FactoryOS Frontier v2 — Phase 6: Healer Swarm Concurrency & Deep Repair Safety Suite
 * Tests 1 through 18 covering all concurrency, locking, dedup, dependencies, rollbacks, and validator gates.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { HealerEngine } from "../core/healers/HealerEngine";
import { RepairLockManager } from "../core/healers/RepairLockManager";
import { RepairDeduplicator } from "../core/healers/RepairDeduplicator";
import { RepairDependencyAnalyzer } from "../core/healers/RepairDependencyAnalyzer";
import { TransactionalRepairGate } from "../core/healers/TransactionalRepairGate";
import { CaseManager } from "../core/cases/CaseManager";
import { ValidatorAgent } from "../core/validator/ValidatorAgent";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import type { Case } from "../core/contracts/CaseContracts";
import type { RepairAction } from "../core/contracts/HealerContracts";

describe("FactoryOS Frontier v2 — Phase 6: Healer Swarm Concurrency & Deep Repair Safety Suite", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let caseManager: CaseManager;
  let validator: ValidatorAgent;
  let engine: HealerEngine;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
    validator = new ValidatorAgent(caseManager, eventBus, worldState);
    engine = new HealerEngine(caseManager, eventBus, worldState);
  });

  it("1. Independent Multi-Case Parallelism: Two independent cases heal concurrently", async () => {
    const caseA = await caseManager.createCase({
      title: "Strategy queue backlog",
      description: "Strategy queue backlog on floor 01",
      floorId: "floor01_strategy",
      targetWorker: "worker_strat_01",
      category: "PIPELINE_STALL",
      severity: "LOW",
      detectorId: "slayer_pipeline",
      symptoms: ["Queue backlog"],
      observedState: {},
    });

    const caseB = await caseManager.createCase({
      title: "Scripting format error",
      description: "Scripting format error on floor 02",
      floorId: "floor02_scripting",
      targetWorker: "worker_script_02",
      category: "SCHEMA_VALIDATION_ERROR",
      severity: "LOW",
      detectorId: "slayer_quality",
      symptoms: ["Format error"],
      observedState: {},
    });

    const [reportsA, reportsB] = await Promise.all([
      engine.dispatchHealersForCase(caseA),
      engine.dispatchHealersForCase(caseB),
    ]);

    expect(reportsA[0].repairStatus).toBe("SUCCESS");
    expect(reportsB[0].repairStatus).toBe("SUCCESS");
  });

  it("2 & 3. Shared Resource Collision: Two conflicting cases serialize and reject concurrent lock", async () => {
    const caseA = await caseManager.createCase({
      title: "Floor 03 GPU saturation",
      description: "GPU memory saturated on floor 03",
      floorId: "floor03_asset_realization",
      targetWorker: "shared_gpu_node_01",
      category: "GPU_SATURATION",
      severity: "HIGH",
      detectorId: "slayer_compute",
      symptoms: ["GPU Out of memory"],
      observedState: {},
    });

    const caseB = await caseManager.createCase({
      title: "Floor 03 GPU driver glitch",
      description: "GPU driver crash on same node",
      floorId: "floor03_asset_realization",
      targetWorker: "shared_gpu_node_01",
      category: "RENDER_ARTIFACT",
      severity: "HIGH",
      detectorId: "slayer_rendering",
      symptoms: ["Driver glitch"],
      observedState: {},
    });

    // Manually acquire lock as if Case A is currently repairing
    await engine.lockManager.acquireLock("shared_gpu_node_01", "healer_rendering", caseA.caseId, 30000);

    // Case B attempts dispatch while locked -> yields safely with LOCKED_RESOURCE_BUSY
    const reportsB = await engine.dispatchHealersForCase(caseB);
    expect(reportsB[0].repairStatus).toBe("LOCKED_RESOURCE_BUSY");

    // Release lock from Case A
    await engine.lockManager.releaseLock("shared_gpu_node_01", "healer_rendering");

    // Case B can now acquire and heal
    const retryReportsB = await engine.dispatchHealersForCase(caseB);
    expect(retryReportsB.some((r) => r.repairStatus === "SUCCESS")).toBe(true);
  });

  it("4. Lock TTL Expiration: Stale resource lock expires and allows subsequent healer acquisition", async () => {
    const lockManager = new RepairLockManager();
    const shortTtlMs = 50;

    await lockManager.acquireLock("worker_timeout_test", "healer_old", "case_old", shortTtlMs);
    expect(lockManager.isLocked("worker_timeout_test")).toBe(true);

    // Wait for TTL expiry
    await new Promise((resolve) => setTimeout(resolve, 70));

    expect(lockManager.isLocked("worker_timeout_test")).toBe(false);

    // New healer acquires lock successfully
    const acquired = await lockManager.acquireLock("worker_timeout_test", "healer_new", "case_new", 30000);
    expect(acquired).toBe(true);
  });

  it("5. Stale Healer Cannot Mutate / Non-Owner Cannot Release Lock", async () => {
    const lockManager = new RepairLockManager();

    await lockManager.acquireLock("target_worker_secure", "healer_authorized", "case_01", 30000);

    // Rogue / unauthorized healer attempts release
    await lockManager.releaseLock("target_worker_secure", "healer_unauthorized");

    // Lock remains held by authorized healer
    const lock = lockManager.getLock("target_worker_secure");
    expect(lock).not.toBeNull();
    expect(lock?.ownerHealerId).toBe("healer_authorized");
  });

  it("6 & 7. Repair Deduplication: Duplicate repair requests attach and return DUPLICATE_SUPPRESSED", async () => {
    const dedup = new RepairDeduplicator();

    const reg1 = dedup.checkAndRegister("floor02", "worker_01", "PIPELINE_STALL", "STANDARD", "case_01");
    expect(reg1.isDuplicate).toBe(false);

    // Identical repair while reg1 is IN_PROGRESS
    const reg2 = dedup.checkAndRegister("floor02", "worker_01", "PIPELINE_STALL", "STANDARD", "case_02");
    expect(reg2.isDuplicate).toBe(true);

    // Completing reg1 allows new distinct repair cycles
    dedup.completeRepair(reg1.fingerprintId, true);
    const reg3 = dedup.checkAndRegister("floor02", "worker_01", "PIPELINE_STALL", "STANDARD", "case_03");
    expect(reg3.isDuplicate).toBe(false);
  });

  it("8. Dependency Ordering & Conflict Analysis: Analyzer detects primary & cross-floor blast radius", () => {
    const analyzer = new RepairDependencyAnalyzer();

    const localCase: Case = {
      caseId: "c_local",
      title: "Local error",
      description: "Local queue error",
      floorId: "floor01_strategy",
      targetWorker: "worker_strat_01",
      category: "SCHEMA_VALIDATION_ERROR",
      severity: "LOW",
      priority: 5,
      status: "DETECTED",
      detectorId: "slayer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: [],
      observedState: {},
      evidence: [],
      hypotheses: [],
      linkedCaseIds: [],
      assignedHealerIds: [],
      healerCountAllocated: 1,
      timeline: [],
    };

    const crossFloorCase: Case = {
      caseId: "c_cross",
      title: "GPU Saturation",
      description: "Shared GPU saturation",
      floorId: "floor03_asset_realization",
      targetWorker: "shared_gpu_01",
      category: "GPU_SATURATION",
      severity: "HIGH",
      priority: 2,
      status: "DETECTED",
      detectorId: "slayer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      symptoms: [],
      observedState: {},
      evidence: [],
      hypotheses: [],
      linkedCaseIds: [],
      assignedHealerIds: [],
      healerCountAllocated: 3,
      timeline: [],
    };

    const depLocal = analyzer.analyzeDependency(localCase);
    expect(depLocal.blastRadius).toBe("LOCAL");

    const depCross = analyzer.analyzeDependency(crossFloorCase);
    expect(depCross.blastRadius).toBe("CROSS_FLOOR");
    expect(depCross.dependentResourceIds).toContain("res:gpu_pool");

    expect(analyzer.canRunConcurrently(localCase, crossFloorCase)).toBe(true);
  });

  it("9. Dynamic Specialist Allocation: Sizing matches case severity deterministically", async () => {
    const lowCase = await caseManager.createCase({
      title: "Low format issue",
      description: "Low issue",
      floorId: "floor02_scripting",
      category: "SCHEMA_VALIDATION_ERROR",
      severity: "LOW",
      detectorId: "slayer",
      symptoms: [],
      observedState: {},
    });

    const medCase = await caseManager.createCase({
      title: "Medium pipeline issue",
      description: "Medium issue",
      floorId: "floor02_scripting",
      category: "PIPELINE_STALL",
      severity: "MEDIUM",
      detectorId: "slayer",
      symptoms: [],
      observedState: {},
    });

    const highCase = await caseManager.createCase({
      title: "Critical crash",
      description: "Critical crash",
      floorId: "floor03_asset_realization",
      category: "WORKER_CRASH",
      severity: "CRITICAL",
      detectorId: "slayer",
      symptoms: [],
      observedState: {},
    });

    const lowSquad = engine.allocateHealers(lowCase);
    expect(lowSquad.length).toBe(1);

    const medSquad = engine.allocateHealers(medCase);
    expect(medSquad.length).toBe(2);

    const highSquad = engine.allocateHealers(highCase);
    expect(highSquad.length).toBe(3);
  });

  it("12. Transactional Repair Rollback: Reverses executed steps when a subsequent step fails", async () => {
    const gate = new TransactionalRepairGate();
    const executedRollbacks: string[] = [];

    const actions: RepairAction[] = [
      { actionId: "a1", actionType: "PAUSE_INGEST", target: "queue", parameters: {}, status: "PENDING" },
      { actionId: "a2", actionType: "FLUSH_BUFFER", target: "buffer", parameters: {}, status: "PENDING" },
    ];

    const rollbackActions: RepairAction[] = [
      { actionId: "rb1", actionType: "RESUME_INGEST", target: "queue", parameters: {}, status: "PENDING" },
    ];

    const result = await gate.executePlan(
      actions,
      rollbackActions,
      async (action) => {
        if (action.actionId === "a2") return false; // Failure on second action
        return true;
      },
      async (rb) => {
        executedRollbacks.push(rb.actionType);
        return true;
      }
    );

    expect(result.success).toBe(false);
    expect(executedRollbacks).toContain("RESUME_INGEST");
  });

  it("13. Validator Coupling: Case remains in VERIFYING until independent Validator proves invariants", async () => {
    const caseItem = await caseManager.createCase({
      title: "Verification proof test",
      description: "Verification proof test",
      floorId: "floor02_scripting",
      category: "PIPELINE_STALL",
      severity: "LOW",
      detectorId: "slayer",
      symptoms: [],
      observedState: {},
    });

    // Healer dispatches and succeeds
    await engine.dispatchHealersForCase(caseItem);

    // Case must be in VERIFYING, NOT directly RESOLVED
    const updatedCase = await caseManager.getCase(caseItem.caseId);
    expect(updatedCase?.status).toBe("VERIFYING");

    // Independent validator checks invariants
    const valReport = await validator.verifyCaseResolution(updatedCase!);
    expect(valReport.overallPassed).toBe(true);

    // Validator transitions status to RESOLVED
    const resolvedCase = await caseManager.getCase(caseItem.caseId);
    expect(resolvedCase?.status).toBe("RESOLVED");
  });

  it("14. Bounded Retry Policy: Escalates and fails after 3 unsuccessful attempts", async () => {
    const caseItem = await caseManager.createCase({
      title: "Stubborn failure",
      description: "Stubborn failure",
      floorId: "floor01_strategy",
      targetWorker: "stubborn_node",
      category: "RESOURCE_STARVATION",
      severity: "HIGH",
      detectorId: "slayer",
      symptoms: [],
      observedState: {},
    });

    // Attempt 1, 2, 3 fail by keeping resource locked
    await engine.lockManager.acquireLock("stubborn_node", "healer_blocker", "c_blocker", 60000);
    await engine.dispatchHealersForCase(caseItem);
    await engine.dispatchHealersForCase(caseItem);
    await engine.dispatchHealersForCase(caseItem);

    // 4th attempt exceeds max attempts limit
    const report4 = await engine.dispatchHealersForCase(caseItem);
    expect(report4[0].repairStatus).toBe("FAILED");

    const finalCase = await caseManager.getCase(caseItem.caseId);
    expect(finalCase?.status).toBe("FAILED");
  });

  it("15, 16, 17, 18. Multi-Case Concurrent Race & Resource Lock Cleanup", async () => {
    const cases: Case[] = [];
    for (let i = 0; i < 5; i++) {
      const c = await caseManager.createCase({
        title: `Concurrent Case ${i}`,
        description: `Description ${i}`,
        floorId: i % 2 === 0 ? "floor01_strategy" : "floor02_scripting",
        targetWorker: `worker_node_${i}`,
        category: "PIPELINE_STALL",
        severity: "LOW",
        detectorId: "slayer",
        symptoms: [],
        observedState: {},
      });
      cases.push(c);
    }

    const results = await Promise.all(cases.map((c) => engine.dispatchHealersForCase(c)));
    for (const res of results) {
      expect(res[0].repairStatus).toBe("SUCCESS");
    }

    // Verify all resource locks were cleanly released
    const activeLocks = engine.lockManager.getAllActiveLocks();
    expect(activeLocks.length).toBe(0);
  });
});
