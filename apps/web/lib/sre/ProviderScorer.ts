/**
 * Provider Scorer + Capability Registry + Marketplace Builder
 * Converts raw audit data into scored providers, capability routes, and marketplace models.
 */

import {
  DiscoveredProvider, EndpointHealthResult, FunctionalTestResult,
  ModelBenchmark, RateLimitInfo, DiscoveredModel, CapabilityTestResult,
  ProviderScore, CapabilityRoute, MarketplaceModel, CapabilityName
} from "./types";

// ─── Provider Scorer ──────────────────────────────────────────────────────────

function gradeFromScore(score: number): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

const PROVIDER_USE_CASES: Record<string, string[]> = {
  gemini:      ["scripting", "reasoning", "vision", "long-context"],
  groq:        ["speed", "real-time", "coding"],
  openrouter:  ["model-diversity", "fallback", "claude-access"],
  nvidia:      ["high-performance", "open-source-models"],
  zai:         ["coding", "json", "free-tier"],
  deepseek:    ["reasoning", "coding"],
  cerebras:    ["ultra-fast", "inference"],
  sambanova:   ["enterprise", "private"],
  fireworks:   ["high-throughput", "open-source"],
  cohere:      ["embeddings", "reranking"],
  pollinations:["image-generation", "free-tier"],
  aihorde:     ["image-generation", "community"],
  replicate:   ["image-generation", "fine-tuning"],
  deepai:      ["image-generation", "affordable"],
  elevenlabs:  ["tts", "voice-cloning"],
  voyage:      ["embeddings", "high-quality"],
  jina:        ["embeddings", "multimodal"],
  cloudinary:  ["cdn", "image-optimization"],
  firebase:    ["storage", "realtime"],
  googledrive: ["file-storage", "oauth"],
};

const PROVIDER_RECOMMENDATIONS: Record<string, string> = {
  gemini:      "Primary LLM for scripting & reasoning — best context window",
  groq:        "Use for latency-critical tasks — fastest inference available",
  openrouter:  "Use as universal fallback — access to 200+ models",
  nvidia:      "Use for enterprise-grade open-source models",
  zai:         "Best free coding & JSON model — GLM-4.7-Flash",
  deepseek:    "Excellent for coding & technical reasoning",
  cerebras:    "Ultra-low latency for real-time applications",
  pollinations:"Primary free image generation",
  elevenlabs:  "Primary TTS for high-quality narration",
  voyage:      "Best embedding quality for RAG pipelines",
};

