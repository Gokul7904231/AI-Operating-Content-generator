import { NextRequest, NextResponse } from "next/server";
import { WorkerPoolRegistry } from "../../../../lib/rendering/WorkerPoolRegistry";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workerId: string }> }
) {
  try {
    const { workerId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "revoke") {
      const removed = WorkerPoolRegistry.unregisterWorker(workerId);
      if (!removed) {
        return NextResponse.json({ success: false, error: "Worker not found or already revoked" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: `Worker ${workerId} revoked successfully.` });
    }

    return NextResponse.json({ success: false, error: `Invalid action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
