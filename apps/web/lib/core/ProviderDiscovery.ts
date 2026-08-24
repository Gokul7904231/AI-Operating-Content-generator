import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";
import { AIConfigManager } from "../../ai/ai-config-manager";
import { AIProviderRegistry } from "../../ai/capability-registry";

class ProviderDiscoveryClass implements RuntimeComponent {
  id = "ProviderDiscovery";
  version = "1.0.0";

  private intervalId: NodeJS.Timeout | null = null;
  private isReady = false;
  private lastDiscoveryTime = 0;

  async init() {
    console.log("[ProviderDiscovery] Starting boot discovery loop...");
    await this.discoverAll();
    
    // Start periodic 30-min refreshes
    this.intervalId = setInterval(() => {
      console.log("[ProviderDiscovery] Triggering periodic model refresh...");
      this.discoverAll().catch((err) => {
        console.error("[ProviderDiscovery] Periodic refresh failed:", err.message);
      });
    }, 1800000); // 30 minutes
  }

  async discoverAll() {
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
        // The base plugin status checks will transition to ONLINE
        const metrics = plugin.status();
        metrics.state = "ONLINE";
        metrics.lastChecked = Date.now();
      } catch (err: any) {
        console.error(`[ProviderDiscovery] Failed to initialize plugin ${plugin.id}:`, err.message);
      }
    }

    this.isReady = true;
    this.lastDiscoveryTime = Date.now();
    console.log("[ProviderDiscovery] All registered providers initialized and dynamic capability maps created.");
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
    }
  }
}

export const ProviderDiscovery = new ProviderDiscoveryClass();
