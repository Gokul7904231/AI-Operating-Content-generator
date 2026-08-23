import { NextResponse } from "next/server";
import { EngineRegistry } from "@/lib/core/EngineRegistry";
import { verifySession } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    let userContext: { uid?: string; role?: string } = { role: "USER" };

    try {
      const { user } = await verifySession(req);
      if (user) {
        userContext = { uid: user.uid, role: user.role };
      }
    } catch {}

    const engines = await EngineRegistry.listAvailableEngines(userContext);

    return NextResponse.json({
      success: true,
      engines: engines.map((e) => ({
        engineId: e.engineId,
        name: e.name,
        description: e.description,
        category: e.category,
        isDefault: e.isDefault ?? false,
        capabilities: e.capabilities,
        defaults: e.defaults,
        renderProfile: e.generationConfig.renderProfile,
      })),
    });
  } catch (err: any) {
    console.error("[API /api/engines/available Error]:", err.message);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch available engines." },
      { status: 500 }
    );
  }
}
