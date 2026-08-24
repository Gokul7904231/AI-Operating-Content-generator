/**
 * Phase 18 — AI Doctor Provider Cards
 * Generates per-provider DoctorProviderCard with capability results,
 * latency, quota, error frequency, fallback chain, and score.
 */

import {
  DiscoveredProvider, EndpointHealthResult, FunctionalTestResult,
  ModelBenchmark, RateLimitInfo, DoctorProviderCard, CapabilityName, AuditStatus
} from "../types";

const CAPABILITY_NAMES: CapabilityName[] = [
  "TEXT", "JSON", "REASONING", "CODE", "STREAMING",
  "VISION", "IMAGE", "EMBEDDING", "TTS", "FUNCTION_CALLING"
];

const FALLBACK_CHAIN: Record<string, string> = {
  gemini:      "groq",
  groq:        "zai",
  zai:         "openrouter",
  openrouter:  "huggingface",
  huggingface: "none",
  pollinations:"aihorde",
  aihorde:     "replicate",
};

const SUGGESTED_REPLACEMENT: Record<string, string> = {
  gemini:      "Use GLM-4.7-Flash via Z.AI for free alternative",
  groq:        "Use Cerebras for similar ultra-fast inference",
  openrouter:  "Use Groq directly for lower latency",
  nvidia:      "Use Groq for comparable open-source models",
  zai:         "Use Groq as primary fallback",
  elevenlabs:  "Use Edge-TTS for free TTS alternative",
  pollinations:"Use AI Horde for free image generation",
};

function calcProviderScore(
  health: EndpointHealthResult | undefined,
  benchmarks: ModelBenchmark[],
  functionalTests: FunctionalTestResult[],
  rateLimits: RateLimitInfo | undefined,
): number {
  let score = 0;

  // Health (30 pts)
  if (!health) return 0;
  if (health.status === "healthy") score += 30;
  else if (health.status === "degraded") score += 15;

  // Latency (25 pts)
  const avgLatency = benchmarks[0]?.avgLatencyMs || health.latencyMs;
  if (avgLatency < 500) score += 25;
  else if (avgLatency < 1500) score += 20;
  else if (avgLatency < 3000) score += 12;
  else if (avgLatency < 5000) score += 5;

  // Functional tests (30 pts)
  const provTests = functionalTests.filter(t => t.providerId === health.providerId);
  const passRate = provTests.length > 0 ? provTests.filter(t => t.status === "pass").length / provTests.length : 0;
  score += Math.round(passRate * 30);

  // Rate limits (15 pts)
  if (!rateLimits || rateLimits.remaining === -1) score += 10;
  else if (rateLimits.remaining > 500) score += 15;
  else if (rateLimits.remaining > 100) score += 10;
  else if (rateLimits.remaining > 10) score += 5;

  return Math.min(100, score);
}

export function buildDoctorCards(
  providers: DiscoveredProvider[],
  healthResults: EndpointHealthResult[],
  functionalTests: FunctionalTestResult[],
  benchmarks: ModelBenchmark[],
  rateLimits: RateLimitInfo[]
): DoctorProviderCard[] {
  const cards: DoctorProviderCard[] = [];
  const healthMap = new Map(healthResults.map(h => [h.providerId, h]));
  const rateMap = new Map(rateLimits.map(r => [r.providerId, r]));

  for (const provider of providers) {
    const health = healthMap.get(provider.id);
    const rateLimit = rateMap.get(provider.id);
    const provBenchmarks = benchmarks.filter(b => b.providerId === provider.id);
    const provTests = functionalTests.filter(t => t.providerId === provider.id);

    // Capability results from functional tests
    const capResults: Record<CapabilityName, AuditStatus> = {} as any;
    for (const cap of CAPABILITY_NAMES) {
      const test = provTests.find(t => t.testName === cap);
      capResults[cap] = test ? test.status : "unknown";
    }

    const score = calcProviderScore(health, provBenchmarks, functionalTests, rateLimit);
    const avgLatency = provBenchmarks[0]?.avgLatencyMs || health?.latencyMs || 9999;
    const status = !provider.enabled ? "offline" : (health?.status || "offline") as any;

    // Quota remaining
    let quotaRemainingPct = 100;
    if (rateLimit && rateLimit.remaining > 0 && rateLimit.inferredRpm > 0) {
      quotaRemainingPct = Math.min(100, Math.round((rateLimit.remaining / rateLimit.inferredRpm) * 100));
    }

    const successRate = provBenchmarks[0]?.successRate || (status === "healthy" ? 1.0 : 0.0);
    const failureRate = 1.0 - successRate;
    const errorsPerHour = Math.round(failureRate * provBenchmarks[0]?.throughputRpm * 60 || 0);

    // Best model for this provider
    const currentModel = provBenchmarks[0]?.modelId || "default";

    cards.push({
      providerId: provider.id,
      providerName: provider.name,
      overallStatus: status,
      latencyMs: avgLatency,
      capabilityResults: capResults,
      rateLimitStatus: !rateLimit ? "ok" : rateLimit.remaining > 10 ? "ok" : rateLimit.remaining > 0 ? "warning" : "exceeded",
      quotaRemainingPct,
      currentModel,
      lastSuccessAt: status === "healthy" ? new Date().toISOString() : "",
      errorsPerHour,
      fallbackTarget: FALLBACK_CHAIN[provider.id],
      suggestedReplacement: status !== "healthy" ? SUGGESTED_REPLACEMENT[provider.id] : undefined,
      score,
    });
  }

  return cards;
}

