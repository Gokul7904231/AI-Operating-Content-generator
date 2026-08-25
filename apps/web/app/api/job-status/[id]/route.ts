import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";
import { ServiceRegistry } from "../../../../lib/core/ServiceRegistry";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";
// ServiceRegistryInit pulls sharp transitively — load lazily inside GET so build collection doesn't DLOPEN the native binary

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  // 🔒 Strict account isolation: job-status is per-user (admins excepted)
  let caller: any;
  try {
    const session = await verifySession(_req as any);
    caller = session.user;
  } catch (err: any) {
    const msg = err?.message || "Unauthorized";
    const status = err?.status || 401;
    return NextResponse.json({ error: msg }, { status });
  }

  try {
    // 1. Check local SQLite queue first
    if (!ServiceRegistry.has("renderQueue")) {
      const { SQLiteRenderQueue } = await import("../../../../lib/core/SQLiteRenderQueue");
      ServiceRegistry.register("renderQueue", new SQLiteRenderQueue());
    }
    const { QueueProcessor } = await import("../../../../lib/core/RenderQueueProcessor");
    QueueProcessor.start();

    const renderQueue = ServiceRegistry.get("renderQueue");
    const qJob = await renderQueue.getJob(id);
    if (qJob) {
      // Ownership barrier: SQLite payload or canonical Firestore doc must belong to caller
      const payloadUid = (qJob as any)?.payload?.userId ?? (qJob as any)?.payload?.user_id ?? null;
      let ownerUid: string | null = payloadUid;

      // Prefer canonical Firestore owner when available (covers queues that didn't embed userId)
      if (db) {
        try {
          const ownerDoc = await db.collection("videos").doc(id).get();
          if (ownerDoc.exists) {
            const d: any = ownerDoc.data();
            if (d?.userId) ownerUid = d.userId;
          }
        } catch {}
      }

      if (ownerUid && ownerUid !== caller.uid && !isAdminUser(caller.role)) {
        return NextResponse.json({ error: "Forbidden: You do not have permission to access this job." }, { status: 403 });
      }
      // If ownerUid is still null (legacy job without userId) — deny non-admin callers to prevent cross-account bleed
      if (!ownerUid && !isAdminUser(caller.role)) {
        // Fallback: treat as not found for non-admins to avoid leaking existence
        return NextResponse.json({ error: "Job not found" }, { status: 404 });
      }

      // Map statuses to expected frontend state
      let apiStatus = qJob.status;
      if (["claimed", "running", "retrying"].includes(qJob.status)) {
        apiStatus = "processing";
      }

      // Check checkpoint to fetch progress percentage
      const progress = (qJob as any).progress_percentage ?? 0;

      return NextResponse.json({
        id: qJob.jobId,
        videoId: qJob.jobId,
        status: apiStatus,
        detailedStatus: qJob.status,
        progress: progress,
        attempts: qJob.attempts,
        error: qJob.lastError,
        videoUrl: qJob.status === "completed" ? `/api/media/video/${qJob.jobId}` : null,
        output: qJob.status === "completed" ? { videoUrl: `/api/media/video/${qJob.jobId}` } : null
      });
    }

    // 2. Fallback to Firestore
    const doc = await db.collection("videos").doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const job = doc.data() as any;
    if (!job) {
      return NextResponse.json({ error: "Job data is empty" }, { status: 404 });
    }

    if (job.userId && job.userId !== caller.uid && !isAdminUser(caller.role)) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access this job." }, { status: 403 });
    }
    // Legacy docs without userId — hide from non-admins
    if (!job.userId && !isAdminUser(caller.role)) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: doc.id,
      videoId: doc.id,
      status: job.status,
      error: job.error,
      videoUrl: job.videoUrl,
      thumbnailUrl: job.thumbnailUrl,
      subtitlesUrl: job.subtitlesUrl,
      output:
        job.status === "completed"
          ? {
              renderProfile: job.renderProfile,
              fps: job.fps,
              resolution: job.resolution,
              videoUrl: job.videoUrl,
              thumbnailUrl: job.thumbnailUrl,
              subtitlesUrl: job.subtitlesUrl,
              timings: job.timings,
              cache: job.cache,
            }
          : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
