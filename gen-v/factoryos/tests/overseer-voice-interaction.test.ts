import { describe, it, expect } from "vitest";
import { OverseerPresenceEngine } from "../core/overseer/presence/OverseerPresenceEngine";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS — Voice Mode Interaction Tests", () => {
  it("processes voice interaction and transitions voice state", () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), true);
    const presenceEngine = new OverseerPresenceEngine(eventBus, worldState);

    presenceEngine.intentEngine.pushIntent("LISTENING", {
      priority: "USER_INTERACTION",
      durationMs: 2000,
      cause: "Voice input detected",
    });

    const envelope = presenceEngine.generateCurrentEnvelope({ sourceEvent: "USER_INTERACTION" });
    expect(envelope.type).toBe("overseer.presence");
    expect(envelope.intent).toBe("LISTENING");
  });
});
