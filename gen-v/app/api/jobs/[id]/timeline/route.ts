import { NextRequest, NextResponse } from "next/server";
import { CheckpointDB } from "@/lib/core/CheckpointDB";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  try {
    const checkpoint = CheckpointDB.getCheckpoint(id);
    const events = CheckpointDB.getEvents(id);

    if (!checkpoint && events.length === 0) {
      return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
    }

    // Parse events into step timeline entries
    const stepMap: Record<string, { step: string; status: string; startedAt: string; finishedAt?: string; durationMs?: number; error?: string }> = {};

    for (const ev of events) {
      let payload: any = {};
      try { payload = JSON.parse(ev.payload); } catch {}

      const stepId = payload.stepId as string | undefined;
      const ts = ev.timestamp ?? new Date().toISOString();

      if (!stepId) continue;

      if (ev.event_type === "step.started") {
        stepMap[stepId] = { step: stepId, status: "running", startedAt: ts };
      } else if (ev.event_type === "step.completed" && stepMap[stepId]) {
        stepMap[stepId].finishedAt = ts;
        stepMap[stepId].status = "completed";
        stepMap[stepId].durationMs = payload.duration as number | undefined;
      } else if (ev.event_type === "step.failed" && stepMap[stepId]) {
        stepMap[stepId].finishedAt = ts;
        stepMap[stepId].status = "failed";
        stepMap[stepId].error = payload.error;
      } else if (ev.event_type === "step.suspended" && stepMap[stepId]) {
        stepMap[stepId].finishedAt = ts;
        stepMap[stepId].status = "suspended";
      }
    }

    // Enrich with raw step event log
    const raw = events.map((e) => ({
      id: e.id,
      type: e.event_type,
      payload: JSON.parse(e.payload ?? "{}"),
      timestamp: e.timestamp,
    }));

    return NextResponse.json({
      success: true,
      jobId: id,
      checkpoint: checkpoint ? {
        currentStep: checkpoint.current_step,
        status: checkpoint.status,
        updatedAt: checkpoint.updated_at,
      } : null,
      steps: Object.values(stepMap),
      events: raw,
    });
  } catch (err: any) {
    console.error("[TimelineAPI] Error:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
