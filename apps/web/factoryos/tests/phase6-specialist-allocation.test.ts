import { describe, it, expect } from "vitest";
import { HealerEngine } from "../core/healers/HealerEngine";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import type { Case } from "../core/contracts/CaseContracts";

describe("FactoryOS Frontier v2 — Phase 6: Dynamic Specialist Allocation Suite", () => {
  const eventBus = new DurableEventBus();
  const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
  const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);
  const engine = new HealerEngine(caseManager, eventBus, worldState);

  it("1. Dynamic Squad Sizing: Allocates appropriate squad size based on severity", () => {
    const lowCase: Case = {
      caseId: "case_low",
      title: "Minor pipeline lag",
      floorId: "floor02_scripting",
      category: "PIPELINE_STALL",
      severity: "LOW",
      status: "DETECTED",
      detectorId: "slayer_pipeline",
      createdAt: new Date().toISOString(),
    } as unknown as Case;
    const lowSquad = engine.allocateHealers(lowCase);
    expect(lowSquad.length).toBe(1);
    expect(lowSquad[0].config.healerId).toBe("healer_pipeline");

    const highCase: Case = {
      caseId: "case_high",
      title: "Critical GPU failure",
      floorId: "floor03_asset_realization",
      category: "RENDER_ARTIFACT",
      severity: "HIGH",
      status: "DETECTED",
      detectorId: "slayer_rendering",
      createdAt: new Date().toISOString(),
    } as unknown as Case;
    const highSquad = engine.allocateHealers(highCase);
    expect(highSquad.length).toBeGreaterThanOrEqual(2);
    expect(highSquad.some((h) => h.config.healerId === "healer_rendering")).toBe(true);
    expect(highSquad.some((h) => h.config.healerId === "healer_diagnostic")).toBe(true);
  });
});
