import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { TempManager } from "@/lib/core/TempManager";

function getVideoPath(jobId: string) {
  const root = process.cwd();
  
  // Check our standard dynamic workflow engine output location first!
  const tempPath = path.join(TempManager.getTempDir(jobId), "final_video.mp4");
  if (fs.existsSync(tempPath)) return tempPath;

  // Use Turbopack ignore comments to prevent bundling these dynamic paths
  const baseDir1 = path.join(/*turbopackIgnore: true*/ root, "generated", "local-ai", "output", jobId);
  const baseDir2 = path.join(/*turbopackIgnore: true*/ root, "local-ai", "output", jobId);

  const checkDirs = [baseDir1, baseDir2];

  for (const baseDir of checkDirs) {
    const finalMp4 = path.join(/*turbopackIgnore: true*/ baseDir, "final.mp4");
    if (fs.existsSync(finalMp4)) return finalMp4;

    // Fallback (older scaffold may not have generated final.mp4)
    const possible = ["final/final.mp4", "outputs/final/final.mp4", "output/final.mp4"];
    for (const rel of possible) {
      const p = path.join(/*turbopackIgnore: true*/ baseDir, rel);
      if (fs.existsSync(p)) return p;
    }
  }

  // default fallback path
  return tempPath;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const videoPath = getVideoPath(jobId);
  if (!fs.existsSync(videoPath)) {
    return NextResponse.json(
      { error: "Video not found", jobId },
      { status: 404 }
    );
  }

  const stat = fs.statSync(videoPath);
  const contentType = "video/mp4";

  const range = _req.headers.get("range");
  if (!range) {
    const fileStream = fs.createReadStream(videoPath);
    return new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(stat.size),
        "Content-Disposition": "inline",
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    });
  }

  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;

  if (start >= stat.size || end >= stat.size) {
    return new NextResponse(null, {
      status: 416,
      headers: {
        "Content-Range": `bytes */${stat.size}`,
      },
    });
  }

  const chunksize = (end - start) + 1;
  const fileStream = fs.createReadStream(videoPath, { start, end });

  return new NextResponse(fileStream as any, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunksize),
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "no-cache",
    },
  });
}

