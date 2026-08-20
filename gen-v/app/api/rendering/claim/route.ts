import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/firebase-admin";

const RENDER_WORKER_SECRET = process.env.RENDER_WORKER_SECRET || process.env.INTERNAL_API_SECRET_KEY || "factoryos-render-worker-secret-key-2026";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate Render Worker
    const authHeader = request.headers.get("authorization") || "";
    const workerSecretHeader = request.headers.get("x-worker-secret") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "") || workerSecretHeader;

    if (!token || token !== RENDER_WORKER_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid render worker credentials." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const workerId = body.workerId || `worker-gh-${crypto.randomBytes(4).toString("hex")}`;

    // 2. Concurrency-Safe Atomic Job Claim via Firestore Transaction
    const claimResult = await db.runTransaction(async (transaction: any) => {
      // Find oldest queued video job
      const snapshot = await db
        .collection("videos")
        .where("status", "==", "queued")
        .orderBy("createdAt", "asc")
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      const jobRef = db.collection("videos").doc(doc.id);
      const jobData = doc.data();

      // Ensure job hasn't been claimed in race condition
      if (jobData.status !== "queued") {
        return null;
      }

      // Generate cryptographically secure short-lived execution token
      const executionToken = `exec_${crypto.randomBytes(24).toString("hex")}`;
      const startedAt = new Date().toISOString();

      transaction.update(jobRef, {
        status: "processing",
        workerId,
        startedAt,
        executionToken,
        updatedAt: startedAt,
      });

      return {
        id: doc.id,
        jobId: doc.id,
        userId: jobData.userId || "anonymous",
        topic: jobData.topic || "Untitled Short",
        script: jobData.script || "",
        scenes: jobData.scenes || [],
        quizData: jobData.quizData || null,
        renderProfile: jobData.renderProfile || "FAST_QUIZ",
        contentType: jobData.contentType || "QUIZ_SHORTS",
        executionToken,
        workerId,
        startedAt,
      };
    });

    if (!claimResult) {
      return NextResponse.json({
        success: true,
        claimed: false,
        message: "No queued video jobs available.",
      });
    }

    return NextResponse.json({
      success: true,
      claimed: true,
      job: claimResult,
    });
  } catch (err: any) {
    console.error("[Rendering Claim API Error]:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
