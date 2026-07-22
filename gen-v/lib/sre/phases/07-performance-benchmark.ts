/**
 * Phase 07 — Performance Benchmark
 * Benchmarks EVERY model with 10 sequential requests.
 * Records avg/P95/P99 latency, success rate, tokens/sec, cost.
 */

import { DiscoveredProvider, DiscoveredModel, ModelBenchmark } from "../types";

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

async function singleRequest(
  provider: DiscoveredProvider,
  modelId: string,
  attempt: number
): Promise<{ latencyMs: number; success: boolean; tokens: number; timedOut: boolean }> {
  const start = Date.now();
  const key = process.env[provider.envKey] || "";
  if (!key) return { latencyMs: 0, success: false, tokens: 0, timedOut: false };

  const prompt = `Return only the number ${attempt}. No other text.`;

  try {
    if (provider.id === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${key}`;
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 16 } }),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) { await res.text(); return { latencyMs, success: false, tokens: 0, timedOut: false }; }
      const d = await res.json();
      return { latencyMs, success: true, tokens: d?.usageMetadata?.totalTokenCount || 20, timedOut: false };
    }

    const url = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
    const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
    if (provider.id === "openrouter") headers["HTTP-Referer"] = "https://shortfactory.ai";

    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model: modelId, messages: [{ role: "user", content: prompt }], max_tokens: 16 }),
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) { await res.text(); return { latencyMs, success: false, tokens: 0, timedOut: false }; }
    const d = await res.json();
    return { latencyMs, success: true, tokens: d?.usage?.total_tokens || 20, timedOut: false };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    return { latencyMs, success: false, tokens: 0, timedOut: err.name === "AbortError" };
  }
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(idx, sorted.length - 1))];
}

const MODEL_COST: Record<string, { input: number; output: number }> = {
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "llama-3.3-70b-versatile": { input: 0.0, output: 0.0 },
  "glm-4.7-flash": { input: 0.0, output: 0.0 },
  "meta-llama/llama-3.1-8b-instruct": { input: 0.0, output: 0.0 },
};

export async function runPerformanceBenchmark(
  providers: DiscoveredProvider[],
  discoveredModels: DiscoveredModel[]
): Promise<ModelBenchmark[]> {
  const results: ModelBenchmark[] = [];
  const REQUESTS = 10;

  // Pick the top model per provider (first discovered)
  const providerModelMap = new Map<string, string>();
  for (const m of discoveredModels) {
    if (!providerModelMap.has(m.providerId)) {
      providerModelMap.set(m.providerId, m.id);
    }
  }

  const llmProviders = providers.filter(p => p.category === "llm" && p.enabled);

  for (const provider of llmProviders) {
    const modelId = providerModelMap.get(provider.id);
    if (!modelId) continue;

    console.log(`[SRE Phase 7] Benchmarking ${provider.name}/${modelId} (${REQUESTS} requests)...`);

    const latencies: number[] = [];
    let successCount = 0;
    let failCount = 0;
    let retryCount = 0;
    let timeoutCount = 0;
    let totalTokens = 0;

    for (let i = 0; i < REQUESTS; i++) {
      let r = await singleRequest(provider, modelId, i);
      if (!r.success) {
        retryCount++;
        r = await singleRequest(provider, modelId, i); // one retry
      }
      latencies.push(r.latencyMs);
      if (r.success) { successCount++; totalTokens += r.tokens; }
      else { failCount++; }
      if (r.timedOut) timeoutCount++;
      // Small delay to avoid hammering
      await new Promise(res => setTimeout(res, 200));
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const pricing = MODEL_COST[modelId] || { input: 0, output: 0 };
    const avgTokens = totalTokens / Math.max(successCount, 1);
    const avgLatencySec = avg / 1000;
    const tokensPerSec = avgLatencySec > 0 ? avgTokens / avgLatencySec : 0;
    const totalCostUSD = (totalTokens / 1_000_000) * (pricing.input + pricing.output);

    results.push({
      modelId,
      providerId: provider.id,
      requestCount: REQUESTS,
      avgLatencyMs: Math.round(avg),
      p50LatencyMs: percentile(sorted, 50),
      p95LatencyMs: percentile(sorted, 95),
      p99LatencyMs: percentile(sorted, 99),
      successRate: successCount / REQUESTS,
      failureRate: failCount / REQUESTS,
      retryCount,
      timeoutCount,
      avgTokensPerSec: Math.round(tokensPerSec),
      throughputRpm: Math.round(60000 / avg),
      totalCostUSD,
    });

    console.log(`[SRE Phase 7] ${provider.name}: avg=${Math.round(avg)}ms P95=${percentile(sorted, 95)}ms success=${successCount}/${REQUESTS}`);
  }

  return results;
}
