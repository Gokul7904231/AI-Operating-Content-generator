import { describe, it, expect } from "vitest";
import { LeaseManager } from "../core/leases/LeaseManager";
import { InMemoryLeaseRepository, InMemoryWorldStateRepository, InMemoryCaseRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { CaseManager } from "../core/cases/CaseManager";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { GeneralPatrolSlayer } from "../core/slayers/SpecializedSlayers";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Detection Zone Leases Suite", () => {
  it("1. Exclusive Zone Acquisition: Slayer successfully acquires zone lease", async () => {
    const leaseRepo = new InMemoryLeaseRepository();
    const leaseManager = new LeaseManager(leaseRepo);
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);

    const slayer = new GeneralPatrolSlayer(caseManager, eventBus, leaseManager);
    const hasLease = await slayer.ensureZoneOwnership();

    expect(hasLease).toBe(true);

    const zoneLease = await leaseManager.getLease("zone_general_patrol");
    expect(zoneLease).toBeDefined();
    expect(zoneLease?.ownerAgentId).toBe("slayer_general_patrol");
  });

  it("2. Collision Rejection: Second agent cannot acquire owned zone lease", async () => {
    const leaseRepo = new InMemoryLeaseRepository();
    const leaseManager = new LeaseManager(leaseRepo);
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);

    const slayerA = new GeneralPatrolSlayer(caseManager, eventBus, leaseManager);
    await slayerA.ensureZoneOwnership();

    // Agent B attempts to steal zone_general_patrol
    const stolen = await leaseManager.acquire("zone_general_patrol", "rogue_slayer_b", 30000);
    expect(stolen).toBe(false);
  });
});
