/**
 * POST /api/jobs/approve
 * Body: { jobId: string, script?: string }
 *
 * Resumes a suspended workflow job that is currently in "waiting_approval" state.
 */
import { NextResponse } from "next/server";
import { WorkflowRuntime } from "../../../../content-engines/_runtime/workflow-runtime";
import { db } from "../../../../lib/firebase-admin";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { jobId, script } = body ?? {};

    if (!jobId) {
      return NextResponse.json({ error: "Missing jobId in body" }, { status: 400 });
    }

    // Read the script from Firestore if not explicitly overridden in body
    let finalScript = script;
    if (!finalScript) {
      const doc = await db.collection("videos").doc(jobId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: `Job ${jobId} not found in Firestore` }, { status: 404 });
      }
      finalScript = doc.data()?.script;
    }

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