export function buildProviderScores(
  providers: DiscoveredProvider[],
  healthResults: EndpointHealthResult[],
  functionalTests: FunctionalTestResult[],
  benchmarks: ModelBenchmark[],
  rateLimits: RateLimitInfo[]
): ProviderScore[] {
  const healthMap = new Map(healthResults.map(h => [h.providerId, h]));
  const rateMap = new Map(rateLimits.map(r => [r.providerId, r]));
  const scores: ProviderScore[] = [];

  for (const provider of providers) {
    const health = healthMap.get(provider.id);
    const rate = rateMap.get(provider.id);
    const provBench = benchmarks.filter(b => b.providerId === provider.id);
    const provTests = functionalTests.filter(t => t.providerId === provider.id);

    // Health score (0-100)
    const healthScore =
      !health ? 0 :
      health.status === "healthy" ? 100 :
      health.status === "degraded" ? 50 : 0;

    // Latency score (0-100): <300ms=100, <1s=80, <3s=50, <5s=20, >=5s=0
    const avgLat = provBench[0]?.avgLatencyMs || health?.latencyMs || 9999;
    const latencyScore =
      avgLat < 300 ? 100 :
      avgLat < 1000 ? 80 :
      avgLat < 2000 ? 65 :
      avgLat < 3000 ? 50 :
      avgLat < 5000 ? 25 : 0;

    // Availability score: based on success rate
    const successRate = provBench[0]?.successRate ?? (health?.status === "healthy" ? 1.0 : 0.0);
    const availabilityScore = Math.round(successRate * 100);

    // Quota score
    const quotaScore = !rate ? 80 : rate.remaining < 0 ? 100 : Math.min(100, Math.round((rate.remaining / Math.max(rate.inferredRpm, 1)) * 100));

    // Capability score: % of functional tests passed
    const passRate = provTests.length > 0
      ? provTests.filter(t => t.status === "pass").length / provTests.length
      : (health?.status === "healthy" ? 0.7 : 0);
    const capabilityScore = Math.round(passRate * 100);

    // Reliability: based on retry/failure rates
    const retryRate = provBench[0] ? provBench[0].retryCount / provBench[0].requestCount : 0;
    const reliabilityScore = Math.round((1 - retryRate) * 100);

    const overallScore = Math.round(
      healthScore * 0.25 +
      latencyScore * 0.20 +
      availabilityScore * 0.20 +
      quotaScore * 0.10 +
      capabilityScore * 0.15 +
      reliabilityScore * 0.10
    );

    scores.push({
      providerId: provider.id,
      providerName: provider.name,
      overallScore,
      healthScore,
      latencyScore,
      availabilityScore,
      quotaScore,
      capabilityScore,
      reliabilityScore,
      grade: gradeFromScore(overallScore),
      recommendation: PROVIDER_RECOMMENDATIONS[provider.id] || `${provider.name} — ${provider.category} provider`,
      bestFor: PROVIDER_USE_CASES[provider.id] || [],
    });
  }

  return scores.sort((a, b) => b.overallScore - a.overallScore);
}

// ─── Capability Registry ──────────────────────────────────────────────────────

const CAPABILITY_FALLBACKS: Record<CapabilityName, Array<{ modelId: string; providerId: string }>> = {
  TEXT:             [{ modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }, { modelId: "glm-4.7-flash", providerId: "zai" }, { modelId: "meta-llama/llama-3.1-8b-instruct", providerId: "openrouter" }],
  JSON:             [{ modelId: "glm-4.7-flash", providerId: "zai" }, { modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }],
  REASONING:        [{ modelId: "gemini-2.5-flash", providerId: "gemini" }, { modelId: "glm-4.7-flash", providerId: "zai" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }],
  CODE:             [{ modelId: "glm-4.7-flash", providerId: "zai" }, { modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }],
  STREAMING:        [{ modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }],
  VISION:           [{ modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "meta-llama/llama-3.2-90b-vision-instruct", providerId: "openrouter" }],
  IMAGE:            [{ modelId: "flux", providerId: "pollinations" }, { modelId: "stable-diffusion", providerId: "aihorde" }, { modelId: "stable-diffusion", providerId: "replicate" }],
  EMBEDDING:        [{ modelId: "voyage-3-lite", providerId: "voyage" }, { modelId: "jina-embeddings-v3", providerId: "jina" }, { modelId: "text-embedding-004", providerId: "gemini" }],
  TTS:              [{ modelId: "eleven_multilingual_v2", providerId: "elevenlabs" }],
  OCR:              [{ modelId: "gemini-1.5-flash", providerId: "gemini" }],
  FUNCTION_CALLING: [{ modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "llama-3.3-70b-versatile", providerId: "groq" }],
  LONG_CONTEXT:     [{ modelId: "gemini-1.5-flash", providerId: "gemini" }, { modelId: "glm-4.7-flash", providerId: "zai" }],
};

