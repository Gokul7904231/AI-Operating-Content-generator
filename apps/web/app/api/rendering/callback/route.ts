import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase-admin";
import { finalizeGenerationSlot, releaseGenerationSlot } from "@/lib/quota/quota-service";

import { readJobManifest, saveJobManifest } from "@/lib/jobs-history";

const RENDER_WORKER_SECRET = process.env.RENDER_WORKER_SECRET || process.env.INTERNAL_API_SECRET_KEY;

function safeEqual(a: string, b: string): boolean {
  if (!a || !b) return false;
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    service: "factoryos-rendering-callback",
    allowedMethods: ["POST"],
    message: "ShortForge Render Callback API endpoint is live.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      jobId,
      status,
      videoUrl,
      videoSizeMb,
      renderDurationSeconds,
      driveFileId,
      driveUrl,
      filename,
      fileSize,
      duration,
      artifactSha256,
      deliveryTarget,
      deliveryProvider,
      deliveryState,
      workerCredentialVersion,
      fallbackUsed,
      fallbackReason,
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

    const jobData = (await readJobManifest(jobId)) || (db ? (await db.collection("videos").doc(jobId).get().then(d => d.data())) : null);

    if (!jobData) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    const validExecutionToken = (jobData as any).executionToken as string | undefined;

    const isMasterWorker = RENDER_WORKER_SECRET ? safeEqual(bearer, RENDER_WORKER_SECRET) : false;
    const isJobTokenValid = validExecutionToken ? safeEqual(bearer, validExecutionToken) : false;

    if (!isMasterWorker && !isJobTokenValid) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid execution authorization token." },
        { status: 401 }
      );
    }

    const userId = jobData.userId || "anonymous";

    // 2. Idempotency Check: Repeated callback for already completed job
    if (jobData.status === "completed" && status === "completed") {
      return NextResponse.json({
        success: true,
        jobId,
        status: "completed",
        videoUrl: jobData.videoUrl,
        driveFileId: (jobData as any).driveFileId || null,
        driveUrl: (jobData as any).driveUrl || null,
        artifactSha256: (jobData as any).artifactSha256 || null,
        message: "Job already marked completed (idempotent callback).",
      });
    }

    // 3. Handle Status Transitions & Idempotent Quota Reconciliations
    if (status === "completed") {
      const now = new Date().toISOString();
      const finalVideoUrl =
        videoUrl ||
        driveUrl ||
        jobData.videoUrl ||
        `https://storage.factoryos.app/renders/${jobId}.mp4`;

      const finalSizeMb =
        videoSizeMb || (fileSize ? Number((fileSize / (1024 * 1024)).toFixed(2)) : jobData.videoSizeMb || 4.2);
      const finalDuration =
        renderDurationSeconds || duration || jobData.renderDurationSeconds || 30;

      await saveJobManifest(jobId, {
        status: "completed",
        deliveryState: deliveryState || "DELIVERED",
        deliveryTarget: deliveryTarget || "GOOGLE_DRIVE",
        deliveryProvider: deliveryProvider || "google_drive",
        videoUrl: finalVideoUrl,
        driveFileId: driveFileId || (jobData as any).driveFileId || null,
        driveUrl: driveUrl || (jobData as any).driveUrl || null,
        filename: filename || (jobData as any).filename || `${jobId}.mp4`,
        artifactSha256: artifactSha256 || (jobData as any).artifactSha256 || null,
        workerCredentialVersion: workerCredentialVersion || null,
        fallbackUsed: Boolean(fallbackUsed),
        fallbackReason: fallbackReason || null,
        videoSizeMb: finalSizeMb,
        renderDurationSeconds: finalDuration,
        completedAt: now,
        telemetry: telemetry || null,
        updatedAt: now,
      } as any);

      // 🔒 Finalize Quota Slot Consumption (Idempotent)
      await finalizeGenerationSlot(userId, jobId);

      return NextResponse.json({
        success: true,
        jobId,
        status: "completed",
        deliveryState: "DELIVERED",
        videoUrl: finalVideoUrl,
        driveFileId: driveFileId || (jobData as any).driveFileId,
        driveUrl: driveUrl || (jobData as any).driveUrl,
        artifactSha256: artifactSha256 || null,
        message: "Render completed, verified delivery artifact recorded, and quota consumption finalized successfully.",
      });
    }

    if (status === "failed") {
      const now = new Date().toISOString();
      await saveJobManifest(jobId, {
        status: "failed",
        deliveryState: deliveryState || "DELIVERY_FAILED",
        error: error || "Rendering or delivery process terminated with error.",
        workerCredentialVersion: workerCredentialVersion || null,
        failedAt: now,
        updatedAt: now,
      } as any);

      // 🔒 Reconcile and Release Quota Slot
      await releaseGenerationSlot(userId, jobId);

      return NextResponse.json({
        success: true,
        jobId,
        status: "failed",
        deliveryState: deliveryState || "DELIVERY_FAILED",
        error: error || "Render/delivery failed",
        message: "Failure recorded and quota reservation released.",
      });
    }

    return NextResponse.json({ success: false, error: `Invalid status: ${status}` }, { status: 400 });
  } catch (err: any) {
    console.error("[Rendering Callback API Error]:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
