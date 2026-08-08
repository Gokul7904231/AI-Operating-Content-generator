import { NextResponse } from "next/server";
import { RenderQueueManager } from "../../../../lib/rendering/RenderQueueManager";

export const dynamic = "force-dynamic";

/**
 * GET /api/rendering/workers
 * Returns render worker pool health, active jobs, and queue stats.
 */
export async function GET() {
  try {
    const queue = RenderQueueManager.getQueue();
    const activeJobs = RenderQueueManager.getActiveJobs();
    const workers = RenderQueueManager.getWorkers();

    return NextResponse.json({
      success: true,
      workers,
      activeJobs,
      queueDepth: queue.length,
      queue,
      provenance: {
        source: "/api/rendering/workers",
        service: "RenderQueueManager & VPS FFmpeg Pool",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/rendering/workers
 * Enqueues or cancels a render job.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, jobId, id, topic, tier = "FREE", userId = "anon_user" } = body;

    if (action === "cancel") {
      const targetId = jobId || id;
      if (!targetId) return NextResponse.json({ error: "Missing jobId for cancellation" }, { status: 400 });
      const cancelled = RenderQueueManager.cancelJob(targetId);
      return NextResponse.json({ success: true, cancelled, jobId: targetId });
    }

    // Default action: enqueue render job
    if (!topic || !jobId) {
      return NextResponse.json({ error: "Missing topic or jobId" }, { status: 400 });
    }

    const job = RenderQueueManager.enqueue({
      id: id || `render_job_${Date.now()}`,
      jobId,
      userId,
      tier,
      topic,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
