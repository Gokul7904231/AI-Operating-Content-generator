/**
 * Storage Analytics
 *
 * Tracks operational metrics for all storage providers:
 *   - Storage used / quota
 *   - Videos uploaded today
 *   - Average upload time
 *   - Failures & retries
 *   - Average file size
 *   - Delete count
 *   - Storage saved by cleanup
 *
 * Aggregates from:
 *   1. In-memory telemetry rings in each provider
 *   2. Firestore video collection
 *   3. StorageQueue.getStats()
 *
 * Consumed by /api/storage/analytics and the Drive Browser UI.
 */

import { StorageRegistry } from "./storage-registry";
import { StorageQueue } from "./upload-queue";
import { db } from "../lib/firebase-admin";

export interface StorageAnalyticsSnapshot {
  /** ISO 8601 timestamp when these metrics were computed. */
  computedAt: string;

  /** Per-provider health summaries. */
  providers: ProviderSummary[];

  /** Today's upload activity. */
  today: TodayMetrics;

  /** All-time aggregate metrics. */
  allTime: AllTimeMetrics;

  /** Current queue status. */
  queue: QueueMetrics;
}

export interface ProviderSummary {
  id: string;
  name: string;
  state: string;
  reachable: boolean;
  latencyMs: number;
  usedGB: number | null;
  quotaGB: number | null;
  usedPercent: number | null;
  avgUploadMs: number;
  successRate: number;
  uploadCount: number;
  deleteCount: number;
  lastActivity: string | null;
}

export interface TodayMetrics {
  uploadsCount: number;
  failuresCount: number;
  deletionsCount: number;
  totalBytesUploaded: number;
  avgUploadMs: number;
  avgFileSizeBytes: number;
}

export interface AllTimeMetrics {
  totalUploads: number;
  totalDeletions: number;
  pendingCleanup: number;
  storageSavedBytes: number;  // bytes freed by cleanup
  deadLetterCount: number;
}

export interface QueueMetrics {
  pending: number;
  processing: number;
  retrying: number;
  dead: number;
  total: number;
  concurrency: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Class
// ─────────────────────────────────────────────────────────────────────────────

class StorageAnalyticsClass {
  private deletedBytesAccumulator = 0;

  /**
   * Record bytes freed after a cleanup deletion.
   * Called internally by the cleanup runner.
   */
  recordDeletion(sizeBytes: number): void {
    this.deletedBytesAccumulator += sizeBytes;
  }

  /**
   * Compute a full analytics snapshot.
   */
  async getSnapshot(): Promise<StorageAnalyticsSnapshot> {
    const computedAt = new Date().toISOString();
    const providers = await this.computeProviderSummaries();
    const [today, allTime] = await Promise.all([
      this.computeTodayMetrics(),
      this.computeAllTimeMetrics(),
    ]);
    const queue = StorageQueue.getStats();

    return { computedAt, providers, today, allTime, queue };
  }

  // ─── Provider Summaries ────────────────────────────────────────────────────

  private async computeProviderSummaries(): Promise<ProviderSummary[]> {
    const summaries: ProviderSummary[] = [];

    for (const provider of StorageRegistry.getAllProviders()) {
      let state = "UNKNOWN";
      let reachable = false;
      let latencyMs = 0;
      let usedGB: number | null = null;
      let quotaGB: number | null = null;
      let usedPercent: number | null = null;

      try {
        const health = await provider.healthCheck();
        state = health.state;
        reachable = health.reachable;
        latencyMs = health.latencyMs;
        if (health.usedBytes > 0) usedGB = health.usedBytes / 1_073_741_824;
        if (health.quotaBytes > 0) quotaGB = health.quotaBytes / 1_073_741_824;
        if (usedGB !== null && quotaGB !== null && quotaGB > 0) {
          usedPercent = (usedGB / quotaGB) * 100;
        }
      } catch {}

      // Compute from telemetry
      const telemetry = provider.getTelemetry(500);
      const uploads = telemetry.filter((t) => t.operation === "upload");
      const deletes = telemetry.filter((t) => t.operation === "delete");
      const successful = uploads.filter((t) => t.success);
      const avgUploadMs =
        successful.length > 0
          ? successful.reduce((s, t) => s + t.durationMs, 0) / successful.length
          : 0;
      const successRate =
        uploads.length > 0 ? successful.length / uploads.length : 1;

      const lastActivity =
        telemetry.length > 0
          ? telemetry[telemetry.length - 1].recordedAt
          : null;

      summaries.push({
        id: provider.id,
        name: provider.name,
        state,
        reachable,
        latencyMs,
        usedGB,
        quotaGB,
        usedPercent,
        avgUploadMs: Math.round(avgUploadMs),
        successRate,
        uploadCount: uploads.length,
        deleteCount: deletes.length,
        lastActivity,
      });
    }

    return summaries;
  }

