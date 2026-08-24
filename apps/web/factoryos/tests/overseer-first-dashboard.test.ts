import { describe, it, expect } from "vitest";
import { OverseerPresenceEngine } from "../core/overseer/presence/OverseerPresenceEngine";
import { OVERSEER_EXPRESSION_PRESETS } from "../core/overseer/presence/OverseerExpressionPresets";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS — Overseer-First Dashboard Unit Tests", () => {
  it("initializes authoritative presence engine", () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), true);
    const presenceEngine = new OverseerPresenceEngine(eventBus, worldState);
    expect(presenceEngine).toBeDefined();

    const envelope = presenceEngine.generateCurrentEnvelope({ sourceEvent: "STARTUP" });
    expect(envelope.type).toBe("overseer.presence");
    expect(envelope.intent).toBeDefined();
    expect(envelope.faceParameters).toBeDefined();
  });

  it("provides valid default dark industrial expressions for Overseer face", () => {
    expect(OVERSEER_EXPRESSION_PRESETS.IDLE).toBeDefined();
    expect(OVERSEER_EXPRESSION_PRESETS.IDLE.eye.openness).toBeGreaterThan(0.5);
    expect(OVERSEER_EXPRESSION_PRESETS.THINKING).toBeDefined();
    expect(OVERSEER_EXPRESSION_PRESETS.WARNING).toBeDefined();
    expect(OVERSEER_EXPRESSION_PRESETS.CRITICAL).toBeDefined();
  });
});
