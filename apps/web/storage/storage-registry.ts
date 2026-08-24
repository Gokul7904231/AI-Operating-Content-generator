/**
 * Storage Registry
 *
 * Singleton that mirrors the AIProviderRegistry pattern.
 * Providers register themselves; the Engine Runtime queries this registry
 * to get the active storage provider without knowing its implementation.
 */

import type { StorageProvider } from "./storage-provider";

class StorageProviderRegistryClass {
  private providers = new Map<string, StorageProvider>();
  private primaryId: string | null = null;

  /**
   * Register a storage provider.
   * The first registered provider automatically becomes primary
   * unless overridden by setPrimary().
   */
  register(provider: StorageProvider): void {
    console.log(
      `[StorageRegistry] Registering provider: "${provider.name}" (${provider.id})`
    );
    this.providers.set(provider.id, provider);

    // First registered becomes primary unless explicitly overridden
    if (!this.primaryId) {
      this.primaryId = provider.id;
      console.log(
        `[StorageRegistry] Primary provider set to: "${provider.id}"`
      );
    }
  }

  /**
   * Explicitly set the primary (default) storage provider.
   */
  setPrimary(id: string): void {
    if (!this.providers.has(id)) {
      throw new Error(
        `[StorageRegistry] Cannot set primary: provider "${id}" is not registered.`
      );
    }
    this.primaryId = id;
    console.log(`[StorageRegistry] Primary provider changed to: "${id}"`);
  }

  /**
   * Get a provider by its ID.
   */
  getProvider(id: string): StorageProvider {
    const p = this.providers.get(id);
    if (!p) {
      throw new Error(
        `[StorageRegistry] Provider "${id}" is not registered. Available: ${this.getProviderIds().join(", ")}`
      );
    }
    return p;
  }

  /**
   * Get the primary (default) storage provider.
   * Falls back to env PRIMARY_STORAGE_PROVIDER → first registered.
   */
  getPrimary(): StorageProvider {
    const envPrimary = process.env.PRIMARY_STORAGE_PROVIDER;
    const resolvedId = envPrimary ?? this.primaryId;

    if (!resolvedId) {
      throw new Error(
        "[StorageRegistry] No storage providers registered. Did you forget to call StorageRegistry.register()?"
      );
    }

    return this.getProvider(resolvedId);
  }

  /**
   * Returns all registered storage providers.
   */
  getAllProviders(): StorageProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Returns all registered provider IDs.
   */
  getProviderIds(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Returns true if the given provider ID is registered.
   */
  hasProvider(id: string): boolean {
    return this.providers.has(id);
  }
}

export const StorageRegistry = new StorageProviderRegistryClass();
