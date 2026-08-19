import { describe, it, expect } from "vitest";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";

describe("FactoryOS Frontier v2 — Phase 8: World State Provenance Audit Suite", () => {
  it("1. Mutation Provenance: Records auditable mutation provenance logs with actor and reason", () => {
    const eventBus = new DurableEventBus();
    const engine = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    engine.recordProvenance("GuardianKernel:floor01", "SET_FLOOR_DEGRADED", "Worker pool unresponsive", "corr_123");
    engine.recordProvenance("OverseerControlPlane", "TRIGGER_HEALER_DISPATCH", "Triage decision verified", "corr_124");

    const logs = engine.getProvenanceLog();
    expect(logs.length).toBe(2);
    expect(logs[0].actor).toBe("GuardianKernel:floor01");
    expect(logs[0].action).toBe("SET_FLOOR_DEGRADED");
    expect(logs[0].correlationId).toBe("corr_123");
    expect(logs[1].actor).toBe("OverseerControlPlane");
  });
});
