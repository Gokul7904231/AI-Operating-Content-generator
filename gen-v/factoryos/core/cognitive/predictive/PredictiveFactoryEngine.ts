/**
 * FactoryOS Frontier v2 — Predictive Factory Engine
 * Analyzes telemetry degradation trends, forecasts resource exhaustion, and plans preventive actions.
 */

import { randomUUID } from "node:crypto";
import type { DegradationTrend, PreventiveAction } from "../CognitiveContracts";
import type { WorldState } from "../../contracts/WorldStateContracts";

export interface TelemetrySample {
  readonly timestamp: number;
  readonly cpuPercent: number;
  readonly memoryUsedMb: number;
  readonly vramUsedMb: number;
  readonly floorQueueDepths: Record<string, number>;
}

export class PredictiveFactoryEngine {
  private history: TelemetrySample[] = [];

  recordSample(sample: TelemetrySample): void {
    this.history.push(structuredClone(sample));
    if (this.history.length > 200) {
      this.history.shift();
    }
  }

  /**
   * Analyzes degradation trends and calculates rising failure probabilities.
   */
  forecastTrends(worldState: WorldState): DegradationTrend[] {
    const trends: DegradationTrend[] = [];
    if (this.history.length < 3) return trends;

    const recent = this.history.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeSpanMin = Math.max(0.1, (last.timestamp - first.timestamp) / (1000 * 60));

    // 1. CPU exhaustion trend
    const cpuDelta = last.cpuPercent - first.cpuPercent;
    const cpuRatePerMin = cpuDelta / timeSpanMin;
    if (cpuRatePerMin > 5.0 && last.cpuPercent > 60) {
      const remainingCpu = 95 - last.cpuPercent;
      const timeToThresholdMs = Math.max(1000, (remainingCpu / cpuRatePerMin) * 60 * 1000);
      trends.push({
        floorId: "system_kernel",
        metricName: "host_cpu",
        currentRateOfChange: cpuRatePerMin,
        estimatedTimeToThresholdMs: timeToThresholdMs,
        failureProbability: Math.min(0.95, 0.5 + (last.cpuPercent / 100) * 0.4),
        severity: last.cpuPercent > 85 ? "HIGH" : "MEDIUM",
        trendSummary: `CPU climbing at +${cpuRatePerMin.toFixed(1)}%/min. Threshold breach projected in ${(timeToThresholdMs / 1000).toFixed(0)}s.`,
      });
    }

    // 2. VRAM exhaustion trend
    const vramDelta = last.vramUsedMb - first.vramUsedMb;
    const vramRatePerMin = vramDelta / timeSpanMin;
    const totalVram = worldState.resources.vramTotalMb || 8192;
    if (vramRatePerMin > 100 && last.vramUsedMb / totalVram > 0.6) {
      const remainingVram = totalVram * 0.95 - last.vramUsedMb;
      const timeToThresholdMs = Math.max(1000, (remainingVram / vramRatePerMin) * 60 * 1000);
      trends.push({
        floorId: "floor03_asset_realization",
        metricName: "gpu_vram",
        currentRateOfChange: vramRatePerMin,
        estimatedTimeToThresholdMs: timeToThresholdMs,
        failureProbability: 0.85,
        severity: "HIGH",
        trendSummary: `VRAM consumption growing at +${vramRatePerMin.toFixed(0)}MB/min. OOM projected in ${(timeToThresholdMs / 1000).toFixed(0)}s.`,
      });
    }

    // 3. Queue congestion trends
    for (const [floorId, floor] of Object.entries(worldState.floors)) {
      const firstDepth = first.floorQueueDepths[floorId] || 0;
      const lastDepth = last.floorQueueDepths[floorId] || 0;
      const queueGrowthRate = (lastDepth - firstDepth) / timeSpanMin;

      if (queueGrowthRate > 2 && lastDepth > 10) {
        trends.push({
          floorId,
          metricName: `${floorId}_queue_growth`,
          currentRateOfChange: queueGrowthRate,
          estimatedTimeToThresholdMs: 30000,
          failureProbability: 0.75,
          severity: "MEDIUM",
          trendSummary: `Floor ${floor.name} queue accumulating backlog at +${queueGrowthRate.toFixed(1)} tasks/min.`,
        });
      }
    }

    return trends;
  }

  /**
   * Plans non-destructive proactive actions to prevent anticipated failures.
   */
  planPreventiveActions(trends: DegradationTrend[]): PreventiveAction[] {
    const actions: PreventiveAction[] = [];

    for (const trend of trends) {
      if (trend.metricName === "host_cpu") {
        actions.push({
          actionId: `prev_${randomUUID().substring(0, 8)}`,
          floorId: trend.floorId,
          target: "compute_scheduler",
          actionType: "THROTTLE_CONCURRENT_WORKERS",
          rationale: `Proactive worker throttling to prevent CPU exhaustion: ${trend.trendSummary}`,
          riskScore: 0.1,
          requiresGuardianApproval: false,
          executed: false,
        });
      } else if (trend.metricName === "gpu_vram") {
        actions.push({
          actionId: `prev_${randomUUID().substring(0, 8)}`,
          floorId: trend.floorId,
          target: "render_buffer",
          actionType: "FLUSH_GPU_TEXTURE_CACHE",
          rationale: `Proactive cache flush to avert VRAM OOM: ${trend.trendSummary}`,
          riskScore: 0.2,
          requiresGuardianApproval: false,
          executed: false,
        });
      }
    }

    return actions;
  }
}
