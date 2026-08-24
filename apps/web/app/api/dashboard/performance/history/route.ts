import { NextResponse } from "next/server";
import { CheckpointDB } from "@/lib/core/CheckpointDB";

export async function GET() {
  try {
    const events = CheckpointDB.getEvents(""); // Fetch all events
    
    // Group events by hour over the last 24 hours
    const hourlyStats: Record<string, { hour: string; count: number; failures: number; avgLatency: number; sumLatency: number }> = {};
    const now = Date.now();

    for (const ev of events) {
      const ts = ev.timestamp ? new Date(ev.timestamp).getTime() : now;
      if (now - ts > 86400000) continue; // Only last 24h

      const hourString = new Date(ts).toISOString().slice(0, 13) + ":00:00Z";
      if (!hourlyStats[hourString]) {
        hourlyStats[hourString] = { hour: hourString, count: 0, failures: 0, avgLatency: 0, sumLatency: 0 };
      }

      if (ev.event_type === "workflow.started") {
        hourlyStats[hourString].count++;
      } else if (ev.event_type === "workflow.failed") {
        hourlyStats[hourString].failures++;
      } else if (ev.event_type === "workflow.completed") {
        try {
          const payload = JSON.parse(ev.payload);
          if (payload.durationMs) {
            hourlyStats[hourString].sumLatency += payload.durationMs;
          }
        } catch {}
      }
    }

    const history = Object.values(hourlyStats).map((s) => {
      const completedCount = s.count - s.failures;
      return {
        hour: s.hour,
        startedCount: s.count,
        failedCount: s.failures,
        avgLatencyMs: completedCount > 0 ? Math.round(s.sumLatency / completedCount) : 0,
      };
    }).sort((a, b) => a.hour.localeCompare(b.hour));

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
