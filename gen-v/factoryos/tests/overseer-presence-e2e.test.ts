import { describe, it, expect } from "vitest";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import {
  InMemoryWorldStateRepository,
  InMemoryCaseRepository,
} from "../core/database/InMemoryDatabase";
import { CaseManager } from "../core/cases/CaseManager";
import { OverseerPresenceEngine } from "../core/overseer/presence";

describe("FactoryOS Frontier v2 — Overseer Presence Master E2E Suite", () => {
  it("1. Structured Envelope & Replay: Reconstructs state and replays missed sequences upon reconnection", async () => {
    const worldStateRepo = new InMemoryWorldStateRepository();
    const caseRepo = new InMemoryCaseRepository();

    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(worldStateRepo, eventBus as any);

    const caseManager = new CaseManager(caseRepo, eventBus);
    const presenceEngine = new OverseerPresenceEngine(eventBus, worldState, caseManager);

    await presenceEngine.start();

    // Initial snapshot check
    const initialSnap = presenceEngine.getSnapshot();
    expect(initialSnap.current.type).toBe("overseer.presence");
    expect(initialSnap.current.sequence).toBeGreaterThanOrEqual(1);

    const firstSeq = initialSnap.current.sequence;

    // Trigger several events
    await eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor03_asset_realization",
      description: "Shader compile lag",
      severity: "MEDIUM",
    });

    await eventBus.publish("USER_MESSAGE", {
      text: "How is rendering?",
    });

    // Reconnection snapshot with Last-Event-ID = firstSeq
    const reconnectedSnap = presenceEngine.getSnapshot(firstSeq);
    expect(reconnectedSnap.replay.length).toBeGreaterThanOrEqual(1);
    expect(reconnectedSnap.current.sequence).toBeGreaterThan(firstSeq);

    await presenceEngine.stop();
  });

  it("2. Browser Independence Invariant: FactoryOS operations proceed normally if Presence UI is disconnected", async () => {
    const worldStateRepo = new InMemoryWorldStateRepository();

    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(worldStateRepo, eventBus as any);

    const presenceEngine = new OverseerPresenceEngine(eventBus, worldState);
    await presenceEngine.start();

    // Factory event happens without any UI connected
    await eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor01_strategy",
      severity: "CRITICAL",
      description: "Strategy model timeout",
    });

    // State updated internally
    const envelope = presenceEngine.generateCurrentEnvelope();
    expect(envelope.intent).toBe("CRITICAL");
    expect(envelope.attention?.target).toBe("floor01_strategy");

    await presenceEngine.stop();
  });
});
