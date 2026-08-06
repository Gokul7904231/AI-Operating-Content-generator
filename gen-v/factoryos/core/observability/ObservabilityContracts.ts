/**
 * FactoryOS v0.1 — Observability Contracts
 *
 * Logging, Metrics, and Distributed Tracing domain models.
 */

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

export interface MetricSample {
  name: string;
  value: number;
  type: "counter" | "gauge" | "histogram";
  tags?: Record<string, string>;
  timestamp: string;
}

export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, unknown>;
}

export interface LogCollector {
  log(level: "info" | "warn" | "error", message: string, context?: Record<string, unknown>): void;
  getLogs(): LogEntry[];
  clear(): void;
}

export interface MetricCollector {
  counter(name: string, value: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  histogram(name: string, value: number, tags?: Record<string, string>): void;
  getMetrics(): MetricSample[];
  clear(): void;
}

export interface TraceCollector {
  startSpan(name: string, parentSpanId?: string, attributes?: Record<string, unknown>): Span;
  endSpan(spanId: string, attributes?: Record<string, unknown>): void;
  getSpans(): Span[];
  clear(): void;
}
