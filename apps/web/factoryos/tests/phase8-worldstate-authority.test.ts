import { describe, it, expect } from "vitest";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { DurableEventBus } from "../core/events/DurableEventBus";

describe("FactoryOS Frontier v2 — Phase 8: World State Authority & Snapshots Suite", () => {
  it("1. State Immutability: Mutating a returned snapshot does not corrupt internal WorldState", () => {
    const eventBus = new DurableEventBus();
    const engine = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    const snapshot = engine.getSnapshot();
    expect(snapshot.state.floors["floor01_strategy"].status).toBe("ONLINE");

    // Corrupt snapshot copy
    (snapshot.state.floors["floor01_strategy"] as any).status = "CORRUPTED";

    // Internal state remains clean
    const freshState = engine.getState();
    expect(freshState.floors["floor01_strategy"].status).toBe("ONLINE");
  });

  it("2. Sequence Numbers: Increments monotonically on state mutations", () => {
    const eventBus = new DurableEventBus();
    const engine = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    const seq1 = engine.getState().sequenceNumber;
    engine.updateFloorStatus("floor01_strategy", "DEGRADED", "Testing sequence increment");
    const seq2 = engine.getState().sequenceNumber;

    expect(seq2).toBeGreaterThan(seq1);
  });
});
