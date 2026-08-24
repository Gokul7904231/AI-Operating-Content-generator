import { describe, it, expect, beforeEach } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { HealerEngine } from "../core/healers/HealerEngine";
import { LeaseManager } from "../core/leases/LeaseManager";
import { InMemoryReputationRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS v1 — Healer Swarm Suite", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let caseManager: CaseManager;
  let leaseManager: LeaseManager;
  let repRepo: InMemoryReputationRepository;
  let healerEngine: HealerEngine;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine();
    leaseManager = new LeaseManager();
    caseManager = new CaseManager(undefined, eventBus, worldState);
    repRepo = new InMemoryReputationRepository();
    healerEngine = new HealerEngine(caseManager, eventBus, worldState, leaseManager, repRepo);
  });

  it("01: Registers all 5 specialized Healers and updates world state registry", () => {
    const healers = healerEngine.getAllHealers();
    expect(healers.length).toBe(5);

    const specializations = healers.map((h) => h.config.specialization);
    expect(specializations).toContain("DIAGNOSTIC");
    expect(specializations).toContain("PIPELINE");
    expect(specializations).toContain("RENDERING");
    expect(specializations).toContain("WORKER");
    expect(specializations).toContain("CONTENT");
  });

  it("02: Dynamically allocates healer squad based on anomaly severity and category", async () => {
    const lowCase = await caseManager.createCase({
      title: "Minor schema typo",
      description: "Non-fatal key missing",
      floorId: "floor02_scripting",
      category: "VALIDATION_REJECTION",
      severity: "LOW",
      detectorId: "slayer_quality",
      symptoms: [],
      observedState: {},
    });

    const lowSquad = healerEngine.allocateHealers(lowCase);
    expect(lowSquad.length).toBe(1);
    expect(lowSquad[0].config.specialization).toBe("CONTENT");

    const critCase = await caseManager.createCase({
      title: "Pipeline crash",
      description: "Critical deadlock on Floor 01",
      floorId: "floor01_strategy",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "CRITICAL",
      detectorId: "slayer_pipeline",
      symptoms: [],
      observedState: {},
    });

    const critSquad = healerEngine.allocateHealers(critCase);
    expect(critSquad.length).toBeGreaterThanOrEqual(2);
  });

  it("03: Performs independent hypothesis verification and transactional repair", async () => {
    worldState.updateFloorStatus("floor02_scripting", "ERROR", "Backlog jammed");

    const caseItem = await caseManager.createCase({
      title: "Scripting floor queue stalled",
      description: "Backlog jammed on floor02",
      floorId: "floor02_scripting",
      category: "FLOOR_EXECUTION_ERROR",
      severity: "HIGH",
      detectorId: "slayer_pipeline",
      symptoms: ["Queue stuck"],
      observedState: {},
    });

    await caseManager.transitionStatus(caseItem.caseId, "TRIAGED", "Overseer");
    await caseManager.transitionStatus(caseItem.caseId, "INVESTIGATING", "Overseer");

    const reports = await healerEngine.dispatchHealersForCase(caseItem);
    expect(reports.length).toBeGreaterThanOrEqual(1);

    const successReport = reports.find((r) => r.repairStatus === "SUCCESS");
    expect(successReport).toBeDefined();
    expect(successReport?.slayerHypothesisVerified).toBe(true);

    const reloadedCase = await caseManager.getCase(caseItem.caseId);
    expect(reloadedCase?.status).toBe("VERIFYING");
    expect(worldState.getState().floors["floor02_scripting"].status).toBe("ONLINE");
  });
});
