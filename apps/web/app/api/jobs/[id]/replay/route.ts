import { NextRequest, NextResponse } from "next/server";
import { WorkflowRuntime } from "@/content-engines/_runtime/workflow-runtime";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const { searchParams } = new URL(req.url);
  const step = searchParams.get("step");

  if (!step) {
    return NextResponse.json(
      { success: false, error: "Query parameter 'step' is required." },
      { status: 400 }
    );
  }

  try {
    console.log(`[ReplayAPI] Triggering replay for job ${id} from step ${step}`);
    // Run asynchronously to not block the request context
    WorkflowRuntime.replay(id, step).catch((err) => {
      console.error(`[ReplayAPI] Async replay failed for job ${id}:`, err.message);
    });

    return NextResponse.json({
      success: true,
      message: `Replay scheduled successfully for job ${id} from step "${step}".`,
      jobId: id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
