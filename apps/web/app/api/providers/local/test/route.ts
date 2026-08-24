import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * POST /api/providers/local/test
 * Verifies endpoint reachability, runtime health, and model availability.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { endpoint = "http://127.0.0.1:11434", type = "ollama", model } = body;

    // SSRF Validation: Disallow cloud metadata endpoints
    if (endpoint.includes("169.254.169.254") || endpoint.includes("metadata.google.internal")) {
      return NextResponse.json({
        success: false,
        status: "unauthorized",
        error: "SSRF Protection: Intranet metadata endpoints forbidden",
      }, { status: 400 });
    }

    const startTime = Date.now();

    if (type === "ollama") {
      // 1. Connectivity test
      const res = await fetch(`${endpoint}/api/tags`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      }).catch((err) => {
        throw new Error(`Ollama offline: ${err.message}`);
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: "offline",
          error: `Ollama service unreachable (HTTP ${res.status})`,
        });
      }

      const data = await res.json();
      const models: any[] = data?.models || [];

      // 2. Model availability test
      if (model) {
        const cleanModelName = model.replace("local/ollama/", "");
        const exists = models.some((m) => m.name === cleanModelName || m.name.startsWith(cleanModelName));

        if (!exists) {
          return NextResponse.json({
            success: false,
            status: "model_unavailable",
            error: `Ollama is reachable, but model "${cleanModelName}" was not found in installed models list`,
          });
        }
      }

      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        status: "connected",
        endpoint,
        type,
        model: model || (models[0]?.name ?? "unknown"),
        latencyMs,
        provenance: {
          source: `${endpoint}/api/tags`,
          measuredAt: new Date().toISOString(),
        },
      });
    } else if (type === "lmstudio" || type === "openai-compatible") {
      const res = await fetch(`${endpoint}/v1/models`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      }).catch((err) => {
        throw new Error(`Local OpenAI API offline: ${err.message}`);
      });

      if (!res.ok) {
        return NextResponse.json({
          success: false,
          status: "offline",
          error: `Local OpenAI service unreachable (HTTP ${res.status})`,
        });
      }

      const latencyMs = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        status: "connected",
        endpoint,
        type,
        latencyMs,
        provenance: {
          source: `${endpoint}/v1/models`,
          measuredAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: false,
      status: "unknown",
      error: `Unsupported local runtime type: ${type}`,
    }, { status: 400 });
  } catch (err: any) {
    const isTimeout = err.message?.includes("timeout");
    return NextResponse.json({
      success: false,
      status: isTimeout ? "timeout" : "offline",
      error: err.message || "Connection test failed",
    });
  }
}
