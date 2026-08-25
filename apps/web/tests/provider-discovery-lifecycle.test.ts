import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProviderDiscovery } from "../lib/core/ProviderDiscovery";
import { AIProviderRegistry } from "../ai/capability-registry";

describe("ProviderDiscovery Lifecycle & FactoryState Concurrency Suite", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await ProviderDiscovery.shutdown();
  });

  afterEach(async () => {
    await ProviderDiscovery.shutdown();
  });

  it("A. ProviderDiscovery.init() called once initializes cleanly", async () => {
    expect(ProviderDiscovery.isInitialized()).toBe(false);
    await ProviderDiscovery.init();
    expect(ProviderDiscovery.isInitialized()).toBe(true);

    const health = await ProviderDiscovery.health();
    expect(health.status).toBe("healthy");
  });

  it("B. init() called 100 times creates only one timer and does not duplicate intervals", async () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    
    // Call init 100 times in sequence
    for (let i = 0; i < 100; i++) {
      await ProviderDiscovery.init();
    }

    // Exactly 1 interval should be registered across all 100 calls
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(ProviderDiscovery.isInitialized()).toBe(true);
  });

  it("C. concurrent init() calls share a single initialization promise", async () => {
    const discoverAllSpy = vi.spyOn(ProviderDiscovery, "discoverAll");

    // Launch 50 concurrent init calls
    await Promise.all(
      Array.from({ length: 50 }).map(() => ProviderDiscovery.init())
    );

    // discoverAll should only be invoked once by the shared promise
    expect(discoverAllSpy).toHaveBeenCalledTimes(1);
    expect(ProviderDiscovery.isInitialized()).toBe(true);
  });

  it("D. discoverAll() cannot overlap when called concurrently", async () => {
    let activeDiscoveries = 0;
    let maxConcurrent = 0;

    const mockPlugin = {
      id: "mock-provider",
      name: "Mock Provider",
      health: async () => {
        activeDiscoveries++;
        maxConcurrent = Math.max(maxConcurrent, activeDiscoveries);
        await new Promise((r) => setTimeout(r, 20));
        activeDiscoveries--;
        return true;
      },
      discoverModels: async () => ["model-1"],
      status: () => ({ state: "ONLINE", lastChecked: Date.now() })
    };

    vi.spyOn(AIProviderRegistry, "getAllPlugins").mockReturnValue([mockPlugin as any]);

    // Fire 10 concurrent discoverAll calls
    await Promise.all(
      Array.from({ length: 10 }).map(() => ProviderDiscovery.discoverAll())
    );

    // Max concurrent discovery cycles must be exactly 1
    expect(maxConcurrent).toBe(1);
  });

  it("E. failed discovery cycle does not crash or leave locks stuck", async () => {
    const mockFailingPlugin = {
      id: "broken-provider",
      name: "Broken Provider",
      health: async () => {
        throw new Error("Upstream connection timeout");
      },
      discoverModels: async () => [],
      status: () => ({ state: "ERROR", lastChecked: Date.now() })
    };

    vi.spyOn(AIProviderRegistry, "getAllPlugins").mockReturnValue([mockFailingPlugin as any]);

    // Should not throw an uncaught exception
    await expect(ProviderDiscovery.init()).resolves.toBeUndefined();
    expect(ProviderDiscovery.isInitialized()).toBe(true);
  });

  it("F. repeated factory-state simulations do not create duplicate timers or block", async () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");
    
    // Simulate 100 fast polling hits from frontend
    for (let i = 0; i < 100; i++) {
      if (!ProviderDiscovery.isInitialized()) {
        await ProviderDiscovery.init();
      }
    }

    // Only 1 interval created
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
