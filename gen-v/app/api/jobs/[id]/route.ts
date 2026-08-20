import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";
import { readJobManifest, saveJobManifest } from "@/lib/jobs-history";
import { releaseGenerationSlot } from "@/lib/quota/quota-service";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await verifySession(request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing job ID" }, { status: 400 });
    }

    const job = await readJobManifest(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // 🔒 Enforce User Data Isolation & Ownership Barrier
    const isOwner = job.userId === user.uid;
    const isAdmin = isAdminUser(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to access this job." },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Unauthorized") ? 401 : 500);
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { user } = await verifySession(request);
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ success: false, error: "Missing job ID" }, { status: 400 });
    }

    const job = await readJobManifest(id);
    if (!job) {
      return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });
    }

    // 🔒 Enforce Ownership
    const isOwner = job.userId === user.uid;
    const isAdmin = isAdminUser(user.role);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You do not have permission to cancel this job." },
        { status: 403 }
      );
    }

    if (job.status === "completed") {
      return NextResponse.json(
        { success: false, error: "Cannot cancel an already completed video render job." },
        { status: 400 }
      );
    }

    // Update job status to cancelled
    await saveJobManifest(id, {
      status: "failed",
      error: "Cancelled by user",
      cancelledAt: new Date().toISOString(),
    } as any);

    // Release quota reservation
    await releaseGenerationSlot(job.userId, id);

    return NextResponse.json({
      success: true,
      message: "Job cancelled and quota reservation released.",
    });
  } catch (err: any) {
    const status = err.status || (err.message?.includes("Unauthorized") ? 401 : 500);
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
