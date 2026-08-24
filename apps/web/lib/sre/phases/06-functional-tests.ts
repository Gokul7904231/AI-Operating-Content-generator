/**
 * Phase 06 — Functional Tests
 * TEXT, JSON, REASONING, CODE, STREAMING, VISION, IMAGE, EMBEDDING, TTS
 * Tests every primary LLM provider independently.
 */

import { DiscoveredProvider, FunctionalTestResult } from "../types";

const REASONING_ANSWER = 22816; // 248 × 92

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

async function callChatCompletion(
  provider: DiscoveredProvider,
  model: string,
  messages: Array<{ role: string; content: string }>,
  extra: Record<string, any> = {}
): Promise<{ text: string; latencyMs: number; tokenCount: number; error?: string }> {
  const start = Date.now();
  const key = process.env[provider.envKey] || "";
  if (!key) return { text: "", latencyMs: 0, tokenCount: 0, error: "No API key" };

  let baseUrl = provider.baseUrl.replace(/\/$/, "");

  // Gemini uses different endpoint
  if (provider.id === "gemini") {
    const geminiModel = model || "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`;
    try {
      const body = { contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })) };
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, ...extra }),
      });
      const latencyMs = Date.now() - start;
      if (!res.ok) {
        const errText = await res.text();
        return { text: "", latencyMs, tokenCount: 0, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
      }
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const tokenCount = data?.usageMetadata?.totalTokenCount || 0;
      return { text, latencyMs, tokenCount };
    } catch (err: any) {
      return { text: "", latencyMs: Date.now() - start, tokenCount: 0, error: err.message };
    }
  }

  // OpenAI-compatible
  const url = `${baseUrl}/chat/completions`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (provider.id === "openrouter") {
    headers["HTTP-Referer"] = "https://shortfactory.ai";
    headers["X-Title"] = "ShortFactory OS";
  }

  try {
    const body = { model, messages, max_tokens: 256, ...extra };
    const res = await fetchWithTimeout(url, { method: "POST", headers, body: JSON.stringify(body) });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      const errText = await res.text();
      return { text: "", latencyMs, tokenCount: 0, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` };
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const tokenCount = data?.usage?.total_tokens || 0;
    return { text, latencyMs, tokenCount };
  } catch (err: any) {
    return { text: "", latencyMs: Date.now() - start, tokenCount: 0, error: err.message };
  }
}

// ─── Individual Test Functions ───────────────────────────────────────────────

async function testText(provider: DiscoveredProvider, model: string): Promise<FunctionalTestResult> {
  const expected = "Hello ShortFactory";
  const result = await callChatCompletion(provider, model, [
    { role: "user", content: 'Reply ONLY with the exact text: "Hello ShortFactory". No other words.' }
  ]);
  const valid = result.text.includes("Hello ShortFactory");
  return {
    testName: "TEXT",
    providerId: provider.id,
    modelId: model,
    status: result.error ? "fail" : (valid ? "pass" : "degraded"),
    latencyMs: result.latencyMs,
    expectedOutput: expected,
    actualOutput: result.text.slice(0, 200),
    outputValid: valid,
    tokenCount: result.tokenCount,
    errorMessage: result.error,
  };
}

async function testJSON(provider: DiscoveredProvider, model: string): Promise<FunctionalTestResult> {
  const result = await callChatCompletion(provider, model, [
    { role: "user", content: 'Return ONLY valid JSON, no markdown, no explanation:\n{"name":"ShortFactory","status":"working"}' }
  ]);
  let jsonValid = false;
  let parsed: any = null;
  if (result.text) {
    try {
      // Strip markdown fences if present
      const cleaned = result.text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
      jsonValid = parsed?.name === "ShortFactory" && parsed?.status === "working";
    } catch {}
  }
  return {
    testName: "JSON",
    providerId: provider.id,
    modelId: model,
    status: result.error ? "fail" : (jsonValid ? "pass" : "degraded"),
    latencyMs: result.latencyMs,
    expectedOutput: '{"name":"ShortFactory","status":"working"}',
    actualOutput: result.text.slice(0, 300),
    outputValid: jsonValid,
    jsonValid,
    tokenCount: result.tokenCount,
    errorMessage: result.error,
  };
}

async function testReasoning(provider: DiscoveredProvider, model: string): Promise<FunctionalTestResult> {
  const result = await callChatCompletion(provider, model, [
    { role: "user", content: "What is 248 × 92? Reply with the number only, nothing else." }
  ]);
  const answerNum = parseInt(result.text.replace(/[^0-9]/g, ""), 10);
  const correct = answerNum === REASONING_ANSWER;
  return {
    testName: "REASONING",
    providerId: provider.id,
    modelId: model,
    status: result.error ? "fail" : (correct ? "pass" : "degraded"),
    latencyMs: result.latencyMs,
    expectedOutput: String(REASONING_ANSWER),
    actualOutput: result.text.slice(0, 50),
    outputValid: correct,
    tokenCount: result.tokenCount,
    errorMessage: result.error,
  };
}

async function testCode(provider: DiscoveredProvider, model: string): Promise<FunctionalTestResult> {
  const result = await callChatCompletion(provider, model, [
    { role: "user", content: 'Write a Python one-liner that prints "hello world". Return only the code, no explanation.' }
  ]);
  const valid = result.text.includes("print") && result.text.toLowerCase().includes("hello world");
  return {
    testName: "CODE",
    providerId: provider.id,
    modelId: model,
    status: result.error ? "fail" : (valid ? "pass" : "degraded"),
    latencyMs: result.latencyMs,
    outputValid: valid,
    actualOutput: result.text.slice(0, 300),
    tokenCount: result.tokenCount,
    errorMessage: result.error,
  };
}

async function testStreaming(provider: DiscoveredProvider, model: string): Promise<FunctionalTestResult> {
  const start = Date.now();
  const key = process.env[provider.envKey] || "";
  if (!key) return { testName: "STREAMING", providerId: provider.id, modelId: model, status: "skip", latencyMs: 0, outputValid: false, errorMessage: "No key" };

  // Gemini streaming
  if (provider.id === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}&alt=sse`;
    try {
      const res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Say: streaming works" }] }] }),
      }, 12000);
      const text = await res.text();
      const worked = res.ok && text.includes("data:");
      return { testName: "STREAMING", providerId: provider.id, modelId: model, status: worked ? "pass" : "fail", latencyMs: Date.now() - start, outputValid: worked, streamingWorked: worked };
    } catch (err: any) {
      return { testName: "STREAMING", providerId: provider.id, modelId: model, status: "fail", latencyMs: Date.now() - start, outputValid: false, errorMessage: err.message };
    }
  }

  // OpenAI-compatible streaming
  const url = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  if (provider.id === "openrouter") { headers["HTTP-Referer"] = "https://shortfactory.ai"; }

  try {
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, messages: [{ role: "user", content: "Say: streaming works" }], stream: true, max_tokens: 30 }),
    }, 12000);
    const text = await res.text();
    const worked = res.ok && text.includes("data:");
    return { testName: "STREAMING", providerId: provider.id, modelId: model, status: worked ? "pass" : "fail", latencyMs: Date.now() - start, outputValid: worked, streamingWorked: worked };
  } catch (err: any) {
    return { testName: "STREAMING", providerId: provider.id, modelId: model, status: "fail", latencyMs: Date.now() - start, outputValid: false, errorMessage: err.message };
  }
}

