/**
 * Service Registry
 *
 * Centralizes all core singleton services (Logger, HealthManager, registries, engines).
 * Enables clean decoupling and dynamic plugin registrations.
 */

class ServiceRegistryClass {
  private services = new Map<string, any>();

  /**
   * Registers a service singleton instance.
   */
  register(id: string, instance: any): void {
    console.log(`[ServiceRegistry] Registered service: "${id}"`);
    this.services.set(id, instance);
  }

  /**
   * Retrieves a registered service instance.
   */
  get<T = any>(id: string): T {
    const service = this.services.get(id);
    if (!service) {
      throw new Error(`[ServiceRegistry] Service "${id}" is not registered in the core registry.`);
    }
    return service as T;
  }

  /**
   * Checks if a service is registered.
   */
  has(id: string): boolean {
    return this.services.has(id);
  }

  /**
   * Clears all registered services.
   */
  clear(): void {
    this.services.clear();
  }
}

const globalForServiceRegistry = globalThis as unknown as {
  ServiceRegistry: ServiceRegistryClass;
};

export const ServiceRegistry =
  globalForServiceRegistry.ServiceRegistry || new ServiceRegistryClass();

if (process.env.NODE_ENV !== "production") {
  globalForServiceRegistry.ServiceRegistry = ServiceRegistry;
}
