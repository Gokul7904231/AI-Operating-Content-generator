import { describe, it, expect } from "vitest";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";

describe("FactoryOS Frontier v2 — Phase 8: World State Scoped Projections Suite", () => {
  it("1. Scoped Floor Projection: Extracts isolated projection for a specific floor", () => {
    const eventBus = new DurableEventBus();
    const engine = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    const f01 = engine.getFloorProjection("floor01_strategy");
    expect(f01).toBeDefined();
    expect(f01?.name).toContain("Strategic");
    expect(f01?.status).toBe("ONLINE");

    const nonExistent = engine.getFloorProjection("floor99_unknown");
    expect(nonExistent).toBeNull();
  });

  it("2. Scoped Worker Projection: Extracts isolated worker projection", () => {
    const eventBus = new DurableEventBus();
    const engine = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    engine.registerWorker({
      workerId: "worker_script_10",
      role: "WORKER",
      specialization: "SCRIPTING",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: { tasksCompleted: 10, tasksFailed: 0, uptimeSeconds: 200, averageLatencyMs: 30 },
    });

    const worker = engine.getWorkerProjection("worker_script_10");
    expect(worker).toBeDefined();
    expect(worker?.specialization).toBe("SCRIPTING");
  });
});
