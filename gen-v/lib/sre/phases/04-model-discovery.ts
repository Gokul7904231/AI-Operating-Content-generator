/**
 * Phase 04 — Model Discovery
 * Fetches every available model from each live provider via API.
 * Records context window, capabilities, deprecation status.
 */

import fs from "fs";
import path from "path";
import { DiscoveredProvider, EndpointHealthResult, DiscoveredModel } from "../types";

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 10000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function getAuthHeader(provider: DiscoveredProvider): Record<string, string> {
  const key = process.env[provider.envKey] || "";
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function discoverGeminiModels(provider: DiscoveredProvider): Promise<DiscoveredModel[]> {
  const key = process.env["GEMINI_API_KEY"] || "";
  if (!key) return [];
  const res = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.models || []).map((m: any) => ({
    id: m.name?.replace("models/", "") || m.displayName,
    name: m.displayName || m.name,
    providerId: "gemini",
    providerName: "Google Gemini",
    contextWindow: m.inputTokenLimit || 1000000,
    supportsStreaming: true,
    supportsJsonMode: true,
    supportsFunctionCalling: true,
    supportsVision: m.supportedGenerationMethods?.includes("generateContent") ?? true,
    supportsEmbeddings: m.name?.includes("embed") ?? false,
    supportsImage: m.name?.includes("imagen") ?? false,
    supportsAudio: false,
    supportsVideo: m.inputTokenLimit > 100000,
    isDeprecated: m.name?.includes("001") || m.name?.includes("002") || false,
    isFree: true,
    costInputPer1M: 0.075,
    costOutputPer1M: 0.3,
    discoveredAt: new Date().toISOString(),
  }));
}

async function discoverOpenAICompatibleModels(
  provider: DiscoveredProvider,
  extraInfo: Partial<DiscoveredModel> = {}
): Promise<DiscoveredModel[]> {
  const key = process.env[provider.envKey] || "";
  if (!key) return [];
  const base = provider.baseUrl.replace(/\/$/, "");
  const url = provider.id === "gemini" ? `${base}/v1beta/models` : `${base}/models`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = "https://shortfactory.ai";
    headers["X-Title"] = "ShortFactory OS";
  }

  const res = await fetchWithTimeout(url, { headers });
  if (!res.ok) return [];
  const data = await res.json();
  const models = data.data || data.models || [];

  return models.slice(0, 50).map((m: any) => ({
    id: m.id || m.name,
    name: m.id || m.name,
    providerId: provider.id,
    providerName: provider.name,
    contextWindow: m.context_length || m.contextWindow || m.max_tokens || 8192,
    supportsStreaming: true,
    supportsJsonMode: provider.id !== "aihorde",
    supportsFunctionCalling: ["groq", "openrouter", "nvidia", "fireworks"].includes(provider.id),
    supportsVision: m.id?.includes("vision") || m.id?.includes("vl") || provider.id === "openrouter",
    supportsEmbeddings: m.id?.includes("embed") || false,
    supportsImage: provider.category === "image",
    supportsAudio: m.id?.includes("whisper") || false,
    supportsVideo: false,
    isDeprecated: m.id?.includes("deprecated") || m.deprecated || false,
    isFree: provider.id === "pollinations" || provider.id === "aihorde",
    costInputPer1M: m.pricing?.prompt ? parseFloat(m.pricing.prompt) * 1e6 : 0,
    costOutputPer1M: m.pricing?.completion ? parseFloat(m.pricing.completion) * 1e6 : 0,
    discoveredAt: new Date().toISOString(),
    ...extraInfo,
  }));
}

export async function runModelDiscovery(
  providers: DiscoveredProvider[],
  healthResults: EndpointHealthResult[]
): Promise<DiscoveredModel[]> {
  const allModels: DiscoveredModel[] = [];
  const healthMap = new Map(healthResults.map(h => [h.providerId, h]));

  for (const provider of providers) {
    const health = healthMap.get(provider.id);
    if (!health || health.status === "offline" || !provider.enabled) continue;

    console.log(`[SRE Phase 4] Discovering models from ${provider.name}...`);

    try {
      let models: DiscoveredModel[] = [];

      if (provider.id === "gemini") {
        models = await discoverGeminiModels(provider);
      } else {
        models = await discoverOpenAICompatibleModels(provider);
      }

      allModels.push(...models);
      console.log(`[SRE Phase 4] ${provider.name}: found ${models.length} models`);
    } catch (err: any) {
      console.warn(`[SRE Phase 4] ${provider.name} model discovery failed: ${err.message}`);
    }
  }

  // Also add known static models for providers without list endpoints
  const staticModels: DiscoveredModel[] = [
    { id: "glm-4.7-flash", name: "GLM-4.7 Flash", providerId: "zai", providerName: "Z.AI", contextWindow: 128000, supportsStreaming: true, supportsJsonMode: true, supportsFunctionCalling: true, supportsVision: true, supportsEmbeddings: false, supportsImage: false, supportsAudio: false, supportsVideo: false, isDeprecated: false, isFree: true, costInputPer1M: 0, costOutputPer1M: 0, discoveredAt: new Date().toISOString() },
    { id: "flux", name: "FLUX (Image)", providerId: "pollinations", providerName: "Pollinations AI", contextWindow: 0, supportsStreaming: false, supportsJsonMode: false, supportsFunctionCalling: false, supportsVision: false, supportsEmbeddings: false, supportsImage: true, supportsAudio: false, supportsVideo: false, isDeprecated: false, isFree: true, costInputPer1M: 0, costOutputPer1M: 0, discoveredAt: new Date().toISOString() },
  ];

  for (const sm of staticModels) {
    if (!allModels.find(m => m.id === sm.id && m.providerId === sm.providerId)) {
      allModels.push(sm);
    }
  }

  // Save to disk
  const outPath = path.resolve(process.cwd(), "data", "sre-models.json");
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(allModels, null, 2));
  } catch {}

  console.log(`[SRE Phase 4] Total models discovered: ${allModels.length}`);
  return allModels;
}
