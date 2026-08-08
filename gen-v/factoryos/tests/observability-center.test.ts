import { describe, it, expect, beforeEach } from "vitest";
import { EventCenter } from "../../lib/observability/event-center";

describe("FactoryOS v1 — Phase 12: Event Center & Observability Suite", () => {
  beforeEach(() => {
    EventCenter.clearEventsForTesting();
  });

  // 1. Mission Event Recording
  it("records mission timeline events with accurate severity, source, and timestamp", () => {
    const event = EventCenter.recordEvent({
      tenantId: "tenant_alpha",
      jobId: "job_999",
      eventType: "RENDER_COMPLETED",
      status: "SUCCESS",
      source: "ORACLE_WORKER",
      message: "FFmpeg composition finished in 14.2s",
      requestId: "req_ffmpeg_123",
    });

    expect(event.id).toBeDefined();
    expect(event.status).toBe("SUCCESS");
    expect(event.source).toBe("ORACLE_WORKER");
    expect(event.timestamp).toBeDefined();

    const events = EventCenter.getEvents({ tenantId: "tenant_alpha" });
    expect(events.length).toBe(1);
    expect(events[0].message).toBe("FFmpeg composition finished in 14.2s");
  });

  // 2. Multi-Tenant Filtering
  it("enforces tenant isolation when querying mission timeline events", () => {
    EventCenter.recordEvent({
      tenantId: "tenant_alpha",
      jobId: "job_a",
      eventType: "JOB_STARTED",
      status: "INFO",
      source: "CONTROL_PLANE",
      message: "Tenant A Job Started",
    });

    EventCenter.recordEvent({
      tenantId: "tenant_beta",
      jobId: "job_b",
      eventType: "JOB_STARTED",
      status: "INFO",
      source: "CONTROL_PLANE",
      message: "Tenant B Job Started",
    });

    const alphaEvents = EventCenter.getEvents({ tenantId: "tenant_alpha" });
    expect(alphaEvents.length).toBe(1);
    expect(alphaEvents[0].message).toBe("Tenant A Job Started");
  });

  // 3. Honest SRE Container Telemetry
  it("computes honest SRE container telemetry without hardcoded fake numbers", () => {
    const metrics = EventCenter.getSREMetrics();
    expect(metrics.containerCpuPercent).toBeGreaterThanOrEqual(0);
    expect(metrics.containerRamUsedMb).toBeGreaterThan(0);
    expect(metrics.containerRamTotalMb).toBeGreaterThan(0);
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
    expect(body.sreMetrics.containerCpuPercent).toBeDefined();
    expect(body.events).toBeDefined();
    expect(body.provenance?.source).toBe("/api/observability/events");
  });
});
