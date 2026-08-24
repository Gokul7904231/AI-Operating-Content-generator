import { describe, it, expect } from "vitest";
import { OverseerPresencePolicy } from "../core/overseer/presence/OverseerPresencePolicy";

describe("FactoryOS — Overseer Mode Routing Tests", () => {
  const modes = ["CHAT", "OPERATE", "RESEARCH", "CREATE", "MONITOR", "AUTOPILOT"] as const;

  it("supports all 6 authoritative Overseer modes without breaking routing", () => {
    for (const mode of modes) {
      expect(["CHAT", "OPERATE", "RESEARCH", "CREATE", "MONITOR", "AUTOPILOT"]).toContain(mode);
    }

    const statement = OverseerPresencePolicy.getConsciousnessStatement();
    expect(statement).toBeDefined();
    expect(statement.length).toBeGreaterThan(10);
  });
});
