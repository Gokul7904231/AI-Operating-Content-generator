import { NextResponse } from "next/server";
import { MetricsRegistry } from "@/lib/core/MetricsRegistry";
import { CheckpointDB } from "@/lib/core/CheckpointDB";

export async function GET() {
  try {
    const registryMetrics = await MetricsRegistry.metrics();

    // Query events to calculate percentiles (P50, P95, P99)
    const events = CheckpointDB.getEvents(""); // Fetch all events across jobs
    const durations = events
      .filter((e) => e.event_type === "step.completed")
      .map((e) => {
        try {
          const payload = JSON.parse(e.payload);
          return payload.duration || 0;
        } catch {
          return 0;
        }
      })
      .filter((d) => d > 0)
      .sort((a, b) => a - b);

    const getPercentile = (arr: number[], percentile: number): number => {
      if (arr.length === 0) return 0;
      const index = Math.ceil((percentile / 100) * arr.length) - 1;
      return arr[index];
    };

    const p50 = getPercentile(durations, 50);
    const p95 = getPercentile(durations, 95);
    const p99 = getPercentile(durations, 99);

    const totalJobsCount = events.filter((e) => e.event_type === "workflow.started").length;
    const completedJobsCount = events.filter((e) => e.event_type === "workflow.completed").length;
    const failedJobsCount = events.filter((e) => e.event_type === "workflow.failed").length;

    const successRate = totalJobsCount > 0 ? (completedJobsCount / totalJobsCount) * 100 : 100;
    const failureRate = totalJobsCount > 0 ? (failedJobsCount / totalJobsCount) * 100 : 0;

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      metrics: {
        ...registryMetrics,
        latencyPercentiles: {
          p50,
          p95,
          p99,
          samples: durations.length,
        },
        jobs: {
          total: totalJobsCount,
          completed: completedJobsCount,
          failed: failedJobsCount,
          successRate: Math.round(successRate),
          failureRate: Math.round(failureRate),
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
