import { describe, it, expect } from "vitest";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { GeneralPatrolSlayer } from "../core/slayers/SpecializedSlayers";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Investigation Budget Suite", () => {
  it("1. Bounded Evidence Count: Investigation restricts evidence collection to maxEvidenceCount", async () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);

    const slayer = new GeneralPatrolSlayer(caseManager, eventBus);

    const observation = {
      observationId: "obs_test_01",
      floorId: "floor03_asset_realization",
      target: "floor03_asset_realization",
      category: "WORKER_STALL" as const,
      severity: "HIGH" as const,
      description: "Render engine stall detected",
      rawMetrics: { status: "DEGRADED" },
      observedAt: new Date().toISOString(),
    };

    const report = await slayer.investigateAndSubmit(observation, worldState.getState(), 0.95);
    expect(report).toBeDefined();
    expect(report.evidence.length).toBeLessThanOrEqual(10);
    expect(report.hypotheses.length).toBeGreaterThan(0);
  });
});
