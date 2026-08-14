import { NextRequest, NextResponse } from "next/server";
import { WorkerPoolRegistry } from "../../../../lib/rendering/WorkerPoolRegistry";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workerId, token, state, telemetry, activeJobId } = body;

    if (!workerId || !token) {
      return NextResponse.json({ success: false, error: "Missing workerId or token" }, { status: 400 });
    }

    const success = WorkerPoolRegistry.handleHeartbeat(workerId, token, state, telemetry, activeJobId);
    if (!success) {
      return NextResponse.json({ success: false, error: "Unauthorized or unregistered worker" }, { status: 401 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
