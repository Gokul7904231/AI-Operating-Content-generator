/**
 * Cleanup Drive Utility
 *
 * Standalone cleanup runner — can be called from:
 *   - /api/cron/cleanup (HTTP cron endpoint)
 *   - Direct Node.js execution: npx ts-node storage/cleanup-drive.ts
 *
 * Algorithm:
 *   1. List all Drive video files
 *   2. Filter by age > GOOGLE_DRIVE_DELETE_AFTER_HOURS (default 72h)
 *   3. Trash each file
 *   4. Log every deletion
 *   5. Update Firestore
 *   6. Publish storage.cleanup.completed event
 */

import "../storage/index";
import { StorageRegistry } from "../storage/storage-registry";
import { getPendingCleanup, markCleaned } from "../lib/drive-store";
import { EventBus } from "../ai/event-bus";

export interface CleanupRunOptions {
  /** Override delete-after hours (default: GOOGLE_DRIVE_DELETE_AFTER_HOURS or 72). */
  deleteAfterHours?: number;
  /** If true, log actions but don't actually delete. */
  dryRun?: boolean;
}

export interface CleanupRunResult {
  ranAt: string;
  dryRun: boolean;
  deleted: number;
  failed: number;
  skipped: number;
  durationMs: number;
  jobs: Array<{ jobId: string; fileId: string; status: string; error?: string }>;
}

export async function runCleanup(opts: CleanupRunOptions = {}): Promise<CleanupRunResult> {
  const deleteAfterHours =
    opts.deleteAfterHours ??
    Number(process.env.GOOGLE_DRIVE_DELETE_AFTER_HOURS ?? 72);

  const dryRun = opts.dryRun ?? false;
  const traceId = `cleanup_${Date.now()}`;
  const startTime = Date.now();

  const result: CleanupRunResult = {
    ranAt: new Date().toISOString(),
    dryRun,
    deleted: 0,
    failed: 0,
    skipped: 0,
    durationMs: 0,
    jobs: [],
  };

  console.log(
    `[CleanupDrive] Starting${dryRun ? " (DRY RUN)" : ""} | deleteAfterHours=${deleteAfterHours}`
  );

  try {
    const provider = StorageRegistry.getProvider("google-drive");

    // Strategy A: Use Firestore pending cleanup list (accurate, fast)
    const firestorePending = await getPendingCleanup();

    if (firestorePending.length > 0) {
      console.log(
        `[CleanupDrive] Firestore: ${firestorePending.length} jobs pending cleanup.`
      );

      for (const job of firestorePending) {
        if (!job.driveFileId) {
          result.skipped++;
          continue;
        }

        if (dryRun) {
          console.log(
            `[CleanupDrive] DRY RUN: would trash "${job.driveFileId}" (job: ${job.jobId})`
          );
          result.deleted++;
          result.jobs.push({ jobId: job.jobId, fileId: job.driveFileId, status: "dry-run" });
          continue;
        }

        try {
          await provider.delete(job.driveFileId);
          await markCleaned(job.jobId);
          result.deleted++;
          result.jobs.push({ jobId: job.jobId, fileId: job.driveFileId, status: "trashed" });
          console.log(
            `[CleanupDrive] Trashed: ${job.driveFileId} (job: ${job.jobId})`
          );
        } catch (err: any) {
          result.failed++;
          result.jobs.push({
            jobId: job.jobId,
            fileId: job.driveFileId,
            status: "failed",
            error: err.message,
          });
          console.error(
            `[CleanupDrive] Failed: ${job.driveFileId}: ${err.message}`
          );
        }
      }
    } else {
      // Strategy B: Scan Drive directly by age
      const olderThanMs = deleteAfterHours * 3_600_000;

      if (dryRun) {
        const files = await provider.list({ mimeTypeFilter: "video/", limit: 200 });
        const cutoff = Date.now() - olderThanMs;
        const expired = files.filter((f) => new Date(f.createdAt).getTime() < cutoff);
        console.log(
          `[CleanupDrive] DRY RUN: ${expired.length} files older than ${deleteAfterHours}h`
        );
        result.deleted = expired.length;
        result.jobs = expired.map((f) => ({
          jobId: f.fileId,
          fileId: f.fileId,
          status: "dry-run",
        }));
      } else {
        const cleanResult = await provider.cleanup(olderThanMs);
        result.deleted = cleanResult.deletedCount;
        result.failed = cleanResult.failedCount;
        result.jobs = cleanResult.deletedFileIds.map((id) => ({
          jobId: id,
          fileId: id,
          status: "trashed",
        }));
      }
    }
  } catch (err: any) {
    console.error("[CleanupDrive] Fatal:", err.message);
    result.failed++;
  }

  result.durationMs = Date.now() - startTime;

  if (!dryRun) {
    EventBus.publish("storage.cleanup.completed", result, traceId);
  }

  console.log(
    `[CleanupDrive] Done | deleted=${result.deleted} failed=${result.failed} skipped=${result.skipped} ${result.durationMs}ms`
  );

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry point (node cleanup-drive.js --dry-run)
// ─────────────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const dryRun = process.argv.includes("--dry-run");
  const hours = process.argv
    .find((a) => a.startsWith("--hours="))
    ?.replace("--hours=", "");

  runCleanup({
    dryRun,
    deleteAfterHours: hours ? Number(hours) : undefined,
  })
    .then((result) => {
      console.log("[CleanupDrive] Result:", JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((err) => {
      console.error("[CleanupDrive] Fatal:", err);
      process.exit(1);
    });
}
