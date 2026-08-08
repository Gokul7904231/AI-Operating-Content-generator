import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/auth/auth";
import { AnalyticsEngine } from "../../../../lib/analytics/analytics-engine";

export const dynamic = "force-dynamic";

/**
 * GET /api/analytics/summary
 * Returns AI provider latency comparisons, token accounting, render speed metrics, and storage utilization.
 */
export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const summary = AnalyticsEngine.getSummary();

    return NextResponse.json({
      success: true,
      tenantId: user.uid,
      summary,
      provenance: {
        source: "/api/analytics/summary",
        service: "AnalyticsEngine & SRE Performance Profiler",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}
