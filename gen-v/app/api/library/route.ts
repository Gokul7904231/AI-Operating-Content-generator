import { NextResponse } from "next/server";
import cloudinary from "cloudinary";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";

// Initialize Cloudinary server-side
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const { searchParams } = new URL(req.url);
    
    // Default prefix is geo_quiz_factory; if non-admin specifies a folder, ensure they can only query their own
    let prefix = searchParams.get("prefix") ?? "geo_quiz_factory";
    const maxResults = Math.min(parseInt(searchParams.get("max") ?? "20"), 50);

    // Non-admin users are strictly scoped to their own user directory or user videos
    if (!isAdminUser(user.role)) {
      prefix = `users/${user.uid}`;
    }

    let videos: any[] = [];
    try {
      const result = await cloudinary.v2.api.resources({
        type: "upload",
        resource_type: "video",
        prefix,
        max_results: maxResults,
        direction: "desc",
      });

      videos = (result.resources ?? []).map((r: any) => ({
        publicId: r.public_id,
        url: r.secure_url,
        format: r.format,
        bytes: r.bytes,
        sizeMb: +(r.bytes / 1024 / 1024).toFixed(2),
        duration: r.duration ?? null,
        width: r.width,
        height: r.height,
        createdAt: r.created_at,
        folder: r.folder ?? prefix,
        displayName: r.public_id.split("/").pop()?.replace(/_/g, " ") ?? r.public_id,
      }));
    } catch {
      // If Cloudinary prefix folder does not exist or in mock mode, query user's completed jobs from Firestore
      const { db } = await import("@/lib/firebase-admin");
      let query: any = db.collection("videos").where("status", "==", "completed");
      if (!isAdminUser(user.role)) {
        query = query.where("userId", "==", user.uid);
      }
      const snapshot = await query.limit(maxResults).get();
      videos = snapshot.docs.map((doc: any) => {
        const d = doc.data();
        return {
          publicId: doc.id,
          url: d.videoUrl || `https://storage.factoryos.app/renders/${doc.id}.mp4`,
          format: "mp4",
          bytes: 1024 * 1024 * (d.videoSizeMb || 4.2),
          sizeMb: d.videoSizeMb || 4.2,
          duration: d.renderDurationSeconds || 30,
          width: 1080,
          height: 1920,
          createdAt: d.createdAt || new Date().toISOString(),
          folder: prefix,
          displayName: d.topic || "Rendered Short",
        };
      });
    }

    return NextResponse.json({
      total: videos.length,
      prefix,
      videos,
    });
  } catch (err: any) {
    console.error("[Library API]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
