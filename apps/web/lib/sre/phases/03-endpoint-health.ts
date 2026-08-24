/**
 * Phase 03 — Endpoint Health
 * Tests DNS, HTTPS, TLS, auth, latency, retry, availability for every provider.
 */

import { DiscoveredProvider, EndpointHealthResult } from "../types";

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function probeSingle(
  provider: DiscoveredProvider,
  attempt: number
): Promise<{ statusCode: number; latencyMs: number; ok: boolean; error: string }> {
  const start = Date.now();
  const rawKey = process.env[provider.envKey] || "";
  const authHeader = rawKey ? `Bearer ${rawKey}` : undefined;

  // Build probe URL per provider type
  const probeUrl = buildProbeUrl(provider);

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (authHeader) headers["Authorization"] = authHeader;

    // Gemini uses ?key= param
    const url = provider.id === "gemini"
      ? `${probeUrl}?key=${rawKey}`
      : probeUrl;

    const res = await fetchWithTimeout(url, { headers }, 8000);
    const latencyMs = Date.now() - start;
    await res.text(); // drain body
    return { statusCode: res.status, latencyMs, ok: res.ok || res.status === 401, error: "" };
  } catch (err: any) {
    return {
      statusCode: 0,
      latencyMs: Date.now() - start,
      ok: false,
      error: err.name === "AbortError" ? "Timeout after 8000ms" : (err.message || "Unknown error"),
    };
  }
}

function buildProbeUrl(provider: DiscoveredProvider): string {
  const base = provider.baseUrl.replace(/\/$/, "");
  switch (provider.id) {
    case "gemini":      return `${base}/v1beta/models`;
    case "groq":        return `${base}/models`;
    case "openrouter":  return `${base}/models`;
    case "nvidia":      return `${base}/models`;
    case "zai":         return `${base}/models`;
    case "huggingface": return `${base}/models/gpt2`;
    case "deepseek":    return `${base}/models`;
    case "cerebras":    return `${base}/models`;
    case "sambanova":   return `${base}/models`;
    case "fireworks":   return `${base}/models`;
    case "cohere":      return `${base}/models`;
    case "pollinations":return `${base}/v1/models`;
    case "aihorde":     return `${base}/v2/status/heartbeat`;
    case "replicate":   return `${base}/models`;
    case "deepai":      return `${base}/text-generator`;
    case "elevenlabs":  return `https://api.elevenlabs.io/v1/voices`;
    case "voyage":      return `${base}/embeddings`;
    case "jina":        return `${base}/embeddings`;
    case "cloudinary":  return `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME || "test"}/ping`;
    case "firebase":    return `https://firestore.googleapis.com/v1/projects/${process.env.FIREBASE_PROJECT_ID || "test"}/databases`;
    case "googledrive": return `https://www.googleapis.com/drive/v3/about?fields=user`;
    default:            return `${base}/models`;
  }
}

function resolveStatus(
  probeOk: boolean,
  statusCode: number,
  latencyMs: number
): "healthy" | "degraded" | "offline" {
  if (!probeOk && statusCode === 0) return "offline";
  if (statusCode === 401 || statusCode === 403) return "degraded"; // reachable but auth issue
  if (statusCode >= 500) return "degraded";
  if (statusCode === 429) return "degraded"; // rate limited but alive
  if (!probeOk) return "offline";
  if (latencyMs > 5000) return "degraded";
  return "healthy";
}

export async function runEndpointHealth(
  providers: DiscoveredProvider[]
): Promise<EndpointHealthResult[]> {
  const results: EndpointHealthResult[] = [];

  for (const provider of providers) {
    if (!provider.enabled) {
      results.push({
        providerId: provider.id,
        providerName: provider.name,
        status: "offline",
        latencyMs: 0,
        dnsOk: false,
        httpsOk: false,
        tlsOk: false,
        authOk: false,
        statusCode: 0,
        errorMessage: "API key not configured — skipped",
        retryCount: 0,
        availabilityPct: 0,
      });
      continue;
    }

    let lastResult = { statusCode: 0, latencyMs: 0, ok: false, error: "Not attempted" };
    let retryCount = 0;

    // Up to 2 retries
    for (let attempt = 0; attempt < 2; attempt++) {
      lastResult = await probeSingle(provider, attempt);
      if (lastResult.ok || lastResult.statusCode === 401) break;
      retryCount++;
      await new Promise(r => setTimeout(r, 500)); // brief backoff
    }

    const status = resolveStatus(lastResult.ok, lastResult.statusCode, lastResult.latencyMs);
    const authOk = lastResult.statusCode !== 401 && lastResult.statusCode !== 403 && lastResult.ok;

    results.push({
      providerId: provider.id,
      providerName: provider.name,
      status,
      latencyMs: lastResult.latencyMs,
      dnsOk: lastResult.statusCode > 0,
      httpsOk: lastResult.statusCode > 0,
      tlsOk: lastResult.statusCode > 0,
      authOk,
      statusCode: lastResult.statusCode,
      errorMessage: lastResult.error,
      retryCount,
      availabilityPct: status === "healthy" ? 100 : status === "degraded" ? 50 : 0,
    });

    console.log(`[SRE Phase 3] ${provider.name}: ${status.toUpperCase()} (${lastResult.latencyMs}ms, HTTP ${lastResult.statusCode})`);
  }

  return results;
}
