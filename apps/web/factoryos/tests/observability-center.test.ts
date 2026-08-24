import { describe, it, expect, beforeEach } from "vitest";
import { EventCenter } from "../../lib/observability/event-center";

describe("FactoryOS v1 — Phase 12: Event Center & Observability Suite", () => {
  beforeEach(() => {
    EventCenter.clearEventsForTesting();
  });

  // 1. Mission Event Recording
  it("records mission timeline events with accurate severity, source, and timestamp", () => {
    const event = EventCenter.recordEvent({
      type: "RENDER_COMPLETED",
      severity: "SUCCESS",
      source: "RENDERER",
      tenantId: "tenant_alpha",
      userId: "u_alpha",
      jobId: "job_999",
      message: "FFmpeg composition finished in 14.2s",
      requestId: "req_ffmpeg_123",
    });

    expect(event.id).toBeDefined();
    expect(event.severity).toBe("SUCCESS");
    expect(event.source).toBe("RENDERER");
    expect(event.timestamp).toBeDefined();

    const user = { uid: "tenant_alpha", role: "PRO" };
    const events = EventCenter.getEvents(user);
    expect(events.length).toBe(1);
    expect(events[0].message).toBe("FFmpeg composition finished in 14.2s");
  });

  // 2. Multi-Tenant Filtering
  it("enforces tenant isolation when querying mission timeline events", () => {
    EventCenter.recordEvent({
      type: "JOB_STARTED",
      severity: "INFO",
      source: "SYSTEM",
      tenantId: "tenant_alpha",
      userId: "u_alpha",
      jobId: "job_a",
      message: "Tenant A Job Started",
    });

    EventCenter.recordEvent({
      type: "JOB_STARTED",
      severity: "INFO",
      source: "SYSTEM",
      tenantId: "tenant_beta",
      userId: "u_beta",
      jobId: "job_b",
      message: "Tenant B Job Started",
    });

    // Normal PRO user in tenant_alpha -> receives ONLY tenant_alpha events
    const alphaUser = { uid: "tenant_alpha", role: "PRO" };
    const alphaEvents = EventCenter.getEvents(alphaUser);
    expect(alphaEvents.length).toBe(1);
    expect(alphaEvents[0].message).toBe("Tenant A Job Started");

    // ADMIN user -> receives all events
    const adminUser = { uid: "tenant_admin", role: "ADMIN" };
    const adminEvents = EventCenter.getEvents(adminUser);
    expect(adminEvents.length).toBe(2);
  });

  // 3. Honest SRE Runtime Telemetry
  it("computes honest SRE runtime telemetry with truthful Runtime CPU/RAM terminology", () => {
    const metrics = EventCenter.getSREMetrics();
    expect(metrics.runtimeCpuPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.runtimeRamUsedMb).toBeGreaterThan(0);
    expect(metrics.runtimeRamTotalMb).toBeGreaterThan(0);
    expect(metrics.gpuStatus).toBe("GPU_TELEMETRY_UNAVAILABLE"); // Honest GPU status
    expect(metrics.activeWorkerCount).toBeDefined();
    expect(metrics.storagePressureState).toBeDefined();
  });

  // 4. Observability Telemetry API
  it("serves mission timeline and SRE metrics via GET /api/observability/events", async () => {
    const { GET } = await import("../../app/api/observability/events/route");
    const secretKey = process.env.INTERNAL_API_SECRET_KEY || "factoryos-internal-secret-key-2026";
    process.env.INTERNAL_API_SECRET_KEY = secretKey;

    const req = new Request("http://localhost:3000/api/observability/events", {
      headers: { Authorization: `Bearer ${secretKey}` },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.sreMetrics.runtimeCpuPercent).toBeDefined();
    expect(body.events).toBeDefined();
    expect(body.provenance?.source).toBe("/api/observability/events");
  });
});
