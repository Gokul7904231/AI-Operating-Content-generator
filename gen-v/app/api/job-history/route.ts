/**
 * GET /api/job-history
 *
 * Fetches all video rendering jobs from Firestore for the dashboard.
 * Supports limit and status query parameters.
 */
import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const status = searchParams.get("status");

    let query = db.collection("videos").orderBy("createdAt", "desc").limit(limit);

    if (status) {
      query = query.where("status", "==", status);
    }

    const snapshot = await query.get();
    const jobs: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      jobs.push({
        id: doc.id,
        jobId: doc.id,
        ...data,
      });
    });

    return NextResponse.json({ success: true, jobs });
  } catch (err: any) {
    console.error("[/api/job-history]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
