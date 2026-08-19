import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { ApiConfigManager } from "@/lib/api-config/api-config-manager";

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 🔐 Must be logged in (ADMIN or EDITOR)
    await verifyAuthAndRole(request);

    const body = await request.json();
    const { providerId, apiKey: rawKey, baseUrl: overrideUrl, mode, localType } = body;

    if (!providerId) {
      return NextResponse.json({ success: false, error: "Missing required parameter: providerId" }, { status: 400 });
    }

    // Resolve credentials if raw key not provided
    const resolved = await ApiConfigManager.resolveProvider(providerId);
    const keyToUse = rawKey && rawKey.trim() !== "" ? rawKey.trim() : resolved.apiKey;
    const urlToUse = overrideUrl && overrideUrl.trim() !== "" ? overrideUrl.trim() : resolved.endpoint;
    const isLocal = mode === "local" || resolved.isLocal;

    // 1. Local AI Connection Test (Ollama / LM Studio / Local OpenAI)
    if (isLocal) {
      const pingUrl = localType === "ollama" 
        ? `${urlToUse.replace(/\/$/, "")}/api/tags` 
        : `${urlToUse.replace(/\/$/, "")}/models`;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(pingUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startTime;

        if (res.ok || res.status === 401 || res.status === 404) {
          return NextResponse.json({
            success: true,
            latencyMs,
            message: `Local AI service at ${urlToUse} is reachable.`,
          });
        }

        return NextResponse.json({
          success: false,
          error: `Local service returned HTTP ${res.status}`,
        });
      } catch (err: any) {
        return NextResponse.json({
          success: false,
          error: `Could not connect to local AI endpoint at ${urlToUse}. Ensure the local server is running.`,
        });
      }
    }

    // 2. Cloud API Connection Test
    if (!keyToUse) {
      return NextResponse.json({
        success: false,
        error: "API key is required for cloud provider test.",
      });
    }

    // Provider-specific lightweight health check
    let testUrl = `${urlToUse.replace(/\/$/, "")}/models`;
    let headers: Record<string, string> = {
      "Authorization": `Bearer ${keyToUse}`,
    };

    if (providerId === "gemini") {
      testUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${keyToUse}`;
      headers = {};
    } else if (providerId === "elevenlabs") {
      testUrl = "https://api.elevenlabs.io/v1/voices";
      headers = { "xi-api-key": keyToUse };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(testUrl, { headers, signal: controller.signal });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        return NextResponse.json({
          success: true,
          latencyMs,
          message: `Connection successful (${latencyMs}ms).`,
        });
      }

      const statusText = res.status === 401 ? "Invalid API Key" : res.status === 429 ? "Rate Limit Exceeded" : `HTTP ${res.status}`;

      return NextResponse.json({
        success: false,
        error: `Connection test failed: ${statusText}`,
      });
    } catch (err: any) {
      return NextResponse.json({
        success: false,
        error: "Connection test timed out or failed to reach host endpoint.",
      });
    }
  } catch (err: any) {
    console.error("[API /settings/api/test POST] Error:", err.message);
    return NextResponse.json({
      success: false,
      error: "Authorization failed or invalid request payload.",
    }, { status: 400 });
  }
}
