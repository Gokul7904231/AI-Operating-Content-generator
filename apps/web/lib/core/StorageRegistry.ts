import { RuntimeComponent, ComponentHealth, ComponentMetrics } from "./RuntimeComponent";
import fs from "fs";
import path from "path";

export interface StorageAdapter {
  id: string;
  upload(filePath: string, targetKey: string): Promise<string>;
}

class StorageRegistryClass implements RuntimeComponent {
  id = "StorageRegistry";
  version = "1.0.0";

  private adapters = new Map<string, StorageAdapter>();
  private defaultAdapterId = "local";

  constructor() {
    // Register basic local storage adapter
    this.registerAdapter({
      id: "local",
      upload: async (filePath, targetKey) => {
        const dest = path.resolve(process.cwd(), "data", "storage", targetKey);
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.copyFileSync(filePath, dest);
        return `/media/storage/${targetKey}`;
      },
    });
  }

  registerAdapter(adapter: StorageAdapter) {
    console.log(`[StorageRegistry] Registering adapter: ${adapter.id}`);
    this.adapters.set(adapter.id, adapter);
  }

  setDefaultAdapter(id: string) {
    if (this.adapters.has(id)) {
      this.defaultAdapterId = id;
    }
  }

  async upload(filePath: string, targetKey: string, adapterId?: string): Promise<string> {
    const activeId = adapterId || this.defaultAdapterId;
    const adapter = this.adapters.get(activeId);
    if (!adapter) throw new Error(`[StorageRegistry] Storage adapter ${activeId} not found.`);
    return adapter.upload(filePath, targetKey);
  }

  async health(): Promise<ComponentHealth> {
    return {
      status: "healthy",
      lastChecked: new Date().toISOString(),
    };
  }

  async metrics(): Promise<ComponentMetrics> {
    return {
      activeAdapters: Array.from(this.adapters.keys()),
      defaultAdapter: this.defaultAdapterId,
    };
  }

  async shutdown(): Promise<void> {
    this.adapters.clear();
  }
}

export const StorageRegistry = new StorageRegistryClass();
