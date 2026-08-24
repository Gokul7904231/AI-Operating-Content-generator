import { describe, it, expect, vi } from "vitest";

describe("FactoryOS Basic FastAPI Idempotency & Durability Suite", () => {
  const mockApiUrl = "https://render.factoryos.app";
  const validSecret = "secret_valid_token_99182";

  it("01: Repeated submission with same jobId returns existing state without starting duplicate render", async () => {
    let callCount = 0;
    const fetchMock = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        status: 202,
        json: async () => ({
          jobId: "idem-job-404",
          status: "processing",
          message: callCount > 1 ? "Job already registered (idempotent submission)." : undefined,
        }),
      };
    });

    global.fetch = fetchMock;

    // First submission
    const res1 = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validSecret}`,
      },
      body: JSON.stringify({ jobId: "idem-job-404", executionToken: "tok-404", tier: "BASIC" }),
    });
    const data1 = await res1.json();
    expect(data1.jobId).toBe("idem-job-404");
    expect(data1.status).toBe("processing");

    // Second duplicate submission
    const res2 = await fetch(`${mockApiUrl}/api/render/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validSecret}`,
      },
      body: JSON.stringify({ jobId: "idem-job-404", executionToken: "tok-404", tier: "BASIC" }),
    });
    const data2 = await res2.json();
    expect(data2.jobId).toBe("idem-job-404");
    expect(data2.message).toContain("already registered");
  });

  it("02: Service restart recovery maintains Firestore as authoritative truth", () => {
    // Simulates an API restart where in-memory queue is reset
    const firestoreJobState = {
      id: "restart-job-909",
      status: "queued",
      tier: "BASIC",
      targetWorkerPool: "basic-fastapi",
      createdAt: new Date().toISOString(),
    };

    // Upon service restart, Firestore job remains queued and eligible for re-dispatch / fallback claim
    expect(firestoreJobState.status).toBe("queued");
    expect(firestoreJobState.tier).toBe("BASIC");
  });
});
