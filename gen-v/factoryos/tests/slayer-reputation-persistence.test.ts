import { describe, it, expect } from "vitest";
import { SlayerEngine } from "../core/slayers/SlayerEngine";
import { CaseManager } from "../core/cases/CaseManager";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryCaseRepository, InMemoryReputationRepository, InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS Frontier v2 — Phase 4: Slayer Reputation Persistence Suite", () => {
  it("1. Reputation Updates: Valid anomaly rewards XP and trust score; false positive applies penalty", async () => {
    const repRepo = new InMemoryReputationRepository();
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);
    const caseManager = new CaseManager(new InMemoryCaseRepository(), eventBus, worldState);

    const engine = new SlayerEngine(caseManager, eventBus, worldState, repRepo, 2000);
    await engine.start();

    const slayer = engine.getSlayer("slayer_general_patrol");
    expect(slayer).toBeDefined();

    const initialRep = slayer!.getReputation();
    expect(initialRep.xp).toBe(100);

    // 1. Reward valid anomaly
    await engine.updateSlayerReputation("slayer_general_patrol", true, false);
    const rewardedRep = slayer!.getReputation();
    expect(rewardedRep.xp).toBe(150);
    expect(rewardedRep.validAnomalies).toBe(1);

    // 2. Penalty on false positive
    await engine.updateSlayerReputation("slayer_general_patrol", false, true);
    const penalizedRep = slayer!.getReputation();
    expect(penalizedRep.falsePositives).toBe(1);
    expect(penalizedRep.trustScore).toBeLessThan(rewardedRep.trustScore);

    await engine.stop();

    // Verify saved in repository
    const saved = await repRepo.getSlayerReputation("slayer_general_patrol");
    expect(saved).toBeDefined();
    expect(saved?.xp).toBe(150);
    expect(saved?.falsePositives).toBe(1);
  });
});
