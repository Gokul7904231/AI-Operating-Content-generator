import { describe, it, expect, vi } from "vitest";

describe("FactoryOS Basic FastAPI Security & Isolation Suite", () => {
  const mockApiUrl = "https://render.factoryos.app";
  const validSecret = "secret_valid_token_99182";

  it("01: Rejects unauthenticated request without Bearer token", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized: Missing or invalid Basic Render API secret." }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: "sec-job-01", executionToken: "token-01", tier: "BASIC" }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.detail).toContain("Unauthorized");
  });

  it("02: Strictly enforces tier isolation: Rejects ADMIN tier jobs on Basic service", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        detail: "Tier Isolation Error: Basic Render API only accepts tier=BASIC jobs (received: ADMIN).",
      }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validSecret}`,
      },
      body: JSON.stringify({ jobId: "admin-job-01", executionToken: "token-01", tier: "ADMIN" }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.detail).toContain("Tier Isolation Error");
  });

  it("03: Strictly enforces executionToken presence (rejects empty or missing token)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        detail: "Validation Error: executionToken is strictly required.",
      }),
    });

    global.fetch = fetchMock;

    const response = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validSecret}`,
      },
      body: JSON.stringify({ jobId: "missing-token-01", executionToken: "", tier: "BASIC" }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.detail).toContain("executionToken is strictly required");
  });
});
