import { describe, it, expect } from "vitest";
import { LeaseManager } from "../core/leases/LeaseManager";
import { InMemoryCaseRepository, InMemoryLeaseRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { CaseManager } from "../core/cases/CaseManager";
import { GeneralPatrolSlayer } from "../core/slayers/SpecializedSlayers";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Negative Safety Suite", () => {
  it("1. Stale / Expired Zone Lease: Halts patrol and emits SLAYER_ZONE_LOST when lease cannot be acquired", async () => {
    const leaseRepo = new InMemoryLeaseRepository();
    const leaseManager = new LeaseManager(leaseRepo);
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);

    // Pre-lock zone_general_patrol by another agent
    await leaseManager.acquire("zone_general_patrol", "other_competing_agent", 60000);

    let zoneLostFired = false;
    eventBus.subscribe("SLAYER_ZONE_LOST", () => {
      zoneLostFired = true;
    });

    const slayer = new GeneralPatrolSlayer(caseManager, eventBus, leaseManager);
    const report = await slayer.patrolAndInvestigate(worldState.getState());

    expect(report).toBeNull();
    expect(zoneLostFired).toBe(true);
  });
});
