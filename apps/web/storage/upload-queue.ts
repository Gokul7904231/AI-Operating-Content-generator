/**
 * Storage Queue — Async Upload Worker (v2 — Persistent)
 *
 * Decouples rendering from storage. The Engine Runtime emits "render.completed"
 * and immediately returns. This queue picks it up and uploads asynchronously.
 *
 * V2 Improvements:
 *   ✅ SQLite persistence — survives server restarts, crashes, Vercel cold starts
 *   ✅ Idempotency — jobId + SHA-256 + provider deduplicate uploads
 *   ✅ Startup restore — pending/retrying jobs resume automatically
 *   ✅ Metrics — every outcome recorded to queue_metrics table
 *   ✅ "processing" → "retrying" on restart (was mid-flight when crashed)
 */

import crypto from "crypto";
import { EventBus } from "../ai/event-bus";
import { StorageRegistry } from "./storage-registry";
import { db } from "../lib/firebase-admin";
import { computeFileHash } from "./file-hasher";
import { UploadJobDB, MetricsDB, type UploadJobRow } from "../lib/queue-db";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type UploadJobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "retrying"
  | "dead";

export interface UploadQueueJob {
  id: string;
  jobId: string;
  videoPath: string;
  engine?: string;
  deleteAfterHours: number;
  assets?: AssetItem[];
  versions: VersionMetadata;
  status: UploadJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  nextRetryAt?: number;
  lastError?: string;
  result?: UploadJobResult;
  sha256?: string;
  md5?: string;
}

export interface AssetItem {
  path: string;
  role: "thumbnail" | "metadata" | "script" | "other";
  mimeType?: string;
}

export interface VersionMetadata {
  rendererVersion: string;
  engineVersion: string;
  workflowVersion: string;
  providerVersion: string;
}

export interface UploadJobResult {
  driveFileId: string;
  driveUrl: string;
  downloadLink: string;
  driveFolderId?: string;
  uploadedAt: string;
  provider: string;
  sha256?: string;
  md5?: string;
  assetFileIds?: Record<string, string>;
}

// Retry delays: 1m → 5m → 30m → dead
const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — convert between SQLite row ↔ in-memory job
// ─────────────────────────────────────────────────────────────────────────────

function rowToJob(row: UploadJobRow): UploadQueueJob {
  return {
    id: row.id,
    jobId: row.job_id,
    videoPath: row.video_path,
    engine: row.engine ?? undefined,
    deleteAfterHours: row.delete_after_h,
    assets: row.assets_json ? JSON.parse(row.assets_json) : undefined,
    versions: row.versions_json
      ? JSON.parse(row.versions_json)
      : { rendererVersion: "unknown", engineVersion: "1.0", workflowVersion: "1.0", providerVersion: "1.0" },
    status: row.status as UploadJobStatus,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    createdAt: row.created_at,
    nextRetryAt: row.next_retry_at ?? undefined,
    lastError: row.last_error ?? undefined,
    result: row.result_json ? JSON.parse(row.result_json) : undefined,
    sha256: row.sha256 ?? undefined,
    md5: row.md5 ?? undefined,
  };
}

