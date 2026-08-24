import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";
import { readJobManifest } from "@/lib/jobs-history";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await verifySession(request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing video/job ID" }, { status: 400 });
    }

    const job = await readJobManifest(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Video artifact not found" }, { status: 404 });
    }

    // 🔒 Enforce Strict Ownership on Video Downloads
    const isOwner = job.userId === user.uid;
    const isAdmin = isAdminUser(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to download this video." },
        { status: 403 }
      );
    }

    if (job.status !== "completed" && job.status !== ("rendered" as any)) {
      return NextResponse.json(
        { success: false, error: "Video rendering is not yet complete." },
        { status: 400 }
      );
    }

    const videoUrl = job.videoUrl || (job as any).outputUrl;
    if (!videoUrl) {
      return NextResponse.json(
        { success: false, error: "Video artifact URL is not available." },
        { status: 404 }
      );
    }

    // If request asks for JSON metadata
    const acceptHeader = request.headers.get("accept") || "";
    if (acceptHeader.includes("application/json") || request.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json({
        success: true,
        jobId: job.id,
        downloadUrl: videoUrl,
        topic: job.topic || "Untitled Short",
        fileName: `${(job.topic || "short-video").toLowerCase().replace(/[^a-z0-9_-]/g, "_")}.mp4`,
      });
    }

    // Otherwise redirect browser to artifact download stream
    return NextResponse.redirect(videoUrl);
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Unauthorized") ? 401 : 500);
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
