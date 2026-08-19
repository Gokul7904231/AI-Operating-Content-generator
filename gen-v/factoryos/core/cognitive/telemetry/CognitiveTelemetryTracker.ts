/**
 * FactoryOS Frontier v2 — Cognitive Telemetry Tracker
 * Tracks information provenance, decision context, tools considered, predictions vs actual, and reasoning metrics.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export interface CognitiveTelemetryRecord {
  readonly recordId: string;
  readonly missionId?: string;
  readonly runId?: string;
  readonly decisionId?: string;
  readonly timestamp: string;
  readonly contextRetrieved: { refId: string; title: string; tokenCount: number }[];
  readonly contextRejected: { refId: string; reason: string }[];
  readonly toolsConsidered: string[];
  readonly toolSelected?: string;
  readonly reasoningMode: "REFLEX" | "DELIBERATE" | "DEEP";
  readonly confidence: number;
  readonly prediction?: string;
  readonly actualResult?: string;
  readonly verificationPassed?: boolean;
  readonly latencyMs: number;
  readonly tokensConsumed: number;
  readonly costUsd: number;
  readonly recursionDepth: number;
  readonly replanCount: number;
}

export interface IPersistentTelemetrySink {
  saveRecord(record: CognitiveTelemetryRecord): Promise<void>;
  loadRecords(limit?: number): Promise<CognitiveTelemetryRecord[]>;
}

export class DiskTelemetrySink implements IPersistentTelemetrySink {
  private file: string;

  constructor(baseDir?: string) {
    const dir = baseDir || path.join(process.cwd(), "data", "factoryos_state", "telemetry");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "telemetry_records.jsonl");
  }

  async saveRecord(record: CognitiveTelemetryRecord): Promise<void> {
    fs.appendFileSync(this.file, JSON.stringify(record) + "\n", "utf-8");
  }

  async loadRecords(limit: number = 100): Promise<CognitiveTelemetryRecord[]> {
    if (!fs.existsSync(this.file)) return [];
    try {
      const lines = fs.readFileSync(this.file, "utf-8").trim().split("\n").filter(Boolean);
      return lines.slice(-limit).map((l) => JSON.parse(l) as CognitiveTelemetryRecord);
    } catch {
      return [];
    }
  }
}

export class CognitiveTelemetryTracker {
  private records: CognitiveTelemetryRecord[] = [];
  public sink?: IPersistentTelemetrySink;

  constructor(sink?: IPersistentTelemetrySink) {
    this.sink = sink;
  }

  recordTrace(trace: Omit<CognitiveTelemetryRecord, "recordId" | "timestamp">): CognitiveTelemetryRecord {
    const record: CognitiveTelemetryRecord = {
      recordId: `cogtel_${randomUUID().replace(/-/g, "").substring(0, 10)}`,
      timestamp: new Date().toISOString(),
      ...trace,
    };

    this.records.push(record);
    if (this.records.length > 500) {
      this.records.shift();
    }

    if (this.sink) {
      this.sink.saveRecord(record).catch(() => {});
    }

    return structuredClone(record);
  }

  getRecentTraces(limit: number = 20): CognitiveTelemetryRecord[] {
    return this.records.slice(-limit).map((r) => structuredClone(r));
  }

  getTracesForMission(missionId: string): CognitiveTelemetryRecord[] {
    return this.records.filter((r) => r.missionId === missionId).map((r) => structuredClone(r));
  }

  getAggregateMetrics(): {
    totalTraces: number;
    averageLatencyMs: number;
    totalTokens: number;
    totalCostUsd: number;
    averageConfidence: number;
    verificationSuccessRate: number;
  } {
    if (this.records.length === 0) {
      return {
        totalTraces: 0,
        averageLatencyMs: 0,
        totalTokens: 0,
        totalCostUsd: 0,
        averageConfidence: 1.0,
        verificationSuccessRate: 1.0,
      };
    }

    let sumLatency = 0;
    let sumTokens = 0;
    let sumCost = 0;
    let sumConf = 0;
    let verificationsChecked = 0;
    let verificationsPassed = 0;

    for (const r of this.records) {
      sumLatency += r.latencyMs;
      sumTokens += r.tokensConsumed;
      sumCost += r.costUsd;
      sumConf += r.confidence;
      if (r.verificationPassed !== undefined) {
        verificationsChecked += 1;
        if (r.verificationPassed) verificationsPassed += 1;
      }
    }

    return {
      totalTraces: this.records.length,
      averageLatencyMs: sumLatency / this.records.length,
      totalTokens: sumTokens,
      totalCostUsd: sumCost,
      averageConfidence: sumConf / this.records.length,
      verificationSuccessRate: verificationsChecked > 0 ? verificationsPassed / verificationsChecked : 1.0,
    };
  }

  clear(): void {
    this.records = [];
  }
}
