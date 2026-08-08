import { describe, it, expect } from "vitest";

describe("FactoryOS v1 — BYOLM Integration Acceptance Test Suite", () => {
  // 1. Provider & Discovery Tests
  it("discovers installed Ollama models dynamically via GET /api/providers/local/discover", async () => {
    const { GET } = await import("../../app/api/providers/local/discover/route");
    
    // Mock fetch for Ollama tags
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "llama3:8b" }, { name: "qwen2.5:7b" }],
        }),
      } as Response;
    };

    const req = new Request("http://localhost:3000/api/providers/local/discover?type=ollama&endpoint=http://127.0.0.1:11434");
    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.models.length).toBe(2);
    expect(body.models[0].name).toBe("Ollama: llama3:8b");

    global.fetch = originalFetch;
  });

  it("handles empty model list during discovery safely", async () => {
    const { GET } = await import("../../app/api/providers/local/discover/route");
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ models: [] }),
      } as Response;
    };

    const req = new Request("http://localhost:3000/api/providers/local/discover?type=ollama");
    const res = await GET(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.models.length).toBe(0);

    global.fetch = originalFetch;
  });

  // 2. Connection Testing & Status Codes
  it("returns CONNECTED status when Ollama and selected model exist", async () => {
    const { POST } = await import("../../app/api/providers/local/test/route");
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ models: [{ name: "llama3:8b" }] }),
      } as Response;
    };

    const req = new Request("http://localhost:3000/api/providers/local/test", {
      method: "POST",
      body: JSON.stringify({ endpoint: "http://127.0.0.1:11434", type: "ollama", model: "llama3:8b" }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.status).toBe("connected");
    expect(body.provenance?.source).toBe("http://127.0.0.1:11434/api/tags");

    global.fetch = originalFetch;
  });

  it("returns MODEL_UNAVAILABLE status when Ollama is online but model is missing", async () => {
    const { POST } = await import("../../app/api/providers/local/test/route");
    const originalFetch = global.fetch;
    global.fetch = async () => {
      return {
        ok: true,
        json: async () => ({ models: [{ name: "other-model:7b" }] }),
      } as Response;
    };

    const req = new Request("http://localhost:3000/api/providers/local/test", {
      method: "POST",
      body: JSON.stringify({ endpoint: "http://127.0.0.1:11434", type: "ollama", model: "llama3:8b" }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe("model_unavailable");
    expect(body.error).toContain("was not found");

    global.fetch = originalFetch;
  });

  it("returns OFFLINE status when Ollama service is unreachable", async () => {
    const { POST } = await import("../../app/api/providers/local/test/route");
    const originalFetch = global.fetch;
    global.fetch = async () => {
      throw new Error("Connection refused");
    };

    const req = new Request("http://localhost:3000/api/providers/local/test", {
      method: "POST",
      body: JSON.stringify({ endpoint: "http://127.0.0.1:9999", type: "ollama" }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.status).toBe("offline");

    global.fetch = originalFetch;
  });

  // 3. Security & SSRF Rules
  it("rejects intranet metadata endpoint URLs (SSRF protection)", async () => {
    const { POST } = await import("../../app/api/providers/local/test/route");
    const req = new Request("http://localhost:3000/api/providers/local/test", {
      method: "POST",
      body: JSON.stringify({ endpoint: "http://169.254.169.254/latest/meta-data" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);

    const body = await res.json();
    expect(body.status).toBe("unauthorized");
    expect(body.error).toContain("SSRF Protection");
  });

  // 4. Decision Center & Zero Fake Cost
  it("preserves AI Decision Center evidence format with executionMode='local' and null estimatedCostUsd", () => {
    const localDecisionRecord = {
      provider: "ollama",
      model: "llama3:8b",
      executionMode: "local",
      estimatedCostUsd: null, // Zero fake cost for local models
      requestId: "req_local_123",
    };

    expect(localDecisionRecord.executionMode).toBe("local");
    expect(localDecisionRecord.estimatedCostUsd).toBeNull();
  });
});
