/**
 * Storage Layer — Provider Interface
 *
 * Every storage provider (Google Drive, Cloudinary, S3, etc.) must implement
 * this interface. Business logic lives in the Engine Runtime and Upload Agent —
 * not inside providers.
 */

import type {
  UploadOptions,
  UploadResult,
  DownloadResult,
  StorageItem,
  ListOptions,
  StorageHealthReport,
  StorageTelemetryRecord,
  CleanupResult,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// Core Interface
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageProvider {
  /** Unique provider identifier. e.g. "google-drive" | "cloudinary" */
  readonly id: string;

  /** Human-readable display name. */
  readonly name: string;

  /** Provider category. */
  readonly type: "cloud" | "local";

  // ─── Core Operations ───────────────────────────────────────────────────────

  /**
   * Upload a local file (or Buffer) to the provider.
   * Must emit storage.upload.started / completed / failed events via EventBus.
   */
  upload(
    sourcePath: string,
    options?: UploadOptions
  ): Promise<UploadResult>;

  /**
   * Download a file by its provider file ID.
   */
  download(fileId: string): Promise<DownloadResult>;

  /**
   * Delete a file by its provider file ID.
   * Implementation MUST move to trash first (if provider supports it).
   * Must emit storage.delete.completed event.
   */
  delete(fileId: string): Promise<void>;

  /**
   * List files in a folder or the root.
   */
  list(options?: ListOptions): Promise<StorageItem[]>;

  /**
   * Return rich metadata for a single file.
   */
  getMetadata(fileId: string): Promise<StorageItem>;

  // ─── Health ───────────────────────────────────────────────────────────────

  /**
   * Full health check — credentials, folder access, upload permission, quota.
   */
  healthCheck(): Promise<StorageHealthReport>;

  /**
   * Lightweight liveness check. Returns true if provider is reachable.
   */
  health(): Promise<boolean>;

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  /**
   * Delete files older than `olderThanMs` milliseconds.
   * Must emit storage.cleanup.completed event.
   */
  cleanup(olderThanMs: number): Promise<CleanupResult>;

  // ─── Capability Flags ─────────────────────────────────────────────────────

  /** Provider supports signed/pre-authenticated download URLs. */
  supportsSignedUrls(): boolean;

  /** Provider supports streaming large files. */
  supportsStreaming(): boolean;

  /** Provider natively supports TTL / auto-delete. */
  supportsAutoDelete(): boolean;

  // ─── Telemetry ────────────────────────────────────────────────────────────

  /**
   * Returns recent telemetry records for this provider.
   */
  getTelemetry(limit?: number): StorageTelemetryRecord[];
}
