/**
 * FactoryOS v0.1 — Step 9 Observability Tests
 *
 * Verifies structured logging, metric collection, and hierarchical distributed tracing.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { FactoryRuntime } from "../core/runtime/FactoryRuntime";
import { ObservabilityManager } from "../core/observability/ObservabilityManager";

import { ok, fail } from "../core/contracts/Result";
import type { WorkflowDefinition } from "../core/contracts/Workflow";

describe("FactoryOS v0.1 — Observability Telemetry Suite", () => {
  let runtime: FactoryRuntime;
  let obs: ObservabilityManager;

  beforeEach(() => {
    runtime = new FactoryRuntime();
    obs = new ObservabilityManager(runtime.eventBus);
  });

  it("records hierarchical traces with parent-child linkage and matching traceId", async () => {
    const stepA = {
      id: "stepA",
      execute: async () => ok({ result: "A" }),
    };
    const stepB = {
      id: "stepB",
      execute: async () => ok({ result: "B" }),
    };
    const workflow: WorkflowDefinition<any> = {
      id: "wf-trace",
      name: "Tracing Workflow",
      version: "1.0.0",
      steps: [stepA, stepB],
    };

    await runtime.start(workflow, {});
    // Yield to let the deferred telemetry callbacks process
    await new Promise((r) => setTimeout(r, 15));

    const spans = obs.traceCollector.getSpans();
    // Expect 3 spans: workflow_execution, step_execution (stepA), step_execution (stepB)
    expect(spans).toHaveLength(3);

    const wfSpan = spans.find((s) => s.name === "workflow_execution")!;
    const stepSpans = spans.filter((s) => s.name === "step_execution");

    expect(wfSpan).toBeDefined();
    expect(stepSpans).toHaveLength(2);

    // Verify parent-child linkage and traceId stability
    for (const stepSpan of stepSpans) {
      expect(stepSpan.parentSpanId).toBe(wfSpan.spanId);
      expect(stepSpan.traceId).toBe(wfSpan.traceId);
      expect(stepSpan.endTime).toBeGreaterThanOrEqual(stepSpan.startTime);
    }
  });

  it("collects counters and histograms during successful execution", async () => {
    const stepA = {
      id: "stepA",
      execute: async () => ok({ val: 1 }),
    };
    const workflow: WorkflowDefinition<any> = {
      id: "wf-metrics",
      name: "Metrics Workflow",
      version: "1.0.0",
      steps: [stepA],
    };

    await runtime.start(workflow, {});
    await new Promise((r) => setTimeout(r, 15));

    const metrics = obs.metricCollector.getMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(3);

    const starts = metrics.find((m) => m.name === "workflow_starts_total")!;
    expect(starts).toBeDefined();
    expect(starts.value).toBe(1);

    const stepStarts = metrics.find((m) => m.name === "step_starts_total")!;
    expect(stepStarts).toBeDefined();
    expect(stepStarts.value).toBe(1);

    const duration = metrics.find((m) => m.name === "step_duration_ms")!;
    expect(duration).toBeDefined();
    expect(duration.type).toBe("histogram");
    expect(duration.value).toBeGreaterThanOrEqual(0);
  });

  it("logs structured error details upon step and workflow failure", async () => {
    const failingStep = {
      id: "fail-step",
      execute: async () => fail("UNHANDLED_EXCEPTION", "intentional database timeout"),
    };
    const workflow: WorkflowDefinition<any> = {
      id: "wf-fail-log",
      name: "Failing Log Workflow",
      version: "1.0.0",
      steps: [failingStep],
    };

    await runtime.start(workflow, {});
    await new Promise((r) => setTimeout(r, 15));

    const logs = obs.logCollector.getLogs();
    const errorLogs = logs.filter((l) => l.level === "error");

    expect(errorLogs.length).toBeGreaterThanOrEqual(2);

    const stepFailLog = errorLogs.find((l) => l.message.includes("Step failed"))!;
    expect(stepFailLog).toBeDefined();
    expect(stepFailLog.context?.stepId).toBe("fail-step");
    expect((stepFailLog.context?.error as any)?.message).toContain("intentional database timeout");

    const wfFailLog = errorLogs.find((l) => l.message.includes("Workflow failed"))!;
    expect(wfFailLog).toBeDefined();
    expect(wfFailLog.context?.runId).toBeDefined();
  });
});
