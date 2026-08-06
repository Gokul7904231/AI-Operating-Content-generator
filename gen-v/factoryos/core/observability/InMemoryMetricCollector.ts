/**
 * FactoryOS v0.1 — InMemory Metric Collector
 *
 * Tracks counters, gauges, and histograms with tag dimensions.
 */

import type { MetricCollector, MetricSample } from "./ObservabilityContracts";

export class InMemoryMetricCollector implements MetricCollector {
  private metrics: MetricSample[] = [];

  counter(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push(this._createSample(name, value, "counter", tags));
  }

  gauge(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push(this._createSample(name, value, "gauge", tags));
  }

  histogram(name: string, value: number, tags?: Record<string, string>): void {
    this.metrics.push(this._createSample(name, value, "histogram", tags));
  }

  getMetrics(): MetricSample[] {
    return structuredClone(this.metrics);
  }

  getAverage(metricName: string): number {
    const samples = this.metrics.filter((m) => m.name === metricName);
    if (samples.length === 0) return 0;
    const sum = samples.reduce((s, val) => s + val.value, 0);
    return sum / samples.length;
  }

  clear(): void {
    this.metrics = [];
  }

  private _createSample(
    name: string,
    value: number,
    type: "counter" | "gauge" | "histogram",
    tags?: Record<string, string>
  ): MetricSample {
    return {
      name,
      value,
      type,
      tags: tags ? { ...tags } : undefined,
      timestamp: new Date().toISOString(),
    };
  }
}
