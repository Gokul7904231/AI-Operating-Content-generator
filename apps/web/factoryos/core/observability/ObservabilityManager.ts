/**
 * FactoryOS v0.1 — Observability Manager
 *
 * Automatically wires up telemetry events from the RuntimeEventBus
 * to structured logs, counters/histograms, and parent-child traces.
 */

import { RuntimeEventBus, RuntimeEventTypes } from "../events/RuntimeEvent";
import { InMemoryLogCollector } from "./InMemoryLogCollector";
import { InMemoryMetricCollector } from "./InMemoryMetricCollector";
import { InMemoryTraceCollector } from "./InMemoryTraceCollector";

export class ObservabilityManager {
  readonly logCollector = new InMemoryLogCollector();
  readonly metricCollector = new InMemoryMetricCollector();
  readonly traceCollector = new InMemoryTraceCollector();

  // runId -> Workflow Span
  private readonly workflowSpans = new Map<string, { spanId: string }>();
  // runId_stepId -> Step Span
  private readonly stepSpans = new Map<string, { spanId: string }>();

  constructor(private readonly eventBus: RuntimeEventBus) {
    this._subscribeToEvents();
  }

  private _subscribeToEvents(): void {
    this.eventBus.subscribe("*", (event) => {
      const payload = event.payload as any;
      const runId = payload?.runId as string | undefined;
      const stepId = payload?.stepId as string | undefined;

      switch (event.type) {
        case RuntimeEventTypes.WORKFLOW_STARTED: {
          if (runId) {
            this.logCollector.log("info", `Workflow started: runId=${runId}`, { runId });
            this.metricCollector.counter("workflow_starts_total", 1, { workflowId: payload.workflowId });
            
            const span = this.traceCollector.startSpan("workflow_execution", undefined, {
              workflowId: payload.workflowId,
              runId,
            });
            this.workflowSpans.set(runId, { spanId: span.spanId });
          }
          break;
        }

        case RuntimeEventTypes.STEP_STARTED: {
          if (runId && stepId) {
            this.logCollector.log("info", `Step started: stepId=${stepId} in runId=${runId}`, { runId, stepId });
            this.metricCollector.counter("step_starts_total", 1, { stepId });

            const parent = this.workflowSpans.get(runId);
            const span = this.traceCollector.startSpan("step_execution", parent?.spanId, {
              runId,
              stepId,
            });
            this.stepSpans.set(`${runId}_${stepId}`, { spanId: span.spanId });
          }
          break;
        }

        case RuntimeEventTypes.STEP_COMPLETED: {
          if (runId && stepId) {
            this.logCollector.log("info", `Step completed: stepId=${stepId} in runId=${runId}`, { runId, stepId });
            
            const durationMs = payload.durationMs ?? 0;
            this.metricCollector.histogram("step_duration_ms", durationMs, { stepId, status: "completed" });

            const key = `${runId}_${stepId}`;
            const stepSpan = this.stepSpans.get(key);
            if (stepSpan) {
              this.traceCollector.endSpan(stepSpan.spanId, { status: "completed" });
              this.stepSpans.delete(key);
            }
          }
          break;
        }

        case RuntimeEventTypes.STEP_FAILED: {
          if (runId && stepId) {
            const error = { code: payload.errorCode, message: payload.errorMessage };
            this.logCollector.log("error", `Step failed: stepId=${stepId} in runId=${runId}. Error: ${payload.errorMessage}`, {
              runId,
              stepId,
              error,
            });
            
            const durationMs = payload.durationMs ?? 0;
            this.metricCollector.histogram("step_duration_ms", durationMs, { stepId, status: "failed" });

            const key = `${runId}_${stepId}`;
            const stepSpan = this.stepSpans.get(key);
            if (stepSpan) {
              this.traceCollector.endSpan(stepSpan.spanId, { status: "failed", error: payload.errorMessage });
              this.stepSpans.delete(key);
            }
          }
          break;
        }

        case RuntimeEventTypes.WORKFLOW_COMPLETED: {
          if (runId) {
            this.logCollector.log("info", `Workflow completed successfully: runId=${runId}`, { runId });
            this.metricCollector.counter("workflow_completions_total", 1);

            const span = this.workflowSpans.get(runId);
            if (span) {
              this.traceCollector.endSpan(span.spanId, { status: "completed" });
              this.workflowSpans.delete(runId);
            }
          }
          break;
        }

        case RuntimeEventTypes.WORKFLOW_FAILED: {
          if (runId) {
            const error = { code: payload.errorCode, message: payload.errorMessage };
            this.logCollector.log("error", `Workflow failed: runId=${runId}. Error: ${payload.errorMessage}`, {
              runId,
              error,
            });
            this.metricCollector.counter("workflow_failures_total", 1);

            const span = this.workflowSpans.get(runId);
            if (span) {
              this.traceCollector.endSpan(span.spanId, { status: "failed", error: payload.errorMessage });
              this.workflowSpans.delete(runId);
            }
          }
          break;
        }
      }
    });
  }
}
