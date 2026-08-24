/**
 * Google Drive Storage Provider
 *
 * Authenticates using Google Service Account credentials.
 * Falls back to OAuth2 refresh token if service account JSON is not present.
 *
 * Auth resolution order:
 *  1. GOOGLE_APPLICATION_CREDENTIALS (service account JSON path) — preferred
 *  2. GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET + GOOGLE_DRIVE_REFRESH_TOKEN
 *
 * Folder structure created automatically:
 *   ShortFactory/
 *     {year}/
 *       {MM-DD}/
 *         {engine}/
 *           video.mp4
 *
 * Provider is translation-only. Retries, telemetry and event emission
 * are handled by the Upload Agent and Engine Runtime.
 */

import fs from "fs";
import path from "path";
import { google, drive_v3 } from "googleapis";
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
  StorageProviderState,
} from "../types";
import { EventBus } from "../../ai/event-bus";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
const DEFAULT_ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID ?? process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "";

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export class GoogleDriveStorageProvider implements StorageProvider {
  readonly id = "google-drive";
  readonly name = "Google Drive";
  readonly type = "cloud" as const;

  private drive: drive_v3.Drive | null = null;
  private folderCache = new Map<string, string>(); // path → folderId
  private telemetryLog: StorageTelemetryRecord[] = [];
  private state: StorageProviderState = "INITIALIZING";
  private initError: string | null = null;

  constructor() {
    this.initDriveClient();
  }

  // ─── Auth & Init ───────────────────────────────────────────────────────────

  private initDriveClient(): void {
    try {
      const auth = this.buildAuth();
      this.drive = google.drive({ version: "v3", auth });
      this.state = "ONLINE";
      console.log("[GoogleDrive] Drive client initialized successfully.");
    } catch (err: any) {
      this.state = "AUTH_FAILED";
      this.initError = err.message;
      console.error("[GoogleDrive] Failed to initialize Drive client:", err.message);
    }
  }

  /**
   * Hot-reload Drive client with a new service account key file.
   * Called by KeyRotation.rotateTo() — no restart needed.
   */
  reinitializeWithKeyFile(keyFilePath: string): void {
    console.log(`[GoogleDrive] Reinitializing with new key: ${keyFilePath}`);
    try {
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ["https://www.googleapis.com/auth/drive"],
      });
      this.drive = google.drive({ version: "v3", auth });
      this.folderCache.clear();
      this.state = "ONLINE";
      this.initError = null;
      console.log("[GoogleDrive] Key rotation complete — Drive client reinitialized.");
    } catch (err: any) {
      console.error("[GoogleDrive] Key rotation failed:", err.message);
      throw err;
    }
  }

  private buildAuth() {
    // ── Strategy 1: Service Account JSON file ────────────────────────────────
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credPath) {
      const resolved = path.resolve(process.cwd(), credPath);
      if (fs.existsSync(resolved)) {
        console.log(`[GoogleDrive] Using service account: ${resolved}`);
        return new google.auth.GoogleAuth({
          keyFile: resolved,
          scopes: ["https://www.googleapis.com/auth/drive"],
        });
      } else {
        console.warn(
          `[GoogleDrive] GOOGLE_APPLICATION_CREDENTIALS points to "${resolved}" but file does not exist.`
        );
      }
    }

    // ── Strategy 2: OAuth2 refresh token ────────────────────────────────────
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      console.log("[GoogleDrive] Using OAuth2 refresh token authentication.");
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      return oauth2Client;
    }

    throw new Error(
      "[GoogleDrive] No valid credentials found. " +
        "Set GOOGLE_APPLICATION_CREDENTIALS (service account) or " +
        "GOOGLE_DRIVE_CLIENT_ID + GOOGLE_DRIVE_CLIENT_SECRET + GOOGLE_DRIVE_REFRESH_TOKEN."
    );
  }

  private getDrive(): drive_v3.Drive {
    if (!this.drive) {
      this.initDriveClient();
    }
    if (!this.drive) {
      throw new Error(
        `[GoogleDrive] Drive client not initialized. Auth error: ${this.initError}`
      );
    }
    return this.drive;
  }

  // ─── Folder Management ─────────────────────────────────────────────────────

  /**
   * Returns (or creates) a folder at the given path under the configured root.
   * e.g. "2026/07-11/quiz" → creates three nested folders, returns leaf ID.
   * Results are cached in memory for the lifetime of the process.
   */
  async ensureFolderPath(subPath: string): Promise<string> {
    const cacheKey = subPath;
    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey)!;
    }

    const rootId =
      process.env.GOOGLE_DRIVE_FOLDER_ID ||
      process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ||
      DEFAULT_ROOT_FOLDER_ID;
    if (!rootId) {
      throw new Error(
        "[GoogleDrive] GOOGLE_DRIVE_FOLDER_ID is not set. Cannot create folder path."
      );
    }

    const parts = subPath.split("/").filter(Boolean);
    let currentParentId = rootId;

    for (const part of parts) {
      currentParentId = await this.findOrCreateFolder(part, currentParentId);
    }

    this.folderCache.set(cacheKey, currentParentId);
    return currentParentId;
  }

  private async findOrCreateFolder(
    name: string,
    parentId: string
  ): Promise<string> {
    const drive = this.getDrive();

    // Search for existing folder
    const res = await drive.files.list({
      q: `name='${name}' and mimeType='${DRIVE_FOLDER_MIME}' and '${parentId}' in parents and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    const existing = res.data.files?.[0];
    if (existing?.id) {
      return existing.id;
    }

    // Create new folder
    const created = await drive.files.create({
      requestBody: {
        name,
        mimeType: DRIVE_FOLDER_MIME,
        parents: [parentId],
      },
      fields: "id",
    });

    const newId = created.data.id!;
    console.log(`[GoogleDrive] Created folder: "${name}" (${newId}) under ${parentId}`);
    return newId;
  }

  private buildDateSubPath(engine?: string): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const parts = [year, `${month}-${day}`];
    if (engine) parts.push(engine);
    return parts.join("/");
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  async upload(
    sourcePath: string,
    options: UploadOptions & {
      refreshToken?: string;
      clientId?: string;
      clientSecret?: string;
      folderId?: string;
    } = {}
  ): Promise<UploadResult> {
    const start = Date.now();
    const traceId = `drive_up_${Date.now()}`;
    
    let drive = this.getDrive();
    if (options.refreshToken && options.clientId && options.clientSecret) {
      const oauth2Client = new google.auth.OAuth2(options.clientId, options.clientSecret);
      oauth2Client.setCredentials({ refresh_token: options.refreshToken });
      drive = google.drive({ version: "v3", auth: oauth2Client });
    }

    const fileName =
      options.fileName ?? path.basename(sourcePath);
    const mimeType =
      options.mimeType ?? this.detectMimeType(fileName);

    EventBus.publish(
      "storage.upload.started",
      { provider: this.id, fileName, sourcePath },
      traceId
    );

    try {
      // Resolve destination folder
      let folderId = options.folderId;
      const subPath = options.subFolder ?? this.buildDateSubPath(options.engine);
      if (!folderId) {
        folderId = await this.ensureFolderPath(subPath);
      }

      const stat = fs.statSync(sourcePath);
      const fileStream = fs.createReadStream(sourcePath);

      const res = await drive.files.create({
        requestBody: {
          name: fileName,
          parents: [folderId],
        },
        media: {
          mimeType,
          body: fileStream,
        },
        fields: "id, name, mimeType, size, createdTime, webViewLink, webContentLink",
      });

      const file = res.data;

      // Make file readable (anyone with link can view/download)
      await this.setFilePermission(file.id!);

      const result: UploadResult = {
        fileId: file.id!,
        fileName: file.name ?? fileName,
        url: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
        viewLink: file.webViewLink ?? undefined,
        downloadLink:
          file.webContentLink ??
          `https://drive.google.com/uc?export=download&id=${file.id}`,
        folderId,
        mimeType: file.mimeType ?? mimeType,
        sizeBytes: stat.size,
        createdAt: file.createdTime ?? new Date().toISOString(),
        provider: this.id,
        extra: { subPath, engine: options.engine },
      };

      const durationMs = Date.now() - start;
      EventBus.publish(
        "storage.upload.completed",
        { provider: this.id, fileId: file.id, fileName, durationMs, sizeBytes: stat.size },
        traceId
      );

      this.recordTelemetry({
        provider: this.id,
        operation: "upload",
        fileId: file.id!,
        sizeBytes: stat.size,
        durationMs,
        success: true,
        retries: 0,
        recordedAt: new Date().toISOString(),
      });

      console.log(
        `[GoogleDrive] Uploaded "${fileName}" → ${file.id} in ${durationMs}ms`
      );
      return result;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      EventBus.publish(
        "storage.upload.failed",
        { provider: this.id, fileName, error: err.message },
        traceId
      );
      this.recordTelemetry({
        provider: this.id,
        operation: "upload",
        sizeBytes: 0,
        durationMs,
        success: false,
        retries: 0,
        errorMessage: err.message,
        recordedAt: new Date().toISOString(),
      });
      console.error(`[GoogleDrive] Upload failed for "${fileName}":`, err.message);
      throw err;
    }
  }

  private async setFilePermission(fileId: string): Promise<void> {
    try {
      await this.getDrive().permissions.create({
        fileId,
        requestBody: { role: "reader", type: "anyone" },
      });
    } catch (err: any) {
      // Non-fatal — file still uploaded, just not publicly accessible
      console.warn(
        `[GoogleDrive] Could not set public permission on ${fileId}: ${err.message}`
      );
    }
  }

  // ─── Download ──────────────────────────────────────────────────────────────

  async download(fileId: string): Promise<DownloadResult> {
    const start = Date.now();
    const drive = this.getDrive();

    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size",
    });

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "stream" }
    ) as any;

    const durationMs = Date.now() - start;
    this.recordTelemetry({
      provider: this.id,
      operation: "download",
      fileId,
      durationMs,
      success: true,
      retries: 0,
      recordedAt: new Date().toISOString(),
    });

    return {
      data: res.data as NodeJS.ReadableStream,
      mimeType: meta.data.mimeType ?? "application/octet-stream",
      sizeBytes: Number(meta.data.size ?? 0),
      fileName: meta.data.name ?? fileId,
    };
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async delete(fileId: string): Promise<void> {
    const start = Date.now();
    const traceId = `drive_del_${Date.now()}`;
    const drive = this.getDrive();

    try {
      // Move to trash — never permanent delete
      await drive.files.update({
        fileId,
        requestBody: { trashed: true },
      });

      const durationMs = Date.now() - start;
      EventBus.publish(
        "storage.delete.completed",
        { provider: this.id, fileId, durationMs },
        traceId
      );
      this.recordTelemetry({
        provider: this.id,
        operation: "delete",
        fileId,
        durationMs,
        success: true,
        retries: 0,
        recordedAt: new Date().toISOString(),
      });
      console.log(`[GoogleDrive] Trashed file: ${fileId}`);
    } catch (err: any) {
      console.error(`[GoogleDrive] Delete failed for ${fileId}:`, err.message);
      throw err;
    }
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  async list(options: ListOptions = {}): Promise<StorageItem[]> {
    const start = Date.now();
    const drive = this.getDrive();

    const folderId = options.folderId ?? DEFAULT_ROOT_FOLDER_ID;
    if (!folderId) {
      console.warn("[GoogleDrive] list() called without folderId and GOOGLE_DRIVE_FOLDER_ID is not set.");
      return [];
    }

    let q = `'${folderId}' in parents and trashed=false`;
    if (options.mimeTypeFilter) {
      q += ` and mimeType contains '${options.mimeTypeFilter}'`;
    }
    if (options.query) {
      q += ` and name contains '${options.query}'`;
    }

    const res = await drive.files.list({
      q,
      fields:
        "files(id, name, mimeType, size, createdTime, webViewLink, webContentLink, parents)",
      pageSize: options.limit ?? 50,
      orderBy: "createdTime desc",
    });

    const files = res.data.files ?? [];
    const durationMs = Date.now() - start;

    this.recordTelemetry({
      provider: this.id,
      operation: "list",
      durationMs,
      success: true,
      retries: 0,
      recordedAt: new Date().toISOString(),
    });

    return files.map((f) => ({
      fileId: f.id!,
      fileName: f.name ?? "",
      mimeType: f.mimeType ?? "",
      sizeBytes: Number(f.size ?? 0),
      createdAt: f.createdTime ?? "",
      url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
      viewLink: f.webViewLink ?? undefined,
      downloadLink:
        f.webContentLink ??
        `https://drive.google.com/uc?export=download&id=${f.id}`,
      folderId: f.parents?.[0],
      provider: this.id,
    }));
  }

  // ─── Metadata ──────────────────────────────────────────────────────────────

  async getMetadata(fileId: string): Promise<StorageItem> {
    const drive = this.getDrive();
    const res = await drive.files.get({
      fileId,
      fields:
        "id, name, mimeType, size, createdTime, webViewLink, webContentLink, parents",
    });
    const f = res.data;
    return {
      fileId: f.id!,
      fileName: f.name ?? "",
      mimeType: f.mimeType ?? "",
      sizeBytes: Number(f.size ?? 0),
      createdAt: f.createdTime ?? "",
      url: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
      viewLink: f.webViewLink ?? undefined,
      downloadLink:
        f.webContentLink ??
        `https://drive.google.com/uc?export=download&id=${f.id}`,
      folderId: f.parents?.[0],
      provider: this.id,
    };
  }

  // ─── Health ────────────────────────────────────────────────────────────────

  async health(): Promise<boolean> {
    try {
      const report = await this.healthCheck();
      return report.reachable && report.credentialsOk;
    } catch {
      return false;
    }
  }

  async healthCheck(): Promise<StorageHealthReport> {
    const start = Date.now();
    const report: StorageHealthReport = {
      provider: this.id,
      state: this.state,
      reachable: false,
      credentialsOk: false,
      folderExists: false,
      uploadPermission: false,
      latencyMs: 0,
      usedBytes: -1,
      quotaBytes: -1,
      checkedAt: new Date().toISOString(),
    };

    if (!this.drive) {
      report.error = this.initError ?? "Drive client not initialized";
      return report;
    }

    try {
      // Check about (credentials + quota)
      const aboutRes = await this.getDrive().about.get({
        fields: "storageQuota",
      });
      report.credentialsOk = true;
      report.reachable = true;

      const quota = aboutRes.data.storageQuota;
      if (quota) {
        report.usedBytes = Number(quota.usage ?? -1);
        report.quotaBytes = Number(quota.limit ?? -1);
      }

      // Check root folder exists
      const rootId = DEFAULT_ROOT_FOLDER_ID;
      if (rootId) {
        try {
          await this.getDrive().files.get({ fileId: rootId, fields: "id" });
          report.folderExists = true;
          report.uploadPermission = true;
        } catch {
          report.error = `Root folder ${rootId} not accessible`;
        }
      } else {
        report.error = "GOOGLE_DRIVE_FOLDER_ID not set";
      }

      report.state = "ONLINE";
    } catch (err: any) {
      report.state = "AUTH_FAILED";
      report.error = err.message;
    }

    report.latencyMs = Date.now() - start;

    this.recordTelemetry({
      provider: this.id,
      operation: "health",
      durationMs: report.latencyMs,
      success: report.reachable,
      retries: 0,
      recordedAt: report.checkedAt,
    });

    return report;
  }

  // ─── Cleanup ───────────────────────────────────────────────────────────────

  async cleanup(olderThanMs: number): Promise<CleanupResult> {
    const start = Date.now();
    const traceId = `drive_cleanup_${Date.now()}`;
    const cutoff = new Date(Date.now() - olderThanMs).toISOString();
    const drive = this.getDrive();

    EventBus.publish(
      "storage.cleanup.started",
      { provider: this.id, cutoff, olderThanMs },
      traceId
    );

    const rootId = DEFAULT_ROOT_FOLDER_ID;
    const result: CleanupResult = {
      deletedCount: 0,
      failedCount: 0,
      deletedFileIds: [],
      failedFileIds: [],
      durationMs: 0,
      ranAt: new Date().toISOString(),
    };

    try {
      // List only video files older than cutoff under root
      let q = `mimeType contains 'video/' and trashed=false and createdTime < '${cutoff}'`;
      if (rootId) {
        // Recursive search under root (Drive doesn't support recursive natively)
        // We use a broad search and rely on the createdTime filter
        q = `mimeType contains 'video/' and trashed=false and createdTime < '${cutoff}'`;
      }

      const res = await drive.files.list({
        q,
        fields: "files(id, name, createdTime)",
        pageSize: 200,
      });

      const files = res.data.files ?? [];
      console.log(
        `[GoogleDrive] Cleanup: found ${files.length} files older than ${olderThanMs}ms`
      );

      for (const file of files) {
        try {
          await this.delete(file.id!);
          result.deletedCount++;
          result.deletedFileIds.push(file.id!);
          console.log(
            `[GoogleDrive] Cleanup: trashed "${file.name}" (${file.id})`
          );
        } catch (err: any) {
          result.failedCount++;
          result.failedFileIds.push(file.id!);
          console.error(
            `[GoogleDrive] Cleanup: failed to trash "${file.name}": ${err.message}`
          );
        }
      }
    } catch (err: any) {
      console.error("[GoogleDrive] Cleanup list failed:", err.message);
    }

    result.durationMs = Date.now() - start;

    EventBus.publish(
      "storage.cleanup.completed",
      { provider: this.id, ...result },
      traceId
    );

    return result;
  }

  // ─── Capability Flags ──────────────────────────────────────────────────────

  supportsSignedUrls(): boolean { return false; }
  supportsStreaming(): boolean { return true; }
  supportsAutoDelete(): boolean { return false; }

  // ─── Telemetry ─────────────────────────────────────────────────────────────

  private recordTelemetry(record: StorageTelemetryRecord): void {
    this.telemetryLog.push(record);
    if (this.telemetryLog.length > 500) {
      this.telemetryLog = this.telemetryLog.slice(-500);
    }
  }

  getTelemetry(limit = 50): StorageTelemetryRecord[] {
    return this.telemetryLog.slice(-limit);
  }

  // ─── Utility ───────────────────────────────────────────────────────────────

  private detectMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const map: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".json": "application/json",
      ".txt": "text/plain",
      ".pdf": "application/pdf",
    };
    return map[ext] ?? "application/octet-stream";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton export
// ─────────────────────────────────────────────────────────────────────────────

export const GoogleDriveProvider = new GoogleDriveStorageProvider();
