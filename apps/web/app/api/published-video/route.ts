/**
 * GET /api/published-video
 *
 * Public V1 Read-Only Endpoint for Deployed Northflank Application.
 * Returns the active published video metadata for public viewers.
 *
 * ZERO side-effects. Does NOT invoke LLMs, FFmpeg, FactoryOS, or Drive uploads.
 */
import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Attempt to read the latest completed video from Firestore
    try {
      const snapshot = await db
        .collection("videos")
        .where("status", "==", "completed")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        return NextResponse.json({
          id: doc.id,
          title: data.topic || data.title || "Autonomous Trivia Quiz",
          videoUrl: data.videoUrl || "/fallback_video.mp4",
          status: "PUBLISHED",
          isActive: true,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      }
    } catch {
      // Firestore unconfigured / offline fallback
    }

    // Fallback static published record for public demo
    return NextResponse.json({
      id: "pub_v1_default",
      title: "Autonomous Production Demo Quiz",
      videoUrl: "/fallback_video.mp4",
      status: "PUBLISHED",
      isActive: true,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch published video" },
      { status: 500 }
    );
  }
}
