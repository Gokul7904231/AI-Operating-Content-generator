/**
 * POST /api/drive/cleanup
 * Body: { jobId?: string, fileId?: string }
 *
 * Manually trigger cleanup for a specific job OR run the full pending cleanup.
 * If jobId is provided: trash that job's Drive file + update Firestore.
 * If neither: runs full cleanup pass (same as cron).
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { StorageRegistry } from "../../../../storage/storage-registry";
import { getPendingCleanup, markCleaned } from "../../../../lib/drive-store";
import { EventBus } from "../../../../ai/event-bus";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { jobId, fileId } = body ?? {};

    const provider = StorageRegistry.getProvider("google-drive");

    // ── Single job cleanup ──────────────────────────────────────────────────
    if (jobId && fileId) {
      await provider.delete(String(fileId));
      await markCleaned(String(jobId));
      return NextResponse.json({
        success: true,
        mode: "single",
        jobId,
        fileId,
        trashed: true,
      });
    }

    // ── Batch cleanup: all pending expired jobs ─────────────────────────────
    const pending = await getPendingCleanup();
    const results = { deleted: 0, failed: 0, skipped: 0, jobs: [] as any[] };

    for (const job of pending) {
      if (!job.driveFileId) {
        results.skipped++;
        continue;
      }
      try {
        await provider.delete(job.driveFileId);
        await markCleaned(job.jobId);
        results.deleted++;
        results.jobs.push({ jobId: job.jobId, fileId: job.driveFileId, status: "trashed" });
      } catch (err: any) {
        results.failed++;
        results.jobs.push({ jobId: job.jobId, fileId: job.driveFileId, status: "failed", error: err.message });
      }
    }

    EventBus.publish(
      "storage.cleanup.completed",
      { provider: "google-drive", ...results },
      `cleanup_manual_${Date.now()}`
    );

    return NextResponse.json({ success: true, mode: "batch", ...results });
  } catch (err: any) {
    console.error("[/api/drive/cleanup]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
