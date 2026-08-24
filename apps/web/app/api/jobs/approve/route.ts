export const dynamic = "force-dynamic";

/**
 * POST /api/jobs/approve
 * Body: { jobId: string, script?: string }
 *
 * Resumes a suspended workflow job that is currently in "waiting_approval" state.
 */
import { NextResponse } from "next/server";
import { WorkflowRuntime } from "../../../../content-engines/_runtime/workflow-runtime";
import { db } from "../../../../lib/firebase-admin";

import { verifySession, verifyWritePermission } from "../../../../lib/auth/auth";
import { isAdminUser } from "../../../../lib/auth/roles";

export async function POST(req: Request) {
  try {
    const { user } = await verifySession(req);
    verifyWritePermission(user);

    const body = await req.json();
    const { jobId, script } = body ?? {};

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId in body" }, { status: 400 });
    }

    const doc = await db.collection("videos").doc(jobId).get();
    if (!doc.exists) {
      return NextResponse.json({ error: `Job ${jobId} not found in Firestore` }, { status: 404 });
    }

    const jobData = doc.data();
    const jobOwnerId = jobData?.userId || jobData?.uid || jobData?.createdBy;

    // Enforce ownership check for non-admin callers
    if (!isAdminUser(user.role) && jobOwnerId && jobOwnerId !== user.uid) {
      return NextResponse.json({ error: "Forbidden: You do not own this job" }, { status: 403 });
    }

    let finalScript = script || jobData?.script;

    if (!finalScript) {
      return NextResponse.json({ error: "No script found for this approval request" }, { status: 400 });
    }

    // Resume execution asynchronously (runs steps 3-6 in the background)
    WorkflowRuntime.resumeApproval(jobId, finalScript).catch((err) => {
      console.error(`[ApproveAPI] Failed to resume job ${jobId}:`, err.message);
    });

    return NextResponse.json({ success: true, jobId, status: "resuming" });
  } catch (err: any) {
    console.error("[/api/jobs/approve]", err.message);
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Read-only access");
    const status = err.status || (isForbidden ? 403 : err.message?.includes("missing or expired") ? 401 : 500);
    return NextResponse.json({ error: err.message }, { status });
  }
}
