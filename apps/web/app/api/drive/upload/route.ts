/**
 * POST /api/drive/upload
 * Body: { jobId: string, videoPath: string, engine?: string, deleteAfterHours?: number }
 *
 * Triggers a Drive upload for a rendered video file.
 */
import { NextResponse } from "next/server";
import { uploadAgent } from "../../../../agents/upload-agent";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, videoPath, engine, deleteAfterHours } = body ?? {};

    if (!jobId || !videoPath) {
      return NextResponse.json(
        { error: "Missing required fields: jobId, videoPath" },
        { status: 400 }
      );
    }

    const result = await uploadAgent({
      jobId: String(jobId),
      videoPath: String(videoPath),
      engine: engine ? String(engine) : undefined,
      deleteAfterHours: deleteAfterHours ? Number(deleteAfterHours) : undefined,
    });

    if (result.status === "failed") {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    console.error("[/api/drive/upload]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
