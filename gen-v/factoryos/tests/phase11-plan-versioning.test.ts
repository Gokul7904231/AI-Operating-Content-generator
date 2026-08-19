import { describe, it, expect } from "vitest";
import { MissionManager } from "../core/missions/MissionManager";
import { InMemoryMissionRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";

describe("FactoryOS Frontier v2 — Phase 11: Mission Plan Versioning Suite", () => {
  it("1. OCC Plan Versioning: Updates version monotonically on atomic state transitions", async () => {
    const eventBus = new DurableEventBus();
    const manager = new MissionManager(new InMemoryMissionRepository(), eventBus);

    const mission = await manager.createMission({
      goal: "Generate video assets",
    });
    expect(mission.version).toBe(1);

    const started = await manager.startMission(mission.missionId);
    expect(started.version).toBe(2);

    const updated = await manager.updateProgress(mission.missionId, 1, 5);
    expect(updated.version).toBe(3);
  });
});
