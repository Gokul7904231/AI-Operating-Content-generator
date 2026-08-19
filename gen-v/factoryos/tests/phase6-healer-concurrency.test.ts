import { describe, it, expect } from "vitest";
import { HealerEngine } from "../core/healers/HealerEngine";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import type { Case } from "../core/contracts/CaseContracts";

describe("FactoryOS Frontier v2 — Phase 6: Healer Swarm Concurrency Suite", () => {
  it("1. Independent Multi-Case Parallelism: Two independent cases heal concurrently", async () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
    const engine = new HealerEngine(caseManager, eventBus, worldState);

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
});
