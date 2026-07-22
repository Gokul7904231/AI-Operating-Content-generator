import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";
import { AIConfigManager } from "../../ai/ai-config-manager";

class ConfigurationRegistryClass implements RuntimeComponent {
  id = "ConfigurationRegistry";
  version = "1.0.0";

  get(key: string, defaultValue = ""): string {
    return process.env[key] || defaultValue;
  }

  getProviderConfig(providerId: string) {
    AIConfigManager.loadAll();
    return AIConfigManager.providers.find((p) => p.id === providerId);
  }

  getFeatureFlag(flagName: string): boolean {
    const val = process.env[`FLAG_${flagName.toUpperCase()}`];
    return val === "true" || val === "1";
  }

  async health(): Promise<ComponentHealth> {
    return {
      status: "healthy",
      lastChecked: new Date().toISOString(),
    };
  }

  async metrics(): Promise<ComponentMetrics> {
    AIConfigManager.loadAll();
    return {
      providersCount: AIConfigManager.providers.length,
      modelsCount: AIConfigManager.models.length,
      activeStrategy: AIConfigManager.routing.strategy,
    };
  }

  async shutdown(): Promise<void> {}
}

export const ConfigurationRegistry = new ConfigurationRegistryClass();
