import { NextResponse } from "next/server";
import { verifySession } from "../../../../lib/auth/auth";
import { EventCenter, EventSeverity, EventSource } from "../../../../lib/observability/event-center";

export const dynamic = "force-dynamic";

/**
 * GET /api/observability/events
 * Returns GitHub/Vercel style mission event logs and SRE runtime telemetry.
 * Server-enforces tenant authorization: normal users receive ONLY their own tenant events.
 */
export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const events = EventCenter.getEvents(user, { jobId, limit });
    const sreMetrics = EventCenter.getSREMetrics();

    return NextResponse.json({
      success: true,
      tenantId: user.uid,
      role: user.role,
      sreMetrics,
      events,
      count: events.length,
      provenance: {
        source: "/api/observability/events",
        service: "EventCenter & SRE Telemetry Engine",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}

/**
 * POST /api/observability/events
 * Records a new mission event into the event center.
 */
export async function POST(req: Request) {
  try {
    const { user } = await verifySession(req);
    const body = await req.json();
    const { type = "JOB_STARTED", severity = "INFO", source = "SYSTEM", message, jobId, requestId, metadata } = body;

    if (!message) {
      return NextResponse.json({ error: "Missing event message" }, { status: 400 });
    }

    const event = EventCenter.recordEvent({
      type,
      severity: severity as EventSeverity,
      source: source as EventSource,
      tenantId: user.uid,
      userId: user.uid,
      jobId,
      requestId,
      message,
      metadata,
    });

    return NextResponse.json({ success: true, event });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
