import { NextResponse } from "next/server";
import { EngineDiscovery } from "@/lib/core/EngineDiscovery";
import { WorkflowLoader } from "@/content-engines/_loader";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await EngineDiscovery.discoverAll();
    const discovered = EngineDiscovery.getDiscovered();
    const engines = discovered.map((id) => {
      const manifest = WorkflowLoader.getEngine(id);
      return {
        id,
        name: manifest?.name || id,
        description: manifest?.name ? `Custom execution engine for ${manifest.name}` : `Discovered engine ${id}`,
        version: manifest?.version || "1.0",
        renderProfile: manifest?.renderProfile || "FAST_QUIZ",
        category: "Content Engine",
        status: "active",
        totalRenders: 0,
        lastRun: "Never",
        avgScore: 0,
        retention: "72 hours",
        autoPublish: []
      };
    });
    return NextResponse.json({ success: true, engines });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, workflow, voice, prompt, sceneRules, category } = body;
    if (!name) {
      return NextResponse.json({ success: false, error: "Engine name is required" }, { status: 400 });
    }

    const id = name.trim().toLowerCase().replace(/\s+/g, "-");

    // Register engine dynamically with custom settings
    EngineDiscovery.registerDynamicEngine({
      id,
      name,
      version: "1.0",
      renderProfile: workflow === "fast-facts" ? "FAST_SHORTS" : "FAST_QUIZ",
      prompt,
      sceneRules,
      steps: [
        { id: "script", enabled: true, retry: 2 },
        { id: "critic", enabled: true, approvalRequired: false },
        { id: "scene", enabled: true },
        { id: "voice", enabled: true },
        { id: "image", enabled: true, timeout: 30000 },
        { id: "render", enabled: true },
        { id: "upload", enabled: true },
        { id: "publish", enabled: true }
      ]
    });

    return NextResponse.json({ success: true, id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "ID is required" }, { status: 400 });
    }
    EngineDiscovery.deleteDynamicEngine(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
