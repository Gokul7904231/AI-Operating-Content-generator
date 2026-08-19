import { describe, it, expect } from "vitest";
import { MissionManager } from "../core/missions/MissionManager";
import { InMemoryMissionRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";

describe("FactoryOS Frontier v2 — Phase 11: Mission Intelligence & Automated Replanning Suite", () => {
  it("1. Automatic Budget Replan: Budget exhaustion triggers REPLANNING status under REPLAN policy", async () => {
    const eventBus = new DurableEventBus();
    const manager = new MissionManager(new InMemoryMissionRepository(), eventBus);

    const mission = await manager.createMission({
      goal: "Generate long-form educational series",
      budget: { maxTokens: 1000 },
      failurePolicy: "REPLAN",
    });

    await manager.startMission(mission.missionId);

    // Consume 1200 tokens (breaches budget)
    const result = await manager.recordBudgetConsumption(mission.missionId, { tokens: 1200, costUsd: 0.05 });

    expect(result.budgetExceeded).toBe(true);
    expect(result.mission.status).toBe("REPLANNING");
    expect(result.mission.metrics.replanCount).toBe(1);
  });
});
