/**
 * Storage Layer — Type Definitions
 *
 * Provider-agnostic types shared by all storage providers.
 * DO NOT import any provider-specific packages here.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Upload / Download
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadOptions {
  /** Destination filename (without path). Auto-generated if omitted. */
  fileName?: string;
  /** MIME type of the file. Provider will auto-detect if omitted. */
  mimeType?: string;
  /** Arbitrary key-value metadata to attach to the file. */
  metadata?: Record<string, string>;
  /** Sub-folder path relative to the provider root. e.g. "2026/07-11" */
  subFolder?: string;
  /** Engine that produced this file — used for folder organization. */
  engine?: string;
  /** How many hours before auto-delete. 0 = never. */
  deleteAfterHours?: number;
}

export interface UploadResult {
  /** Provider-assigned file identifier. */
  fileId: string;
  /** Human-readable filename. */
  fileName: string;
  /** Direct download / view URL (public or signed). */
  url: string;
  /** Provider view link (e.g. Google Drive viewer URL). */
  viewLink?: string;
  /** Provider download link. */
  downloadLink?: string;
  /** Folder ID or path where the file was placed. */
  folderId?: string;
  /** MIME type. */
  mimeType: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** Provider name. */
  provider: string;
  /** Arbitrary extra metadata. */
  extra?: Record<string, any>;
}

export interface DownloadResult {
  /** Readable stream or Buffer containing the file data. */
  data: NodeJS.ReadableStream | Buffer;
  /** MIME type of the file. */
  mimeType: string;
  /** File size in bytes. */
  sizeBytes: number;
  /** Original filename. */
  fileName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing / Metadata
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageItem {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url?: string;
  viewLink?: string;
  downloadLink?: string;
  folderId?: string;
  folderName?: string;
  metadata?: Record<string, string>;
  provider: string;
}

export interface ListOptions {
  /** Folder to list. Defaults to provider root. */
  folderId?: string;
  /** Maximum items to return. */
  limit?: number;
  /** Filter by MIME type prefix. */
  mimeTypeFilter?: string;
  /** Search query (name contains). */
  query?: string;
  /** Only items older than this timestamp (ms). */
  olderThanMs?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

export type StorageProviderState =
  | "ONLINE"
  | "DEGRADED"
  | "OFFLINE"
  | "AUTH_FAILED"
  | "INITIALIZING";

export interface StorageHealthReport {
  provider: string;
  state: StorageProviderState;
  reachable: boolean;
  credentialsOk: boolean;
  folderExists: boolean;
  uploadPermission: boolean;
  latencyMs: number;
  /** Used bytes. -1 = unknown. */
  usedBytes: number;
  /** Quota bytes. -1 = unlimited/unknown. */
  quotaBytes: number;
  checkedAt: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageTelemetryRecord {
  provider: string;
  operation: "upload" | "download" | "delete" | "list" | "health";
  fileId?: string;
  sizeBytes?: number;
  durationMs: number;
  success: boolean;
  retries: number;
  errorMessage?: string;
  recordedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup
// ─────────────────────────────────────────────────────────────────────────────

export interface CleanupResult {
  deletedCount: number;
  failedCount: number;
  deletedFileIds: string[];
  failedFileIds: string[];
  durationMs: number;
  ranAt: string;
}
