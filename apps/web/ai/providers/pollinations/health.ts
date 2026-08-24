import { ProviderHealthMetrics, ProviderState } from "../../capability-registry";

export interface PollinationsHealthState {
  status: ProviderState;
  latency: number;
  successRate: number;
  lastChecked: number;
}

export class PollinationsHealthTracker {
  private metrics: ProviderHealthMetrics;

  constructor(metrics: ProviderHealthMetrics) {
    this.metrics = metrics;
  }

  async checkUptime(baseUrl: string): Promise<boolean> {
    const start = Date.now();
    try {
      // Ping the models endpoint as a lightweight health check
      const res = await fetch(`${baseUrl}/v1/models`, { method: "GET" });
      const latency = Date.now() - start;
      
      this.metrics.lastChecked = Date.now();
      if (res.ok) {
        this.metrics.state = "ONLINE";
        this.metrics.latency = latency;
        this.metrics.avgResponseTime = this.metrics.avgResponseTime * 0.8 + latency * 0.2;
        this.metrics.errorRate = this.metrics.errorRate * 0.9; // decay error rate
        return true;
      } else {
        this.metrics.state = "DEGRADED";
        this.metrics.errorRate = this.metrics.errorRate * 0.9 + 0.1;
        return false;
      }
    } catch (err) {
      this.metrics.state = "OFFLINE";
      this.metrics.errorRate = this.metrics.errorRate * 0.9 + 0.1;
      this.metrics.lastChecked = Date.now();
      return false;
    }
  }

  recordSuccess(latencyMs: number) {
    this.metrics.state = "ONLINE";
    this.metrics.latency = latencyMs;
    this.metrics.avgResponseTime = this.metrics.avgResponseTime * 0.8 + latencyMs * 0.2;
    this.metrics.errorRate = this.metrics.errorRate * 0.9;
    this.metrics.lastChecked = Date.now();
  }

  recordFailure() {
    this.metrics.state = "DEGRADED";
    this.metrics.errorRate = this.metrics.errorRate * 0.9 + 0.1;
    this.metrics.lastChecked = Date.now();
  }
}
