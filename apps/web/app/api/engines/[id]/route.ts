import { NextResponse } from "next/server";
import { EngineDiscovery } from "@/lib/core/EngineDiscovery";
import { WorkflowLoader } from "@/content-engines/_loader";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let engineId = "unknown";
  try {
    // Ensure all engines are discovered and registered on the server side
    await EngineDiscovery.discoverAll();

    const { id } = await params;
    engineId = id;
    const manifest = WorkflowLoader.getEngine(engineId);

    if (!manifest) {
      return NextResponse.json(
        { success: false, error: `Content Engine "${engineId}" not found in registries.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      manifest,
    });
  } catch (err: any) {
    console.error(`[API /api/engines/${engineId}] Error:`, err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
