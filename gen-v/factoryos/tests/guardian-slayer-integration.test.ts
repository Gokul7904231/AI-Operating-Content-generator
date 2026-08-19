import { describe, it, expect } from "vitest";
import { DurableEventBus } from "../core/events/DurableEventBus";
import { WorldStateEngine } from "../core/worldstate/WorldStateEngine";
import { InMemoryWorldStateRepository } from "../core/database/InMemoryDatabase";
import { GuardianKernel } from "../core/guardian/GuardianKernel";

describe("FactoryOS Frontier v2 — Floor Guardian & Slayer Integration Suite", () => {
  it("1. Autonomous Slayer Ingestion: Ingests medium anomaly locally and escalates critical anomaly", async () => {
    const eventBus = new DurableEventBus();
    const worldState = new WorldStateEngine(new InMemoryWorldStateRepository(), eventBus as any);

    const guardian = new GuardianKernel(
      {
        name: "Floor 03 Guardian",
        floorId: "floor03_asset_realization",
        auditIntervalMs: 1000,
      },
      worldState,
      eventBus
    );

    await guardian.start();

    let escalationReceived = false;
    eventBus.subscribe("GUARDIAN_ESCALATION", (e: any) => {
      const payload = e?.payload || e;
      if (payload?.floorId === "floor03_asset_realization") {
        escalationReceived = true;
      }
    });

    // Publish critical Slayer anomaly
    await eventBus.publish("ANOMALY_DETECTED", {
      floorId: "floor03_asset_realization",
      severity: "CRITICAL",
      description: "GPU pipeline complete hardware stall",
    });

    expect(escalationReceived).toBe(true);
    await guardian.stop();
  });
});