async function testEmbedding(provider: DiscoveredProvider): Promise<FunctionalTestResult> {
  const start = Date.now();
  const key = process.env[provider.envKey] || "";
  if (!key) return { testName: "EMBEDDING", providerId: provider.id, modelId: "n/a", status: "skip", latencyMs: 0, outputValid: false, errorMessage: "No key" };

  let url = "";
  let body: any = {};
  const headers: Record<string, string> = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

  if (provider.id === "gemini") {
    const gemKey = process.env["GEMINI_API_KEY"] || "";
    url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${gemKey}`;
    body = { model: "models/text-embedding-004", content: { parts: [{ text: "Hello World" }] } };
    delete headers["Authorization"];
  } else if (provider.id === "voyage") {
    url = "https://api.voyageai.com/v1/embeddings";
    body = { input: "Hello World", model: "voyage-3-lite" };
  } else if (provider.id === "jina") {
    url = "https://api.jina.ai/v1/embeddings";
    body = { input: ["Hello World"], model: "jina-embeddings-v3" };
  } else {
    return { testName: "EMBEDDING", providerId: provider.id, modelId: "n/a", status: "skip", latencyMs: 0, outputValid: false };
  }

  try {
    const res = await fetchWithTimeout(url, { method: "POST", headers, body: JSON.stringify(body) });
    const latencyMs = Date.now() - start;
    if (!res.ok) { const e = await res.text(); return { testName: "EMBEDDING", providerId: provider.id, modelId: "embedding", status: "fail", latencyMs, outputValid: false, errorMessage: `HTTP ${res.status}` }; }
    const data = await res.json();
    const hasVector = data?.data?.[0]?.embedding?.length > 0 || data?.embedding?.values?.length > 0;
    return { testName: "EMBEDDING", providerId: provider.id, modelId: "embedding", status: hasVector ? "pass" : "fail", latencyMs, outputValid: hasVector };
  } catch (err: any) {
    return { testName: "EMBEDDING", providerId: provider.id, modelId: "embedding", status: "fail", latencyMs: Date.now() - start, outputValid: false, errorMessage: err.message };
  }
}

async function testTTS(provider: DiscoveredProvider): Promise<FunctionalTestResult> {
  if (provider.id !== "elevenlabs") return { testName: "TTS", providerId: provider.id, modelId: "n/a", status: "skip", latencyMs: 0, outputValid: false };
  const start = Date.now();
  const key = process.env["ELEVENLABS_API_KEY"] || "";
  if (!key) return { testName: "TTS", providerId: provider.id, modelId: "n/a", status: "skip", latencyMs: 0, outputValid: false, errorMessage: "No ElevenLabs key" };

  try {
    const res = await fetchWithTimeout("https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM", {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hello ShortFactory", model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.5, similarity_boost: 0.5 } }),
    }, 15000);
    const latencyMs = Date.now() - start;
    const valid = res.ok && parseInt(res.headers.get("content-length") || "0") > 1000;
    return { testName: "TTS", providerId: "elevenlabs", modelId: "eleven_multilingual_v2", status: valid ? "pass" : "fail", latencyMs, outputValid: valid, errorMessage: res.ok ? undefined : `HTTP ${res.status}` };
  } catch (err: any) {
    return { testName: "TTS", providerId: "elevenlabs", modelId: "n/a", status: "fail", latencyMs: Date.now() - start, outputValid: false, errorMessage: err.message };
  }
}

// ─── Main Export ─────────────────────────────────────────────────────────────

const LLM_PROVIDER_MODELS: Record<string, string> = {
  gemini:      process.env.GEMINI_MODEL || "gemini-1.5-flash",
  groq:        process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  openrouter:  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct",
  nvidia:      "meta/llama-3.3-70b-instruct",
  zai:         process.env.ZAI_MODEL || "glm-4.7-flash",
  deepseek:    "deepseek-chat",
  cerebras:    "llama3.1-8b",
  sambanova:   "Meta-Llama-3.1-8B-Instruct",
  fireworks:   "accounts/fireworks/models/llama-v3p1-8b-instruct",
  cohere:      "command-r",
};

export async function runFunctionalTests(
  providers: DiscoveredProvider[]
): Promise<FunctionalTestResult[]> {
  const results: FunctionalTestResult[] = [];

  const llmProviders = providers.filter(p => p.category === "llm" && p.enabled);

  for (const provider of llmProviders) {
    const model = LLM_PROVIDER_MODELS[provider.id] || "default";
    console.log(`[SRE Phase 6] Running functional tests on ${provider.name} (${model})...`);

    const [textR, jsonR, reasonR, codeR, streamR] = await Promise.allSettled([
      testText(provider, model),
      testJSON(provider, model),
      testReasoning(provider, model),
      testCode(provider, model),
      testStreaming(provider, model),
    ]);

    if (textR.status === "fulfilled") results.push(textR.value);
    if (jsonR.status === "fulfilled") results.push(jsonR.value);
    if (reasonR.status === "fulfilled") results.push(reasonR.value);
    if (codeR.status === "fulfilled") results.push(codeR.value);
    if (streamR.status === "fulfilled") results.push(streamR.value);
  }

  // Embedding tests
  const embeddingProviders = providers.filter(p => ["gemini", "voyage", "jina"].includes(p.id) && p.enabled);
  for (const p of embeddingProviders) {
    const r = await testEmbedding(p);
    results.push(r);
  }

  // TTS test
  const ttsProvider = providers.find(p => p.id === "elevenlabs" && p.enabled);
  if (ttsProvider) {
    const r = await testTTS(ttsProvider);
    results.push(r);
  }

  const passed = results.filter(r => r.status === "pass").length;
  console.log(`[SRE Phase 6] Functional tests: ${passed}/${results.length} passed.`);

  return results;
}
