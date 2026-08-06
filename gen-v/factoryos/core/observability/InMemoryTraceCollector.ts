/**
 * FactoryOS v0.1 — InMemory Trace Collector
 *
 * Distributed tracing engine. Creates trace spans with parent linkage.
 */

 
import crypto from "crypto";
import type { TraceCollector, Span } from "./ObservabilityContracts";

export class InMemoryTraceCollector implements TraceCollector {
  private spans: Span[] = [];
  private readonly activeSpans = new Map<string, Span>();

  startSpan(
    name: string,
    parentSpanId?: string,
    attributes?: Record<string, unknown>
  ): Span {
    let traceId = this._randomId(16);
    if (parentSpanId) {
      const parentSpan = this.activeSpans.get(parentSpanId) || this.spans.find((s) => s.spanId === parentSpanId);
      if (parentSpan) {
        traceId = parentSpan.traceId;
      }
    }

    const spanId = this._randomId(8);

    const span: Span = {
      traceId,
      spanId,
      parentSpanId,
      name,
      startTime: Date.now(),
      attributes: attributes ? { ...attributes } : {},
    };

    this.activeSpans.set(spanId, span);
    return structuredClone(span);
  }

  endSpan(spanId: string, attributes?: Record<string, unknown>): void {
    const span = this.activeSpans.get(spanId);
    if (!span) return;

    span.endTime = Date.now();
    if (attributes) {
      span.attributes = { ...span.attributes, ...attributes };
    }

    this.spans.push(span);
    this.activeSpans.delete(spanId);
  }

  getSpans(): Span[] {
    return structuredClone(this.spans);
  }

  clear(): void {
    this.spans = [];
    this.activeSpans.clear();
  }

  private _randomId(length: number): string {
    return crypto.randomBytes(length).toString("hex");
  }
}