export function buildCapabilityRoutes(
  capabilityTests: CapabilityTestResult[],
  models: DiscoveredModel[],
  rateLimits: RateLimitInfo[]
): CapabilityRoute[] {
  const routes: CapabilityRoute[] = [];
  const allCaps = Object.keys(CAPABILITY_FALLBACKS) as CapabilityName[];
  const rateMap = new Map(rateLimits.map(r => [r.providerId, r]));

  for (const cap of allCaps) {
    const staticFallbacks = CAPABILITY_FALLBACKS[cap];

    // Find best performer from actual test results
    const testedPassed = capabilityTests
      .filter(t => t.capability === cap && t.status === "pass")
      .sort((a, b) => a.latencyMs - b.latencyMs);

    const primary = testedPassed[0] || staticFallbacks[0];

    const fallbackChain = staticFallbacks.map((fb, i) => {
      const tested = testedPassed.find(t => t.modelId === fb.modelId && t.providerId === fb.providerId);
      const rate = rateMap.get(fb.providerId);
      return {
        modelId: fb.modelId,
        providerId: fb.providerId,
        score: tested ? Math.round((1 - tested.latencyMs / 5000) * 80 + (rate?.remaining || 100) * 0.1) : 50 - i * 10,
      };
    }).sort((a, b) => b.score - a.score);

    routes.push({
      capability: cap,
      primaryModel: primary?.modelId || staticFallbacks[0]?.modelId,
      primaryProvider: primary?.providerId || staticFallbacks[0]?.providerId,
      fallbackChain,
      confidence: testedPassed.length > 0 ? Math.min(100, testedPassed.length * 25) : 60,
    });
  }

  return routes;
}

// ─── Marketplace Builder ──────────────────────────────────────────────────────

const MODEL_BADGES: Record<string, "fastest" | "cheapest" | "best-reasoning" | "best-coding" | "best-json" | "best-vision"> = {
  "llama-3.3-70b-versatile": "fastest",
  "glm-4.7-flash": "best-coding",
  "gemini-2.5-flash": "best-reasoning",
  "gemini-1.5-flash": "best-vision",
  "flux": "cheapest",
};

export function buildMarketplaceModels(
  models: DiscoveredModel[],
  benchmarks: ModelBenchmark[],
  capabilityTests: CapabilityTestResult[]
): MarketplaceModel[] {
  const benchMap = new Map(benchmarks.map(b => [`${b.providerId}/${b.modelId}`, b]));

  return models.slice(0, 100).map(m => {
    const bench = benchMap.get(`${m.providerId}/${m.id}`);
    const caps = capabilityTests.filter(t => t.modelId === m.id && t.status === "pass").map(t => t.capability);

    const capabilities: CapabilityName[] = [...new Set([
      ...(m.supportsEmbeddings ? ["EMBEDDING" as CapabilityName] : []),
      ...(m.supportsVision ? ["VISION" as CapabilityName] : []),
      ...(m.supportsImage ? ["IMAGE" as CapabilityName] : []),
      ...(m.supportsAudio ? ["TTS" as CapabilityName] : []),
      ...(!m.supportsImage ? ["TEXT" as CapabilityName, "STREAMING" as CapabilityName] : []),
      ...caps,
    ])];

    const score = Math.round(
      (bench?.successRate || 0.8) * 40 +
      (1 - Math.min(bench?.avgLatencyMs || 1000, 5000) / 5000) * 30 +
      (!m.isDeprecated ? 20 : 0) +
      (m.isFree ? 10 : 0)
    );

    return {
      id: m.id,
      name: m.name || m.id,
      providerId: m.providerId,
      providerName: m.providerName,
      capabilities,
      contextWindow: m.contextWindow,
      latencyMs: bench?.avgLatencyMs || 0,
      successRate: bench?.successRate || 0.9,
      costPer1MTokens: m.costInputPer1M + m.costOutputPer1M,
      isFree: m.isFree,
      health: (m.isDeprecated ? "offline" : bench ? (bench.successRate > 0.9 ? "healthy" : "degraded") : "healthy") as "healthy" | "degraded" | "offline",
      score,
      recommendedFor: (PROVIDER_USE_CASES[m.providerId] || []).slice(0, 3),
      badge: MODEL_BADGES[m.id],
    };
  }).sort((a, b) => b.score - a.score);
}
