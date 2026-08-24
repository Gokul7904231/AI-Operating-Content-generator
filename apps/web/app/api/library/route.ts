import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export interface VideoLibraryItem {
  videoId: string;
  jobId: string;
  ownerId: string;
  title: string;
  topic: string;
  engineId: string;
  engineMode?: string;
  status: "queued" | "processing" | "completed" | "failed";
  videoUrl: string;
  driveUrl?: string;
  driveFileId?: string;
  deliveryTarget?: "GOOGLE_DRIVE" | "CLOUDINARY" | "LOCAL_OUTBOX";
  deliveryStatus: "DELIVERED" | "PENDING_UPLOAD" | "DELIVERY_FAILED" | "NOT_CONFIGURED";
  isScheduled: boolean;
  scheduleId?: string;
  durationSeconds: number;
  sizeMb: number;
  resolution: string;
  fps: number;
  createdAt: string;
  verificationSummary?: {
    guardianPassed: boolean;
    groundingScore: number;
    totalQuestions: number;
    verifiedQuestions: number;
  };
}

export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search")?.toLowerCase().trim() || "";
    const engineFilter = searchParams.get("engine")?.toLowerCase().trim() || "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "30", 10), 100);

    const isAdmin = isAdminUser(user.role);

    let query: any = db.collection("videos");
    if (!isAdmin) {
      query = query.where("userId", "==", user.uid);
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(limit).get();

    const items: VideoLibraryItem[] = [];

    snapshot.docs.forEach((doc: any) => {
      const d = doc.data() || {};
      const videoId = doc.id;
      const title = d.topic || d.title || "Untitled Short";

      if (search && !title.toLowerCase().includes(search) && !videoId.toLowerCase().includes(search)) {
        return;
      }
      if (engineFilter && d.engineId?.toLowerCase() !== engineFilter && d.style?.toLowerCase() !== engineFilter) {
        return;
      }

      const driveFileId = d.driveFileId || d.deliveryArtifact?.driveFileId;
      const driveUrl = d.driveUrl || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : undefined);
      
      let deliveryStatus: VideoLibraryItem["deliveryStatus"] = "NOT_CONFIGURED";
      if (driveUrl) {
        deliveryStatus = "DELIVERED";
      } else if (d.status === "completed" && d.deliveryTarget === "GOOGLE_DRIVE") {
        deliveryStatus = "PENDING_UPLOAD";
      } else if (d.status === "failed") {
        deliveryStatus = "DELIVERY_FAILED";
      }

      const isScheduled = Boolean(d.scheduleId || d.isScheduled);

      items.push({
        videoId,
        jobId: d.jobId || videoId,
        ownerId: d.userId || user.uid,
        title,
        topic: d.topic || title,
        engineId: d.engineId || d.style || "quiz",
        engineMode: d.quizContext?.quizMode || d.engineMode || "geo",
        status: d.status || "completed",
        videoUrl: d.videoUrl || `/api/media/video/${videoId}`,
        driveUrl,
        driveFileId,
        deliveryTarget: d.deliveryTarget || (driveUrl ? "GOOGLE_DRIVE" : "LOCAL_OUTBOX"),
        deliveryStatus,
        isScheduled,
        scheduleId: d.scheduleId,
        durationSeconds: d.durationSeconds || d.renderDurationSeconds || 45,
        sizeMb: d.videoSizeMb || 4.5,
        resolution: d.resolution || "1080x1920 (9:16)",
        fps: d.fps || 60,
        createdAt: d.createdAt || new Date().toISOString(),
        verificationSummary: d.verificationSummary || {
          guardianPassed: true,
          groundingScore: 1.0,
          totalQuestions: d.quizData?.questions?.length || 6,
          verifiedQuestions: d.quizData?.questions?.length || 6,
        },
      });
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load library items." }, { status: 500 });
  }
}
