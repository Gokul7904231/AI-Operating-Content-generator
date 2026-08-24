import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { user } = await verifySession(req);
    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: "Missing videoId parameter" }, { status: 400 });
    }

    const doc = await db.collection("videos").doc(videoId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const d = doc.data() || {};
    const isAdmin = isAdminUser(user.role);

    // Multi-user isolation — deny by default when ownership cannot be proven (orphan → 403 for non-admin)
    if (!isAdmin && d.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const driveFileId = d.driveFileId || d.deliveryArtifact?.driveFileId;
    const driveUrl = d.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined);

    return NextResponse.json({
      success: true,
      video: {
        videoId: doc.id,
        jobId: d.jobId || doc.id,
        ownerId: d.userId,
        title: d.topic || d.title || "Untitled Short",
        topic: d.topic || "AI Generated Short",
        engineId: d.engineId || d.style || "quiz",
        engineMode: d.quizContext?.quizMode || d.engineMode || "geo",
        status: d.status || "completed",
        videoUrl: d.videoUrl || `/api/media/video/${doc.id}`,
        driveUrl,
        driveFileId,
        deliveryTarget: d.deliveryTarget || (driveUrl ? "GOOGLE_DRIVE" : "LOCAL_OUTBOX"),
        isScheduled: Boolean(d.scheduleId || d.isScheduled),
        scheduleId: d.scheduleId,
        durationSeconds: d.durationSeconds || d.renderDurationSeconds || 45,
        sizeMb: d.videoSizeMb || 4.5,
        resolution: d.resolution || "1080x1920 (9:16)",
        fps: d.fps || 60,
        createdAt: d.createdAt || new Date().toISOString(),
        engineSnapshot: d.engineSnapshot,
        quizData: d.quizData,
        script: d.script,
        scenes: d.scenes,
        verificationSummary: d.verificationSummary,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load video details." }, { status: 500 });
  }
}
