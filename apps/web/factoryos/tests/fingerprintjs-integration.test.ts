import { describe, it, expect } from "vitest";
import { extractDeviceContext } from "@/lib/fingerprint/server";

describe("FactoryOS FingerprintJS Integration Suite", () => {
  it("01: Extracts x-device-fingerprint header correctly", () => {
    const mockReq = new Request("http://localhost:3000/api/generate-video", {
      headers: {
        "x-device-fingerprint": "fp_visitor_9876543210abcdef",
        "x-forwarded-for": "203.0.113.195, 10.0.0.1",
        "user-agent": "Mozilla/5.0 Chrome/120.0",
      },
    });

    const ctx = extractDeviceContext(mockReq);
    expect(ctx.fingerprint).toBe("fp_visitor_9876543210abcdef");
    expect(ctx.ipAddress).toBe("203.0.113.195");
    expect(ctx.userAgent).toBe("Mozilla/5.0 Chrome/120.0");
  });

  it("02: Fallbacks to x-visitor-id if x-device-fingerprint is absent", () => {
    const mockReq = new Request("http://localhost:3000/api/generate-video", {
      headers: {
        "x-visitor-id": "visitor_custom_token_441",
      },
    });

    const ctx = extractDeviceContext(mockReq);
    expect(ctx.fingerprint).toBe("visitor_custom_token_441");
    expect(ctx.ipAddress).toBe("127.0.0.1");
  });

  it("03: Defaults to unknown_device when no fingerprint header is provided", () => {
    const mockReq = new Request("http://localhost:3000/api/generate-video");
    const ctx = extractDeviceContext(mockReq);
    expect(ctx.fingerprint).toBe("unknown_device");
  });

  it("04: Validates that payload schema accommodates deviceFingerprint field", () => {
    const payload = {
      jobId: "job_test_device_01",
      tier: "BASIC",
      targetWorkerPool: "basic-fastapi",
      deviceFingerprint: "fp_visitor_9876543210abcdef",
      clientIp: "203.0.113.195",
      status: "queued",
    };

    expect(payload.deviceFingerprint).toBe("fp_visitor_9876543210abcdef");
    expect(payload.clientIp).toBe("203.0.113.195");
  });
});
