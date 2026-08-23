import { NextResponse } from "next/server";
import { db } from "../../../../lib/firebase-admin";
import { ServiceRegistry } from "../../../../lib/core/ServiceRegistry";
// ServiceRegistryInit pulls sharp transitively — load lazily inside GET so build collection doesn't DLOPEN the native binary

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
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

    const job = doc.data();
    if (!job) {
      return NextResponse.json({ error: "Job data is empty" }, { status: 404 });
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
