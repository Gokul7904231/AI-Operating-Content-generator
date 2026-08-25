import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";
import { AIConfigManager } from "../../ai/ai-config-manager";
import { AIProviderRegistry } from "../../ai/capability-registry";

class ProviderDiscoveryClass implements RuntimeComponent {
  id = "ProviderDiscovery";
  version = "2.0.0";

  private intervalId: NodeJS.Timeout | null = null;
  private initialized = false;
  private isReady = false;
  private lastDiscoveryTime = 0;
  private initPromise: Promise<void> | null = null;
  private discoveringPromise: Promise<void> | null = null;

  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Idempotent initialization. Concurrent callers share the same promise.
   * Starts a single 30-minute periodic refresh timer per process.
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      console.log("[ProviderDiscovery] Starting boot discovery loop...");
      try {
        await this.discoverAll();

        // Start a single periodic 30-min refresh timer if not already active
        if (!this.intervalId) {
          this.intervalId = setInterval(() => {
            console.log("[ProviderDiscovery] Triggering periodic model refresh...");
            this.discoverAll().catch((err: any) => {
              console.error("[ProviderDiscovery] Periodic refresh failed:", err?.message || String(err));
            });
          }, 1800000); // 30 minutes

          // Unref timer so it does not hold the Node.js event loop open
          if (this.intervalId.unref) {
            this.intervalId.unref();
          }
        }

        this.initialized = true;
      } catch (err: any) {
        console.error("[ProviderDiscovery] Boot discovery failed:", err?.message || String(err));
      } finally {
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Executes provider diagnostics and model discovery.
   * Guaranteed not to overlap with concurrent discoverAll() invocations.
   */
  async discoverAll(): Promise<void> {
    if (this.discoveringPromise) {
      return this.discoveringPromise;
    }

    this.discoveringPromise = (async () => {
      try {
        // 1. Read configured providers
        AIConfigManager.loadAll();
        const plugins = AIProviderRegistry.getAllPlugins();

        for (const plugin of plugins) {
          console.log(`[ProviderDiscovery] Validating and configuring plugin: ${plugin.id}`);
          try {
            // 2. Validate keys & Perform base diagnostics
            const isHealthy = await plugin.health();
            if (!isHealthy) {
              console.warn(`[ProviderDiscovery] Plugin ${plugin.id} is unhealthy/unauthorized.`);
              continue;
            }

            // 3. Discover models
            const models = await plugin.discoverModels();
            console.log(`[ProviderDiscovery] Plugin ${plugin.id} discovered ${models.length} active models.`);

            // 4. Update local registry mappings
            const metrics = plugin.status();
            metrics.state = "ONLINE";
            metrics.lastChecked = Date.now();
          } catch (err: any) {
            console.error(`[ProviderDiscovery] Failed to initialize plugin ${plugin.id}:`, err?.message || String(err));
          }
        }

        this.isReady = true;
        this.lastDiscoveryTime = Date.now();
        console.log("[ProviderDiscovery] All registered providers initialized and dynamic capability maps created.");
      } catch (err: any) {
        console.error("[ProviderDiscovery] Global discoverAll cycle encountered an error:", err?.message || String(err));
      } finally {
        this.discoveringPromise = null;
      }
    })();

    return this.discoveringPromise;
  }

  async health(): Promise<ComponentHealth> {
    return {
      status: this.isReady ? "healthy" : "degraded",
      lastChecked: new Date().toISOString(),
    };
  }

  async metrics(): Promise<ComponentMetrics> {
    return {
      isReady: this.isReady,
      lastDiscoveryTime: this.lastDiscoveryTime,
    };
  }

  async shutdown(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.initialized = false;
    this.isReady = false;
    this.initPromise = null;
    this.discoveringPromise = null;
  }
}

export const ProviderDiscovery = new ProviderDiscoveryClass();
