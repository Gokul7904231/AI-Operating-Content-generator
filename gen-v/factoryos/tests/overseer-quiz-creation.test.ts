import { describe, it, expect } from "vitest";
import { MissionManager } from "../core/missions/MissionManager";
import { InMemoryMissionRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS — Quiz Short Creation Pipeline Tests", () => {
  it("dispatches real production mission for space quiz short creation", async () => {
    const missionManager = new MissionManager(new InMemoryMissionRepository());

    const topic = "Space & Astrophysics";
    const mission = await missionManager.createMission({
      goal: `Produce 30s Quiz Short: "${topic}"`,
      objective: `Execute 9-stage content generation pipeline for topic: ${topic}`,
      constraints: ["MAX_DURATION_30S", "VALIDATE_QUIZ_FACTS"],
      scope: { floorIds: ["floor01_strategy", "floor02_scripting", "floor03_asset_realization"] },
    });

    expect(mission.missionId).toBeDefined();
    expect(mission.objective).toContain("Space & Astrophysics");

    await missionManager.startMission(mission.missionId, "run_quiz_001");
    const retrieved = await missionManager.getMission(mission.missionId);
    expect(retrieved?.status).toBe("RUNNING");
  });
});
