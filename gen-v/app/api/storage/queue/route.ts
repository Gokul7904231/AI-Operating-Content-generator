/**
 * GET  /api/storage/queue         — queue stats
 * POST /api/storage/queue         — enqueue an upload job
 * DELETE /api/storage/queue?id=   — retry a dead-letter job
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { StorageQueue } from "../../../../storage/upload-queue";

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      stats: StorageQueue.getStats(),
      queue: StorageQueue.getQueue().map((j) => ({
        id: j.id,
        jobId: j.jobId,
        engine: j.engine,
        status: j.status,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        nextRetryAt: j.nextRetryAt,
        lastError: j.lastError,
        createdAt: new Date(j.createdAt).toISOString(),
      })),
      deadLetterQueue: StorageQueue.getDeadLetterQueue().map((j) => ({
        id: j.id,
        jobId: j.jobId,
        engine: j.engine,
        status: j.status,
        attempts: j.attempts,
        lastError: j.lastError,
        createdAt: new Date(j.createdAt).toISOString(),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, videoPath, engine, deleteAfterHours, assets, versions } = body ?? {};

    if (!jobId || !videoPath) {
      return NextResponse.json({ error: "Missing jobId or videoPath" }, { status: 400 });
    }

    const job = StorageQueue.enqueue({
      jobId: String(jobId),
      videoPath: String(videoPath),
      engine: engine ? String(engine) : undefined,
      deleteAfterHours: deleteAfterHours ? Number(deleteAfterHours) : undefined,
      assets,
      versions,
    });

    return NextResponse.json({ success: true, queueJobId: job.id, status: job.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const retried = StorageQueue.retryDead(id);
    if (!retried) {
      return NextResponse.json({ error: "Job not found in dead-letter queue" }, { status: 404 });
    }

    return NextResponse.json({ success: true, retried: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
