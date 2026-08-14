/**
 * GET /api/job-history
 *
 * Fetches all video rendering jobs from Firestore for the dashboard.
 * Supports limit and status query parameters.
 */
import { NextResponse } from "next/server";
import { db } from "../../../lib/firebase-admin";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit") ?? 50);
    const status = searchParams.get("status");

    let query: any = db.collection("videos");

    if (!isAdminUser(user.role)) {
      query = query.where("userId", "==", user.uid);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    query = query.orderBy("createdAt", "desc").limit(limit);

    const snapshot = await query.get();
    const jobs: any[] = [];

    snapshot.forEach((doc: any) => {
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
    const status = err.status || 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}
