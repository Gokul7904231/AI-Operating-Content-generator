import { describe, it, expect, beforeEach } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { ValidatorAgent } from "../core/validator/ValidatorAgent";

describe("FactoryOS v1 — Validator Agent Suite ('Prove It')", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let caseManager: CaseManager;
  let validator: ValidatorAgent;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine();
    caseManager = new CaseManager(undefined, eventBus, worldState);
    validator = new ValidatorAgent(caseManager, eventBus, worldState);
  });

  it("01: Verifies all 4 critical invariants and transitions case to RESOLVED", async () => {
    const caseItem = await caseManager.createCase({
      title: "Audio buffer underrun",
      description: "Resolved audio buffer underrun",
      floorId: "floor03_asset_realization",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "MEDIUM",
      detectorId: "slayer_compute",
      symptoms: [],
      observedState: {},
    });

    await caseManager.transitionStatus(caseItem.caseId, "TRIAGED", "Overseer");
    await caseManager.transitionStatus(caseItem.caseId, "INVESTIGATING", "Overseer");
    await caseManager.transitionStatus(caseItem.caseId, "HEALING", "healer_pipeline");
    await caseManager.transitionStatus(caseItem.caseId, "VERIFYING", "healer_pipeline");

    // All invariants pass: floor is ONLINE, resources healthy, confidence high, unblocked
    const report = await validator.verifyCaseResolution(caseItem);

    expect(report.overallPassed).toBe(true);
    expect(report.invariantsChecked.length).toBe(4);
    expect(report.telemetryNormalized).toBe(true);

    const reloaded = await caseManager.getCase(caseItem.caseId);
    expect(reloaded?.status).toBe("RESOLVED");
    expect(worldState.getState().activeCaseIds).not.toContain(caseItem.caseId);
  });

  it("02: Rejects resolution and fails case if invariants are violated", async () => {
    // Violate invariant: target floor is ERROR
    worldState.updateFloorStatus("floor01_strategy", "ERROR", "Invariant violation");

    const caseItem = await caseManager.createCase({
      title: "Strategy floor issue",
      description: "Testing invariant failure rejection",
      floorId: "floor01_strategy",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "HIGH",
      detectorId: "slayer_general_patrol",
      symptoms: [],
      observedState: {},
    });

    await caseManager.transitionStatus(caseItem.caseId, "TRIAGED", "Overseer");
    await caseManager.transitionStatus(caseItem.caseId, "INVESTIGATING", "Overseer");
    await caseManager.transitionStatus(caseItem.caseId, "HEALING", "healer_pipeline");
    await caseManager.transitionStatus(caseItem.caseId, "VERIFYING", "healer_pipeline");

    const report = await validator.verifyCaseResolution(caseItem);

    expect(report.overallPassed).toBe(false);
    const reloaded = await caseManager.getCase(caseItem.caseId);
    expect(reloaded?.status).toBe("FAILED");
  });
});
