/**
 * Version Registry
 *
 * Exposes running version mappings for all ShortFactory subsystems.
 * Enables automatic self-registration of engines, renderers, publishing endpoints,
 * and prompt modules.
 */

export interface ModuleVersion {
  id: string;
  version: string;
}

class VersionRegistryClass {
  private versions = new Map<string, string>();

  constructor() {
    // Populate default core versions
    this.register({ id: "core", version: "2.1.0" });
    this.register({ id: "runtime", version: "2.0.0" });
    this.register({ id: "storage", version: "1.3.2" });
    this.register({ id: "publisher", version: "1.0.0" });
    this.register({ id: "okf", version: "1.0.0" });
  }

  /**
   * Self-registration interface for modules.
   */
  register(mod: ModuleVersion): void {
    console.log(`[VersionRegistry] Registered module "${mod.id}" at version: "${mod.version}"`);
    this.versions.set(mod.id, mod.version);
  }

  /**
   * Retrieves a module's version.
   */
  get(id: string): string {
    return this.versions.get(id) ?? "1.0.0";
  }

  /**
   * Lists all registered modules and versions.
   */
  getAll(): Record<string, string> {
    const list: Record<string, string> = {};
    for (const [key, value] of this.versions.entries()) {
      list[key] = value;
    }
    return list;
  }
}

export const VersionRegistry = new VersionRegistryClass();
