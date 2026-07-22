/**
 * GET /api/simulation/control
 * POST /api/simulation/control
 * Body: { paused?: boolean, speed?: number, injectFailure?: string }
 *
 * Controls the SRE chaos simulator registry.
 */
import { NextResponse } from "next/server";
import { SimulationRegistry } from "../../../../lib/simulation-state";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ success: true, state: SimulationRegistry.state });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    SimulationRegistry.update(body);
    return NextResponse.json({ success: true, state: SimulationRegistry.state });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
