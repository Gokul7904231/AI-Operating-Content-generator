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
        service: "Generic RenderJob Fabric & Oracle ARM64 Pool",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/rendering/workers
 * Enqueues or cancels a render job using the Universal RenderJob contract.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, jobId, id, topic, tenantId = "tenant_default", userId = "user_default", tier = "FREE", contentEngine = "quiz", aiExecutionMode = "CLOUD" } = body;

    if (action === "cancel") {
      const targetId = jobId || id;
      if (!targetId) return NextResponse.json({ error: "Missing jobId for cancellation" }, { status: 400 });
      const cancelled = RenderQueueManager.cancelJob(targetId, tenantId);
      return NextResponse.json({ success: true, cancelled, jobId: targetId });
    }

    if (!topic || !jobId) {
      return NextResponse.json({ error: "Missing topic or jobId" }, { status: 400 });
    }

    const job = RenderQueueManager.enqueue({
      id: id || `render_${Date.now()}`,
      jobId,
      tenantId,
      userId,
      tier,
      contentEngine,
      aiExecutionMode,
      topic,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
