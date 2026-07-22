import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";
import { CacheManager } from "./cache/cache-manager";
import { WorkerPoolManager } from "./WorkerPoolManager";

class MetricsRegistryClass implements RuntimeComponent {
  id = "MetricsRegistry";
  version = "1.0.0";

  private systemStartTime = Date.now();
  private counters: Record<string, number> = {};

  increment(key: string, amount = 1) {
    this.counters[key] = (this.counters[key] || 0) + amount;
  }

  getCounter(key: string): number {
    return this.counters[key] || 0;
  }

  async health(): Promise<ComponentHealth> {
    return {
      status: "healthy",
      lastChecked: new Date().toISOString(),
    };
  }

  async metrics(): Promise<ComponentMetrics> {
    const cacheStats = CacheManager.getCombinedStats();
    const workerStats = WorkerPoolManager.getStats();

    return {
      uptimeSeconds: Math.round((Date.now() - this.systemStartTime) / 1000),
      counters: this.counters,
      caches: cacheStats,
      workers: workerStats,
    };
  }

  async shutdown(): Promise<void> {
    this.counters = {};
  }
}

export const MetricsRegistry = new MetricsRegistryClass();