/**
 * Phase 19 — Final SRE Summary
 */
import { ModelBenchmark as MB, DiscoveredModel, SRESummary, CapabilityTestResult } from "../types";

function gradeFromScore(score: number): "A+" | "A" | "B" | "C" | "D" | "F" {
  if (score >= 95) return "A+";
  if (score >= 85) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 45) return "D";
  return "F";
}

export function buildFinalSummary(
  providers: DiscoveredProvider[],
  healthResults: EndpointHealthResult[],
  functionalTests: FunctionalTestResult[],
  benchmarks: ModelBenchmark[],
  discoveredModels: DiscoveredModel[],
  capabilityTests: CapabilityTestResult[],
  securityScore: number,
): SRESummary {
  const working = healthResults.filter(h => h.status === "healthy").length;
  const degraded = healthResults.filter(h => h.status === "degraded").length;
  const offline = healthResults.filter(h => h.status === "offline").length;

  const avgLatency = benchmarks.length > 0
    ? Math.round(benchmarks.reduce((a, b) => a + b.avgLatencyMs, 0) / benchmarks.length)
    : 0;

  const fastest = benchmarks.sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)[0];
  const fastestModel = fastest?.modelId || "unknown";
  const fastestProvider = fastest?.providerId || "unknown";

  // Best models by category
  function bestFor(testName: string): string {
    const passed = functionalTests
      .filter(t => t.testName === testName && t.status === "pass")
      .sort((a, b) => a.latencyMs - b.latencyMs);
    return passed[0]?.modelId || "none";
  }

  const missingApiKeys = providers
    .filter(p => !p.enabled)
    .map(p => p.envKey);

  const deprecatedModels = discoveredModels
    .filter(m => m.isDeprecated)
    .map(m => m.id);

  const securityIssues: string[] = [];
  if (securityScore < 80) securityIssues.push("INTERNAL_API_SECRET_KEY is using default value");
  if (process.env["NODE_ENV"] !== "production") securityIssues.push("Not running in production mode");

  const suggestions: string[] = [];
  if (offline > 0) suggestions.push(`${offline} provider(s) offline — check API keys`);
  if (degraded > 0) suggestions.push(`${degraded} provider(s) degraded — may affect reliability`);
  if (avgLatency > 2000) suggestions.push("Average latency > 2s — consider caching frequent requests");
  if (deprecatedModels.length > 0) suggestions.push(`${deprecatedModels.length} deprecated model(s) in use — update model IDs`);

  const overallScore = Math.round(
    (working / Math.max(providers.filter(p => p.enabled).length, 1)) * 40 +
    (functionalTests.filter(t => t.status === "pass").length / Math.max(functionalTests.length, 1)) * 30 +
    (securityScore / 100) * 20 +
    (avgLatency < 1500 ? 10 : avgLatency < 3000 ? 5 : 0)
  );

  return {
    totalProviders: providers.length,
    workingProviders: working,
    degradedProviders: degraded,
    offlineProviders: offline,
    avgLatencyMs: avgLatency,
    fastestProvider,
    fastestModel,
    bestCodingModel: bestFor("CODE"),
    bestReasoningModel: bestFor("REASONING"),
    bestJsonModel: bestFor("JSON"),
    bestImageProvider: "pollinations",
    bestEmbeddingModel: "voyage",
    missingApiKeys,
    deprecatedModels,
    invalidModels: [],
    fallbackCoverage: working > 1 ? 100 : working === 1 ? 50 : 0,
    securityIssues,
    optimizationSuggestions: suggestions,
    productionReady: working >= 2 && securityScore >= 60 && functionalTests.filter(t => t.status === "pass").length > 3,
    overallScore,
    grade: gradeFromScore(overallScore),
  };
}
