/**
 * Cloudinary Storage Provider Adapter
 *
 * Wraps the existing Cloudinary library. Does NOT duplicate upload logic.
 * The existing /api/cloudinary-upload route remains untouched.
 * This adapter exposes Cloudinary through the StorageProvider interface
 * for use by the StorageRegistry — other systems query storage uniformly.
 */

import { v2 as cloudinary } from "cloudinary";
import type { StorageProvider } from "../storage-provider";
import type {
  UploadOptions,
  UploadResult,
  DownloadResult,
  StorageItem,
  ListOptions,
  StorageHealthReport,
  StorageTelemetryRecord,
  CleanupResult,
} from "../types";
import { EventBus } from "../../ai/event-bus";

// Configure once — safe to call multiple times (idempotent)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class CloudinaryStorageProvider implements StorageProvider {
  readonly id = "cloudinary";
  readonly name = "Cloudinary";
  readonly type = "cloud" as const;

  private telemetryLog: StorageTelemetryRecord[] = [];

  // ─── Upload ────────────────────────────────────────────────────────────────

  async upload(sourcePath: string, options: UploadOptions = {}): Promise<UploadResult> {
    const start = Date.now();
    const traceId = `cld_up_${Date.now()}`;

    EventBus.publish("storage.upload.started", { provider: this.id, sourcePath }, traceId);

    try {
      const folder = options.subFolder ?? "ai_shorts";
      const res = await cloudinary.uploader.upload(sourcePath, {
        resource_type: "video",
        folder,
        public_id: options.fileName?.replace(/\.[^.]+$/, "") ?? undefined,
        overwrite: true,
      });

      const durationMs = Date.now() - start;
      EventBus.publish(
        "storage.upload.completed",
        { provider: this.id, fileId: res.public_id, durationMs },
        traceId
      );
      this.recordTelemetry({ provider: this.id, operation: "upload", fileId: res.public_id, sizeBytes: res.bytes, durationMs, success: true, retries: 0, recordedAt: new Date().toISOString() });

      return {
        fileId: res.public_id,
        fileName: options.fileName ?? res.original_filename,
        url: res.secure_url,
        viewLink: res.secure_url,
        downloadLink: res.secure_url,
        folderId: folder,
        mimeType: `video/${res.format}`,
        sizeBytes: res.bytes,
        createdAt: res.created_at,
        provider: this.id,
      };
    } catch (err: any) {
      EventBus.publish("storage.upload.failed", { provider: this.id, error: err.message }, traceId);
      this.recordTelemetry({ provider: this.id, operation: "upload", durationMs: Date.now() - start, success: false, retries: 0, errorMessage: err.message, recordedAt: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Download ──────────────────────────────────────────────────────────────

  async download(_fileId: string): Promise<DownloadResult> {
    throw new Error("Cloudinary: direct download not supported. Use the secure_url to stream.");
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async delete(fileId: string): Promise<void> {
    const start = Date.now();
    const traceId = `cld_del_${Date.now()}`;
    await cloudinary.uploader.destroy(fileId, { resource_type: "video" });
    const durationMs = Date.now() - start;
    EventBus.publish("storage.delete.completed", { provider: this.id, fileId, durationMs }, traceId);
    this.recordTelemetry({ provider: this.id, operation: "delete", fileId, durationMs, success: true, retries: 0, recordedAt: new Date().toISOString() });
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async list(options: ListOptions = {}): Promise<StorageItem[]> {
    const folder = options.folderId ?? "ai_shorts";
    const result = await cloudinary.api.resources({
      resource_type: "video",
      type: "upload",
      prefix: folder,
      max_results: options.limit ?? 50,
    });

    return (result.resources ?? []).map((r: any) => ({
      fileId: r.public_id,
      fileName: r.filename ?? r.public_id,
      mimeType: `video/${r.format}`,
      sizeBytes: r.bytes ?? 0,
      createdAt: r.created_at ?? "",
      url: r.secure_url,
      viewLink: r.secure_url,
      downloadLink: r.secure_url,
      folderId: folder,
      provider: this.id,
    }));
  }

  // ─── Metadata ──────────────────────────────────────────────────────────────

  async getMetadata(fileId: string): Promise<StorageItem> {
    const res = await cloudinary.api.resource(fileId, { resource_type: "video" });
    return {
      fileId: res.public_id,
      fileName: res.filename ?? fileId,
      mimeType: `video/${res.format}`,
      sizeBytes: res.bytes ?? 0,
      createdAt: res.created_at ?? "",
      url: res.secure_url,
      viewLink: res.secure_url,
      downloadLink: res.secure_url,
      provider: this.id,
    };
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  async health(): Promise<boolean> {
    try {
      await cloudinary.api.ping();
      return true;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<StorageHealthReport> {
    const start = Date.now();
    let reachable = false;
    let error: string | undefined;

    try {
      await cloudinary.api.ping();
      reachable = true;
    } catch (err: any) {
      error = err.message;
    }

    return {
      provider: this.id,
      state: reachable ? "ONLINE" : "OFFLINE",
      reachable,
      credentialsOk: reachable,
      folderExists: reachable,
      uploadPermission: reachable,
      latencyMs: Date.now() - start,
      usedBytes: -1,
      quotaBytes: -1,
      checkedAt: new Date().toISOString(),
      error,
    };
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  async cleanup(olderThanMs: number): Promise<CleanupResult> {
    // Cloudinary does not support time-based filtering via SDK natively.
    // Return empty result — cleanup is handled externally for Cloudinary.
    return {
      deletedCount: 0,
      failedCount: 0,
      deletedFileIds: [],
      failedFileIds: [],
      durationMs: 0,
      ranAt: new Date().toISOString(),
    };
  }

  // ─── Flags ─────────────────────────────────────────────────────────────────

  supportsSignedUrls(): boolean { return true; }
  supportsStreaming(): boolean { return true; }
  supportsAutoDelete(): boolean { return false; }

  // ─── Telemetry ─────────────────────────────────────────────────────────────

  private recordTelemetry(record: StorageTelemetryRecord): void {
    this.telemetryLog.push(record);
    if (this.telemetryLog.length > 200) this.telemetryLog = this.telemetryLog.slice(-200);
  }

  getTelemetry(limit = 50): StorageTelemetryRecord[] {
    return this.telemetryLog.slice(-limit);
  }
}

export const CloudinaryProvider = new CloudinaryStorageProvider();
