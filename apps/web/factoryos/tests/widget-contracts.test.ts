import { describe, it, expect } from "vitest";
import { useFactoryStore } from "../../lib/factory-store";

describe("FactoryOS v1 — Widget Contracts & Data Provenance Rules", () => {
  it("initializes subsystem statuses as loading before network sync", () => {
    const store = useFactoryStore.getState();
    expect(store.subsystems.providers).toBe("loading");
    expect(store.subsystems.runtime).toBe("loading");
  });

  it("enforces SubsystemStatus state transitions upon API error", async () => {
    // Simulate failed network state
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: false,
        status: 500,
        json: async () => ({ success: false, error: "Internal Server Error" }),
      } as Response;
    };

    const store = useFactoryStore.getState();
    await store.fetchState();

    const updatedStore = useFactoryStore.getState();
    expect(updatedStore.subsystems.runtime).toBe("offline");
    expect(updatedStore.subsystems.providers).toBe("unavailable");
    expect(updatedStore.error).toBe("HTTP 500: Failed to load factory state");

    // Restore fetch
    global.fetch = originalFetch;
  });

  it("populates provenance metadata upon successful sync", async () => {
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          success: true,
          system: { cpuUsagePct: 15, memUsagePct: 40, diskUsagePct: 30, healthPct: 98 },
          jobsSummary: { total: 10, completed: 8, failed: 1, running: 1, queued: 0 },
          activeProviders: [{ id: "google", name: "Google Gemini" }],
          activeEngines: ["remotion"],
          events: [],
        }),
      } as Response;
    };

    const store = useFactoryStore.getState();
    await store.fetchState();

    const updatedStore = useFactoryStore.getState();
    expect(updatedStore.subsystems.runtime).toBe("live");
    expect(updatedStore.subsystems.providers).toBe("live");
    expect(updatedStore.system.provenance?.source).toBe("/api/factory-state");
    expect(updatedStore.system.containerCpuPct).toBe(15);
    expect(updatedStore.system.containerMemPct).toBe(40);

    // Restore fetch
    global.fetch = originalFetch;
  });
});
