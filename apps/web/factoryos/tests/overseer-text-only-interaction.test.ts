import { describe, it, expect } from "vitest";
import { OverseerPresenceEngine } from "../core/overseer/presence/OverseerPresenceEngine";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";

describe("FactoryOS — Strict Text-Only Interaction Tests", () => {
  it("processes text command without enabling voice synthesis state", () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), true);
    const presenceEngine = new OverseerPresenceEngine(eventBus, worldState);

    presenceEngine.intentEngine.pushIntent("THINKING", {
      priority: "USER_INTERACTION",
      durationMs: 3000,
      cause: "User text prompt",
    });

    const envelope = presenceEngine.generateCurrentEnvelope({ sourceEvent: "USER_INTERACTION" });
    expect(envelope.type).toBe("overseer.presence");
    // Text interactions must NOT set voiceState to SPEAKING
    expect(envelope.voiceState).not.toBe("SPEAKING");
    expect(envelope.intent).toBe("THINKING");
  });
});
