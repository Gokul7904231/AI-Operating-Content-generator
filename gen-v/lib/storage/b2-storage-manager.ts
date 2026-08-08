export type StoragePressureState =
  | "NORMAL"              // < 1.5 GB temp usage
  | "WARNING"             // 1.5 GB - 1.8 GB temp usage
  | "AGGRESSIVE_CLEANUP"  // 1.8 GB - 2.0 GB temp usage
  | "CAPACITY_REACHED";   // >= 2.0 GB temp usage -> WAITING_FOR_STORAGE

export interface B2ObjectMeta {
  key: string; // e.g. "permanent/backgrounds/bg_01.mp4" or "temp-renders/user_123/job_456.mp4"
  prefix: "permanent" | "temp-renders";
  tenantId?: string;
  sizeBytes: number;
  createdAt: string;
  expiresAt?: string; // 30-minute server-authoritative expiration for temp-renders
}

export interface StorageTelemetry {
  bucketName: string;
  permanentAssetSizeBytes: number;
  permanentAssetCount: number;
  tempRenderSizeBytes: number;
  tempRenderCount: number;
  pressureState: StoragePressureState;
  permanentBudgetLimitBytes: number; // 7 GB
  tempBudgetLimitBytes: number; // 2 GB
  retentionWindowMinutes: number; // 30 minutes
}

export class B2StorageManager {
  private static bucketName = process.env.B2_BUCKET_NAME || "factoryos-assets";
  private static permanentLimit = 7 * 1024 * 1024 * 1024; // 7 GB
  private static tempLimit = 2 * 1024 * 1024 * 1024; // 2 GB
  private static retentionMs = 30 * 60 * 1000; // 30 minutes

  private static store = new Map<string, B2ObjectMeta>();

  static savePermanentAsset(key: string, sizeBytes: number): B2ObjectMeta {
    const fullKey = key.startsWith("permanent/") ? key : `permanent/${key}`;
    const obj: B2ObjectMeta = {
      key: fullKey,
      prefix: "permanent",
      sizeBytes,
      createdAt: new Date().toISOString(),
    };
    this.store.set(fullKey, obj);
    return obj;
  }

  static saveTempRender(tenantId: string, jobId: string, sizeBytes: number): B2ObjectMeta {
    const key = `temp-renders/${tenantId}/${jobId}.mp4`;
    const now = Date.now();
    const obj: B2ObjectMeta = {
      key,
      prefix: "temp-renders",
      tenantId,
      sizeBytes,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.retentionMs).toISOString(),
    };

    // Check storage pressure before saving
    const telemetry = this.getTelemetry();
    if (telemetry.pressureState === "CAPACITY_REACHED") {
      this.purgeExpiredTempRenders();
      const updatedTelemetry = this.getTelemetry();
      if (updatedTelemetry.pressureState === "CAPACITY_REACHED") {
        throw new Error("STORAGE_CAPACITY_REACHED: Temporary storage quota (2 GB) exceeded. Render queued until storage is freed.");
      }
    }

    this.store.set(key, obj);
    return obj;
  }

  static getTelemetry(): StorageTelemetry {
    let permanentSizeBytes = 0;
    let permanentCount = 0;
    let tempSizeBytes = 0;
    let tempCount = 0;

    for (const obj of this.store.values()) {
      if (obj.prefix === "permanent") {
        permanentSizeBytes += obj.sizeBytes;
        permanentCount += 1;
      } else if (obj.prefix === "temp-renders") {
        tempSizeBytes += obj.sizeBytes;
        tempCount += 1;
      }
    }

    let pressureState: StoragePressureState = "NORMAL";
    const gb = 1024 * 1024 * 1024;
    if (tempSizeBytes >= 2.0 * gb) {
      pressureState = "CAPACITY_REACHED";
    } else if (tempSizeBytes >= 1.8 * gb) {
      pressureState = "AGGRESSIVE_CLEANUP";
    } else if (tempSizeBytes >= 1.5 * gb) {
      pressureState = "WARNING";
    }

    return {
      bucketName: this.bucketName,
      permanentAssetSizeBytes: permanentSizeBytes,
      permanentAssetCount: permanentCount,
      tempRenderSizeBytes: tempSizeBytes,
      tempRenderCount: tempCount,
      pressureState,
      permanentBudgetLimitBytes: this.permanentLimit,
      tempBudgetLimitBytes: this.tempLimit,
      retentionWindowMinutes: 30,
    };
  }

  static purgeExpiredTempRenders(nowMs: number = Date.now()): number {
    let purgedCount = 0;
    for (const [key, obj] of this.store.entries()) {
      // PERMANENT ASSET SAFETY RULE: Never purge permanent assets!
      if (obj.prefix === "permanent") continue;

      if (obj.expiresAt && new Date(obj.expiresAt).getTime() <= nowMs) {
        this.store.delete(key);
        purgedCount += 1;
      }
    }
    return purgedCount;
  }

  static deleteObject(key: string, tenantId?: string): boolean {
    const obj = this.store.get(key);
    if (!obj) return false;
    // Multi-tenant protection: if tenantId provided, enforce ownership
    if (tenantId && obj.tenantId && obj.tenantId !== tenantId) {
      return false;
    }
    this.store.delete(key);
    return true;
  }

  static getObject(key: string, tenantId?: string): B2ObjectMeta | null {
    const obj = this.store.get(key) || null;
    if (!obj) return null;
    if (tenantId && obj.tenantId && obj.tenantId !== tenantId) {
      return null;
    }
    return obj;
  }

  static clearStoreForTesting() {
    this.store.clear();
  }
}