  // ─── Today's Metrics ───────────────────────────────────────────────────────

  private async computeTodayMetrics(): Promise<TodayMetrics> {
    const metrics: TodayMetrics = {
      uploadsCount: 0,
      failuresCount: 0,
      deletionsCount: 0,
      totalBytesUploaded: 0,
      avgUploadMs: 0,
      avgFileSizeBytes: 0,
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    for (const provider of StorageRegistry.getAllProviders()) {
      const telemetry = provider.getTelemetry(500);
      const todayItems = telemetry.filter(
        (t) => new Date(t.recordedAt).getTime() >= startOfDay.getTime()
      );

      const uploads = todayItems.filter((t) => t.operation === "upload" && t.success);
      const failures = todayItems.filter((t) => t.operation === "upload" && !t.success);
      const deletes = todayItems.filter((t) => t.operation === "delete" && t.success);

      metrics.uploadsCount += uploads.length;
      metrics.failuresCount += failures.length;
      metrics.deletionsCount += deletes.length;
      metrics.totalBytesUploaded += uploads.reduce((s, t) => s + (t.sizeBytes ?? 0), 0);
    }

    if (metrics.uploadsCount > 0) {
      let totalMs = 0;
      for (const provider of StorageRegistry.getAllProviders()) {
        const today = provider
          .getTelemetry(500)
          .filter(
            (t) =>
              t.operation === "upload" &&
              t.success &&
              new Date(t.recordedAt).getTime() >= new Date().setHours(0, 0, 0, 0)
          );
        totalMs += today.reduce((s, t) => s + t.durationMs, 0);
      }
      metrics.avgUploadMs = Math.round(totalMs / metrics.uploadsCount);
      metrics.avgFileSizeBytes = Math.round(metrics.totalBytesUploaded / metrics.uploadsCount);
    }

    return metrics;
  }

  // ─── All-Time Metrics ──────────────────────────────────────────────────────

  private async computeAllTimeMetrics(): Promise<AllTimeMetrics> {
    let totalUploads = 0;
    let totalDeletions = 0;
    let pendingCleanup = 0;

    try {
      const uploadSnap = await db
        .collection("videos")
        .where("driveFileId", "!=", "")
        .limit(1000)
        .get();
      totalUploads = uploadSnap.size;

      const pendingSnap = await db
        .collection("videos")
        .where("cleanupStatus", "==", "pending")
        .limit(1000)
        .get();
      pendingCleanup = pendingSnap.size;

      const cleanedSnap = await db
        .collection("videos")
        .where("cleanupStatus", "==", "cleaned")
        .limit(1000)
        .get();
      totalDeletions = cleanedSnap.size;
    } catch {
      // Firestore may be unavailable or missing index
    }

    return {
      totalUploads,
      totalDeletions,
      pendingCleanup,
      storageSavedBytes: this.deletedBytesAccumulator,
      deadLetterCount: StorageQueue.getDeadLetterQueue().length,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Singleton
// ─────────────────────────────────────────────────────────────────────────────

export const StorageAnalytics = new StorageAnalyticsClass();