function jobToRow(job: UploadQueueJob): UploadJobRow {
  return {
    id: job.id,
    job_id: job.jobId,
    video_path: job.videoPath,
    engine: job.engine ?? null,
    delete_after_h: job.deleteAfterHours,
    assets_json: job.assets ? JSON.stringify(job.assets) : null,
    versions_json: JSON.stringify(job.versions),
    status: job.status,
    attempts: job.attempts,
    max_attempts: job.maxAttempts,
    created_at: job.createdAt,
    next_retry_at: job.nextRetryAt ?? null,
    last_error: job.lastError ?? null,
    result_json: job.result ? JSON.stringify(job.result) : null,
    sha256: job.sha256 ?? null,
    md5: job.md5 ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Storage Queue
// ─────────────────────────────────────────────────────────────────────────────

class StorageQueueClass {
  private queue: UploadQueueJob[] = [];
  private deadLetterQueue: UploadQueueJob[] = [];
  private processing = new Set<string>();
  private concurrency = Number(process.env.STORAGE_QUEUE_CONCURRENCY ?? 2);
  private tickInterval: NodeJS.Timeout | null = null;
  private running = false;
  private restored = false;

  constructor() {
    this.restoreFromDB();
    this.start();
    this.subscribeToRenderEvents();
  }

  // ─── Startup Restore ───────────────────────────────────────────────────────

  /**
   * On startup: load all non-completed jobs from SQLite.
   * Any job that was "processing" when the process died is reset to "retrying"
   * (it may have partially uploaded — idempotency check handles dedup).
   */
  private restoreFromDB(): void {
    try {
      const activeRows = UploadJobDB.loadActive();
      for (const row of activeRows) {
        const job = rowToJob(row);
        // "processing" at crash time → retrying on restart
        if (job.status === "processing") {
          job.status = "retrying";
          job.nextRetryAt = Date.now() + RETRY_DELAYS_MS[0]; // retry in 1 min
          UploadJobDB.updateStatus(job.id, "retrying", {
            next_retry_at: job.nextRetryAt,
          });
        }
        this.queue.push(job);
      }

      const deadRows = UploadJobDB.loadDead();
      for (const row of deadRows) {
        this.deadLetterQueue.push(rowToJob(row));
      }

      this.restored = true;
      console.log(
        `[StorageQueue] Restored ${this.queue.length} active + ${this.deadLetterQueue.length} dead jobs from SQLite`
      );
    } catch (err: any) {
      console.warn(`[StorageQueue] Could not restore from SQLite (non-fatal): ${err.message}`);
      this.restored = true;
    }
  }

  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  start(): void {
    if (this.running) return;
    this.running = true;
    this.tickInterval = setInterval(() => this.tick(), 5_000);
    console.log("[StorageQueue] Started — concurrency:", this.concurrency);
    // Immediate tick to process any restored jobs
    setImmediate(() => this.tick());
  }

  stop(): void {
    this.running = false;
    if (this.tickInterval) clearInterval(this.tickInterval);
    console.log("[StorageQueue] Stopped.");
  }

  // ─── EventBus Subscription ─────────────────────────────────────────────────

  private subscribeToRenderEvents(): void {
    EventBus.subscribe<{
      jobId: string;
      videoPath: string;
      engine?: string;
      assets?: AssetItem[];
      versions?: Partial<VersionMetadata>;
    }>("render.completed", async (event) => {
      const { jobId, videoPath, engine, assets, versions } = event.payload;
      if (!jobId || !videoPath) return;
      this.enqueue({ jobId, videoPath, engine, assets, versions: versions as any });
    });
  }

  // ─── Enqueue (with idempotency guard) ────────────────────────────────────

  enqueue(input: {
    jobId: string;
    videoPath: string;
    engine?: string;
    assets?: AssetItem[];
    versions?: Partial<VersionMetadata>;
    deleteAfterHours?: number;
  }): UploadQueueJob {
    const deleteAfterHours =
      input.deleteAfterHours ??
      this.resolveRetentionHours(input.engine) ??
      Number(process.env.GOOGLE_DRIVE_DELETE_AFTER_HOURS ?? 72);

    // ── Idempotency: don't re-enqueue if already in the active queue ──────────
    const alreadyQueued = this.queue.find((j) => j.jobId === input.jobId);
    if (alreadyQueued) {
      console.log(
        `[StorageQueue] Job ${input.jobId} already queued (${alreadyQueued.id}) — skipping duplicate`
      );
      return alreadyQueued;
    }

    const job: UploadQueueJob = {
      id: `uq_${crypto.randomBytes(6).toString("hex")}`,
      jobId: input.jobId,
      videoPath: input.videoPath,
      engine: input.engine,
      deleteAfterHours,
      assets: input.assets,
      versions: {
        rendererVersion: input.versions?.rendererVersion ?? process.env.RENDERER_VERSION ?? "unknown",
        engineVersion: input.versions?.engineVersion ?? "1.0",
        workflowVersion: input.versions?.workflowVersion ?? "1.0",
        providerVersion: input.versions?.providerVersion ?? "1.0",
      },
      status: "pending",
      attempts: 0,
      maxAttempts: RETRY_DELAYS_MS.length + 1,
      createdAt: Date.now(),
    };

    // Persist to SQLite immediately
    try {
      UploadJobDB.upsert(jobToRow(job));
    } catch (err: any) {
      console.warn(`[StorageQueue] SQLite persist failed (non-fatal): ${err.message}`);
    }

    this.queue.push(job);
    console.log(
      `[StorageQueue] Enqueued job ${job.id} for render job ${input.jobId} | engine: ${input.engine ?? "unknown"}`
    );

    EventBus.publish(
      "storage.queue.enqueued",
      { queueJobId: job.id, jobId: input.jobId, engine: input.engine },
      job.id
    );

    setImmediate(() => this.tick());
    return job;
  }

  // ─── Per-engine retention policy ───────────────────────────────────────────

  private resolveRetentionHours(engine?: string): number | null {
    if (!engine) return null;
    const policies: Record<string, number> = {
      quiz:       Number(process.env.RETENTION_QUIZ       ?? 48),
      news:       Number(process.env.RETENTION_NEWS       ?? 24),
      story:      Number(process.env.RETENTION_STORY      ?? 168),
      history:    Number(process.env.RETENTION_HISTORY    ?? 72),
      coding:     Number(process.env.RETENTION_CODING     ?? 72),
      motivation: Number(process.env.RETENTION_MOTIVATION ?? 72),
      reddit:     Number(process.env.RETENTION_REDDIT     ?? 48),
      facts:      Number(process.env.RETENTION_FACTS      ?? 72),
      premium:    0,
    };
    return policies[engine.toLowerCase()] ?? null;
  }

  // ─── Worker Tick ───────────────────────────────────────────────────────────

  private async tick(): Promise<void> {
    if (!this.running) return;
    const now = Date.now();
    const available = this.concurrency - this.processing.size;
    if (available <= 0) return;

    const ready = this.queue
      .filter(
        (j) =>
          (j.status === "pending" ||
            (j.status === "retrying" && (j.nextRetryAt ?? 0) <= now)) &&
          !this.processing.has(j.id)
      )
      .slice(0, available);

    for (const job of ready) {
      this.processJob(job).catch((err) => {
        console.error(`[StorageQueue] Unhandled error in processJob(${job.id}):`, err);
      });
    }
  }

  // ─── Process a Single Job ──────────────────────────────────────────────────

  private async processJob(job: UploadQueueJob): Promise<void> {
    this.processing.add(job.id);
    job.status = "processing";
    job.attempts++;
    const startMs = Date.now();

    UploadJobDB.updateStatus(job.id, "processing", { attempts: job.attempts });

    console.log(
      `[StorageQueue] Processing job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`
    );

    EventBus.publish(
      "storage.upload.started",
      { queueJobId: job.id, jobId: job.jobId, attempt: job.attempts },
      job.id
    );

    try {
      const provider = StorageRegistry.getPrimary();

      // ── Hash the file ──────────────────────────────────────────────────────
      let sha256: string | undefined;
      let md5: string | undefined;
      try {
        const hashes = await computeFileHash(job.videoPath);
        sha256 = hashes.sha256;
        md5 = hashes.md5;
        job.sha256 = sha256;
        job.md5 = md5;
      } catch (hashErr: any) {
        console.warn(`[StorageQueue] Hash failed (non-fatal): ${hashErr.message}`);
      }

      // ── Idempotency: check if already successfully uploaded ────────────────
      const existingUpload = UploadJobDB.findCompleted(job.jobId, sha256);
      if (existingUpload) {
        const existingResult = existingUpload.result_json
          ? JSON.parse(existingUpload.result_json)
          : null;
        console.log(
          `[StorageQueue] Idempotency: job ${job.jobId} already uploaded (sha256 match). Skipping.`
        );
        job.result = existingResult;
        job.status = "completed";
        this.queue = this.queue.filter((j) => j.id !== job.id);
        UploadJobDB.updateStatus(job.id, "completed");
        MetricsDB.record("success", "storage", 1, { engine: job.engine ?? "unknown", reason: "idempotent_skip" });
        return;
      }

      // ── Upload primary video ───────────────────────────────────────────────
      const uploadResult = await provider.upload(job.videoPath, {
        engine: job.engine,
        deleteAfterHours: job.deleteAfterHours,
        metadata: {
          jobId: job.jobId,
          sha256: sha256 ?? "",
          md5: md5 ?? "",
          ...job.versions,
        },
      });

      // ── Upload companion assets ────────────────────────────────────────────
      const assetFileIds: Record<string, string> = {};
      if (job.assets && job.assets.length > 0) {
        for (const asset of job.assets) {
          try {
            const assetResult = await provider.upload(asset.path, {
              engine: job.engine,
              mimeType: asset.mimeType,
              deleteAfterHours: job.deleteAfterHours,
              metadata: { jobId: job.jobId, role: asset.role },
            });
            assetFileIds[asset.role] = assetResult.fileId;
          } catch (assetErr: any) {
            console.warn(`[StorageQueue] Asset "${asset.role}" upload failed (non-fatal): ${assetErr.message}`);
          }
        }
      }

      const deleteAt =
        job.deleteAfterHours > 0
          ? new Date(Date.now() + job.deleteAfterHours * 3_600_000).toISOString()
          : null;

      job.result = {
        driveFileId: uploadResult.fileId,
        driveUrl: uploadResult.viewLink ?? uploadResult.url,
        downloadLink: uploadResult.downloadLink ?? uploadResult.url,
        driveFolderId: uploadResult.folderId,
        uploadedAt: uploadResult.createdAt,
        provider: uploadResult.provider,
        sha256,
        md5,
        assetFileIds,
      };

      // ── Update Firestore ───────────────────────────────────────────────────
      try {
        await db.collection("videos").doc(job.jobId).set(
          {
            driveFileId: job.result.driveFileId,
            driveUrl: job.result.driveUrl,
            downloadLink: job.result.downloadLink,
            driveFolderId: job.result.driveFolderId ?? null,
            driveUploadedAt: job.result.uploadedAt,
            storageProvider: job.result.provider,
            cleanupStatus: deleteAt ? "pending" : "never",
            deleteAt,
            sha256: sha256 ?? null,
            md5: md5 ?? null,
            ...job.versions,
            assetFileIds,
            uploadQueueJobId: job.id,
            uploadAttempts: job.attempts,
          },
          { merge: true }
        );
      } catch (fsErr: any) {
        console.warn(`[StorageQueue] Firestore update failed (non-fatal): ${fsErr.message}`);
      }

      const durationMs = Date.now() - startMs;
      job.status = "completed";
      this.queue = this.queue.filter((j) => j.id !== job.id);

      // ── Persist completion to SQLite ───────────────────────────────────────
      UploadJobDB.updateStatus(job.id, "completed", {
        result_json: JSON.stringify(job.result),
        sha256: sha256 ?? null,
        md5: md5 ?? null,
      });

      // ── Record metrics ─────────────────────────────────────────────────────
      MetricsDB.record("upload_duration_ms", "storage", durationMs, { engine: job.engine ?? "unknown" });
      MetricsDB.record("upload_size_bytes", "storage", uploadResult.sizeBytes ?? 0);
      MetricsDB.record("success", "storage", 1, { engine: job.engine ?? "unknown" });

      EventBus.publish(
        "storage.upload.completed",
        {
          queueJobId: job.id,
          jobId: job.jobId,
          driveFileId: job.result.driveFileId,
          sha256,
          durationMs,
        },
        job.id
      );

      console.log(`[StorageQueue] Completed job ${job.id} → ${job.result.driveFileId} (${durationMs}ms)`);

    } catch (err: any) {
      const durationMs = Date.now() - startMs;
      console.error(`[StorageQueue] Upload attempt ${job.attempts} failed for ${job.id}: ${err.message}`);
      job.lastError = err.message;

      if (job.attempts >= job.maxAttempts) {
        job.status = "dead";
        this.queue = this.queue.filter((j) => j.id !== job.id);
        this.deadLetterQueue.push(job);

        UploadJobDB.updateStatus(job.id, "dead", {
          last_error: err.message,
          attempts: job.attempts,
        });

        MetricsDB.record("failure", "storage", 1, { reason: "dead_letter", engine: job.engine ?? "unknown" });

        EventBus.publish(
          "storage.upload.dead",
          { queueJobId: job.id, jobId: job.jobId, error: err.message, attempts: job.attempts },
          job.id
        );

        try {
          await db.collection("videos").doc(job.jobId).set(
            { uploadStatus: "dead", uploadError: err.message, uploadAttempts: job.attempts },
            { merge: true }
          );
        } catch {}

        console.error(`[StorageQueue] Job ${job.id} → dead letter after ${job.attempts} attempts`);
      } else {
        const delayMs = RETRY_DELAYS_MS[job.attempts - 1] ?? 1_800_000;
        job.status = "retrying";
        job.nextRetryAt = Date.now() + delayMs;

        UploadJobDB.updateStatus(job.id, "retrying", {
          attempts: job.attempts,
          next_retry_at: job.nextRetryAt,
          last_error: err.message,
        });

        MetricsDB.record("retry_count", "storage", 1, { engine: job.engine ?? "unknown" });
        MetricsDB.record("failure", "storage", 1, { reason: "retrying", engine: job.engine ?? "unknown" });

        EventBus.publish(
          "storage.upload.failed",
          {
            queueJobId: job.id,
            jobId: job.jobId,
            error: err.message,
            attempt: job.attempts,
            nextRetryAt: job.nextRetryAt,
            retryInMs: delayMs,
          },
          job.id
        );

        console.log(
          `[StorageQueue] Job ${job.id} → retry in ${delayMs / 1000}s (attempt ${job.attempts}/${job.maxAttempts})`
        );
      }
    } finally {
      this.processing.delete(job.id);
    }
  }

  // ─── Inspection ────────────────────────────────────────────────────────────

  getQueue(): UploadQueueJob[] {
    return [...this.queue];
  }

  getDeadLetterQueue(): UploadQueueJob[] {
    return [...this.deadLetterQueue];
  }

  getStats() {
    return {
      pending:     this.queue.filter((j) => j.status === "pending").length,
      processing:  this.processing.size,
      retrying:    this.queue.filter((j) => j.status === "retrying").length,
      dead:        this.deadLetterQueue.length,
      total:       this.queue.length + this.deadLetterQueue.length,
      concurrency: this.concurrency,
      restored:    this.restored,
    };
  }

  retryDead(queueJobId: string): boolean {
    const idx = this.deadLetterQueue.findIndex((j) => j.id === queueJobId);
    if (idx === -1) return false;
    const job = this.deadLetterQueue.splice(idx, 1)[0];
    job.status = "pending";
    job.attempts = 0;
    job.lastError = undefined;
    job.nextRetryAt = undefined;
    this.queue.push(job);
    UploadJobDB.updateStatus(job.id, "pending", { attempts: 0, next_retry_at: null, last_error: null });
    setImmediate(() => this.tick());
    return true;
  }
}

export const StorageQueue = new StorageQueueClass();
