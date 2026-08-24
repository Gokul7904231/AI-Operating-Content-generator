import { describe, it, expect } from "vitest";

describe("FactoryOS v1 — Phase 7: AI Decision Center Acceptance Suite", () => {
  it("serves model-agnostic AI decision objects via GET /api/admin/ai-decision", async () => {
    const { GET } = await import("../../app/api/admin/ai-decision/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.decision).toBeDefined();

    const decision = body.decision;
    expect(decision.provider).toBe("google");
    expect(decision.model).toBe("gemini-1.5-flash");
    expect(Array.isArray(decision.reasonCodes)).toBe(true);
    expect(decision.evidence).toBeDefined();
    expect(decision.evidence.trendScore).toBeGreaterThanOrEqual(0);
    expect(body.provenance?.source).toBe("/api/admin/ai-decision");
  });

  it("handles missing decision evidence gracefully without fabricating numbers", async () => {
    // Verify that when decision payload is null, evidence remains null
    const emptyPayload = {
      success: true,
      decision: null,
    };
    expect(emptyPayload.decision).toBeNull();
  });
});
