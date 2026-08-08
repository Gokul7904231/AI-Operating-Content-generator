import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/providers/local/discover
 * Dynamically scans local runtimes (Ollama, LM Studio) for installed models.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const endpoint = searchParams.get("endpoint") || "http://127.0.0.1:11434";
    const type = searchParams.get("type") || "ollama";

    const discoveredModels: Array<{ id: string; name: string; isLocal: boolean }> = [];

    if (type === "ollama") {
      const res = await fetch(`${endpoint}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          error: `Ollama returned status ${res.status}`,
          models: [],
        }, { status: 502 });
      }

      const data = await res.json();
      const models = data?.models || [];
      for (const m of models) {
        discoveredModels.push({
          id: `local/ollama/${m.name}`,
          name: `Ollama: ${m.name}`,
          isLocal: true,
        });
      }
    } else if (type === "lmstudio" || type === "openai-compatible") {
      const res = await fetch(`${endpoint}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          error: `Local OpenAI API returned status ${res.status}`,
          models: [],
        }, { status: 502 });
      }

      const data = await res.json();
      const models = data?.data || [];
      for (const m of models) {
        discoveredModels.push({
          id: `local/${type}/${m.id}`,
          name: `${type.toUpperCase()}: ${m.id}`,
          isLocal: true,
        });
      }
    }

    return NextResponse.json({
      success: true,
      endpoint,
      type,
      models: discoveredModels,
      count: discoveredModels.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "Failed to discover local models",
      models: [],
    }, { status: 500 });
  }
}
