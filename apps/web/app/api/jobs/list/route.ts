/**
 * GET /api/jobs/list
 *
 * Returns a list of recent job runs from Firestore with their telemetry data
 * for the Render Profiler Dashboard.
 *
 * Query params:
 *   limit (default: 20) — number of jobs to fetch
 *   status — filter by status (completed, failed, processing)
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/firebase-admin";
import { verifySession } from "@/lib/auth/auth";
import { isAdminUser } from "@/lib/auth/roles";

export async function GET(request: Request) {
  try {
    const { user } = await verifySession(request);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
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
    const jobs = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        jobId: data.jobId ?? doc.id,
        topic: data.topic ?? "Unknown",
        status: data.status ?? "unknown",
        renderDurationSeconds: data.renderDurationSeconds ?? 0,
        telemetry: data.telemetry ?? {},
        createdAt: data.createdAt ?? new Date().toISOString(),
        capabilities: data.capabilities ?? null,
      };
    });

    return NextResponse.json({ success: true, jobs, total: jobs.length });
  } catch (err: any) {
    console.error("[API /jobs/list] Error fetching jobs:", err.message);
    const status = err.status || 401;
    return NextResponse.json({ success: false, jobs: [], error: err.message }, { status });
  }
}
