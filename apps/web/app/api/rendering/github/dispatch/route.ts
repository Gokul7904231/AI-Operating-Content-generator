import { NextResponse } from "next/server";
import { RenderQueueManager } from "../../../../../lib/rendering/RenderQueueManager";
import { GitHubActionsRenderManager } from "../../../../../lib/rendering/GitHubActionsRenderManager";
import { BasicRenderingCapacityGuard } from "../../../../../lib/rendering/BasicRenderingCapacityGuard";

export const dynamic = "force-dynamic";

/**
 * POST /api/rendering/github/dispatch
 * Triggers workflow_dispatch for a queued Basic/Free RenderJob.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, tenantId = "tenant_default", userId = "user_default" } = body;

    if (!jobId) {
      return NextResponse.json({ success: false, error: "Missing jobId parameter" }, { status: 400 });
    }

    const queue = RenderQueueManager.getQueue();
    const job = queue.find((j) => j.id === jobId || j.jobId === jobId);

    if (!job) {
      return NextResponse.json({ success: false, error: "RenderJob not found in queue" }, { status: 404 });
    }

    // Azure is ADMIN-ONLY server-side check
    if (job.tier === "ADMIN") {
      return NextResponse.json({ success: false, error: "Admin jobs are processed via Azure compute, not GitHub Actions." }, { status: 400 });
    }

    const result = await GitHubActionsRenderManager.dispatchWorkflowRun(job);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "GitHub Actions workflow_dispatch triggered successfully.",
      runRecord: result.runRecord,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
