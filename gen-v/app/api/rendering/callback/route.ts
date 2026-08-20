import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { finalizeGenerationSlot, releaseGenerationSlot } from "@/lib/quota/quota-service";

const RENDER_WORKER_SECRET = process.env.RENDER_WORKER_SECRET || process.env.INTERNAL_API_SECRET_KEY || "factoryos-render-worker-secret-key-2026";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      jobId,
      status,
      videoUrl,
      videoSizeMb,
      renderDurationSeconds,
      error,
      telemetry,
      executionToken,
    } = body;

    if (!jobId || !status) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: jobId and status" },
        { status: 400 }
      );
    }

    // 1. Authorize Execution Callback
    const authHeader = request.headers.get("authorization") || "";
    const tokenHeader = request.headers.get("x-execution-token") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "") || tokenHeader || executionToken;

    const jobRef = db.collection("videos").doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const jobData = jobDoc.data() || {};
    const validExecutionToken = jobData.executionToken;

    const isMasterWorker = bearer === RENDER_WORKER_SECRET;
    const isJobTokenValid = validExecutionToken && bearer === validExecutionToken;

    if (!isMasterWorker && !isJobTokenValid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid execution authorization token." },
        { status: 401 }
      );
    }

    const userId = jobData.userId || "anonymous";

    // 2. Handle Status Transitions & Idempotent Quota Reconciliations
    if (status === "completed") {
      const now = new Date().toISOString();
      await jobRef.set(
        {
          status: "completed",
          videoUrl: videoUrl || jobData.videoUrl || `https://storage.factoryos.app/renders/${jobId}.mp4`,
          videoSizeMb: videoSizeMb || 4.2,
          renderDurationSeconds: renderDurationSeconds || 28,
          completedAt: now,
          telemetry: telemetry || null,
          updatedAt: now,
        },
        { merge: true }
      );

      // 🔒 Finalize Quota Slot Consumption (Idempotent)
      await finalizeGenerationSlot(userId, jobId);

      return NextResponse.json({
        success: true,
        jobId,
        status: "completed",
        videoUrl: videoUrl || jobData.videoUrl,
        message: "Render completed and quota consumption finalized successfully.",
      });
    }

    if (status === "failed") {
      const now = new Date().toISOString();
      await jobRef.set(
        {
          status: "failed",
          error: error || "Rendering process terminated with error.",
          failedAt: now,
          updatedAt: now,
        },
        { merge: true }
      );

      // 🔒 Reconcile and Release Quota Slot
      await releaseGenerationSlot(userId, jobId);

      return NextResponse.json({
        success: true,
        jobId,
        status: "failed",
        error: error || "Render failed",
        message: "Render failure recorded and quota reservation released.",
      });
    }

    return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
  } catch (err: any) {
    console.error("[Rendering Callback API Error]:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
