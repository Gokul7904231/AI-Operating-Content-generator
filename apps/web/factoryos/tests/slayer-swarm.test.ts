import { describe, it, expect, beforeEach } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { SlayerEngine } from "../core/slayers/SlayerEngine";
import { InMemoryReputationRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS v1 — Slayer Swarm Suite", () => {
  let eventBus: DurableEventBus;
  let worldState: WorldStateEngine;
  let caseManager: CaseManager;
  let repRepo: InMemoryReputationRepository;
  let slayerEngine: SlayerEngine;

  beforeEach(() => {
    eventBus = new DurableEventBus();
    worldState = new WorldStateEngine();
    caseManager = new CaseManager(undefined, eventBus, worldState);
    repRepo = new InMemoryReputationRepository();
    slayerEngine = new SlayerEngine(caseManager, eventBus, worldState, repRepo, 100);
  });

  it("01: Registers all 6 specialized Slayers with initial healthy heartbeats", () => {
    const slayers = slayerEngine.getAllSlayers();
    expect(slayers.length).toBe(6);

    const specializations = slayers.map((s) => s.config.specialization);
    expect(specializations).toContain("GENERAL_PATROL");
    expect(specializations).toContain("GPU_COMPUTE");
    expect(specializations).toContain("PIPELINE");
    expect(specializations).toContain("RENDERING");
    expect(specializations).toContain("CONTENT_QUALITY");
    expect(specializations).toContain("SECURITY_PERMISSION");

    const state = worldState.getState();
    expect(state.workers["slayer_general_patrol"].status).toBe("HEALTHY");
    expect(state.workers["slayer_compute"].status).toBe("HEALTHY");
  });

  it("02: Detective patrol observes floor anomaly and files structured case with evidence", async () => {
    // Inject degraded floor state
    worldState.updateFloorStatus("floor02_scripting", "ERROR", "Unhandled prompt execution exception");

    await slayerEngine.runPatrolCycle();

    const activeCases = await caseManager.getActiveCases();
    expect(activeCases.length).toBeGreaterThanOrEqual(1);

    const filedCase = activeCases.find((c) => c.floorId === "floor02_scripting");
    expect(filedCase).toBeDefined();
    expect(filedCase?.status).toBe("DETECTED");
    expect(filedCase?.evidence.length).toBeGreaterThan(0);
    expect(filedCase?.hypotheses.length).toBeGreaterThan(0);
  });

  it("03: Detective patrol detects compute resource exhaustion", async () => {
    worldState.updateResources({ cpuPercent: 95.5 });

    await slayerEngine.runPatrolCycle();

    const activeCases = await caseManager.getActiveCases();
    const computeCase = activeCases.find((c) => c.category === "RESOURCE_EXHAUSTION" || c.category === "RESOURCE_STARVATION");
    expect(computeCase).toBeDefined();
    expect(computeCase?.severity).toBe("HIGH");
    expect(computeCase?.detectorId).toBe("slayer_compute");
  });

  it("04: Updates Slayer reputation upon filing verified anomalies", async () => {
    const slayer = slayerEngine.getSlayer("slayer_general_patrol");
    expect(slayer).toBeDefined();
    const initialXP = slayer!.getReputation().xp;

    slayer!.updateReputation(true); // Verified discovery
    const updatedRep = slayer!.getReputation();
    expect(updatedRep.xp).toBeGreaterThan(initialXP);
    expect(updatedRep.validAnomalies).toBe(1);
  });
});
