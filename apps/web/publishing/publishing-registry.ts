/**
 * Publishing Registry
 *
 * Singleton that mirrors StorageRegistry and AIProviderRegistry.
 * Publishing providers register themselves; the Publisher Queue
 * looks them up by ID without knowing their implementation.
 */

import type { PublishingProvider } from "./publishing-provider";

class PublishingRegistryClass {
  private providers = new Map<string, PublishingProvider>();

  register(provider: PublishingProvider): void {
    console.log(
      `[PublishingRegistry] Registered platform: "${provider.name}" (${provider.id})`
    );
    this.providers.set(provider.id, provider);
  }

  getProvider(id: string): PublishingProvider {
    const p = this.providers.get(id);
    if (!p) {
      throw new Error(
        `[PublishingRegistry] Platform "${id}" is not registered. Available: ${this.getProviderIds().join(", ")}`
      );
    }
    return p;
  }

  getAllProviders(): PublishingProvider[] {
    return Array.from(this.providers.values());
  }

  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
}

export const PublishingRegistry = new PublishingRegistryClass();
