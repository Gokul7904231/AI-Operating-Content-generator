/**
 * SRE Historical Store
 * Stores provider health snapshots every 5 minutes to data/sre-history.json.
 * Enables trend detection: "Groq slowed down yesterday at 4PM".
 */

import fs from "fs";
import path from "path";
import { HealthSnapshot } from "./types";

const HISTORY_FILE = path.resolve(process.cwd(), "data", "sre-history.json");
const MAX_SNAPSHOTS = 2016; // 7 days × 24h × 12 snapshots/hr

class HistoricalStoreClass {
  private snapshots: HealthSnapshot[] = [];
  private loaded = false;

  private load() {
    if (this.loaded) return;
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        this.snapshots = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf-8"));
      }
    } catch { this.snapshots = []; }
    this.loaded = true;
  }

  private save() {
    try {
      fs.mkdirSync(path.dirname(HISTORY_FILE), { recursive: true });
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(this.snapshots, null, 2));
    } catch {}
  }

  record(snapshot: HealthSnapshot) {
    this.load();
    this.snapshots.push(snapshot);
    // Keep only last MAX_SNAPSHOTS
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }
    this.save();
  }

  recordMany(snapshots: HealthSnapshot[]) {
    this.load();
    this.snapshots.push(...snapshots);
    if (this.snapshots.length > MAX_SNAPSHOTS) {
      this.snapshots = this.snapshots.slice(-MAX_SNAPSHOTS);
    }
    this.save();
  }

  getAll(): HealthSnapshot[] {
    this.load();
    return this.snapshots;
  }

  getForProvider(providerId: string, sinceMs?: number): HealthSnapshot[] {
    this.load();
    return this.snapshots.filter(s =>
      s.providerId === providerId &&
      (!sinceMs || new Date(s.timestamp).getTime() > sinceMs)
    );
  }

  getLastHour(providerId: string): HealthSnapshot[] {
    return this.getForProvider(providerId, Date.now() - 3600_000);
  }

  getLastDay(providerId: string): HealthSnapshot[] {
    return this.getForProvider(providerId, Date.now() - 86400_000);
  }

  getLastWeek(providerId: string): HealthSnapshot[] {
    return this.getForProvider(providerId, Date.now() - 604800_000);
  }

  /** Returns average latency for provider over the past N hours */
  avgLatency(providerId: string, hours = 1): number {
    const snaps = this.getForProvider(providerId, Date.now() - hours * 3600_000);
    if (snaps.length === 0) return 0;
    return Math.round(snaps.reduce((a, s) => a + s.latencyMs, 0) / snaps.length);
  }

  /** Returns uptime percentage for provider over the past N hours */
  uptimePct(providerId: string, hours = 24): number {
    const snaps = this.getForProvider(providerId, Date.now() - hours * 3600_000);
    if (snaps.length === 0) return 100;
    return Math.round((snaps.filter(s => s.status !== "offline").length / snaps.length) * 100);
  }

  /** Returns last 10 latency values for sparkline rendering */
  latencySparkline(providerId: string): number[] {
    this.load();
    return this.snapshots
      .filter(s => s.providerId === providerId)
      .slice(-10)
      .map(s => s.latencyMs);
  }

  /** Records a new snapshot batch from an SRE audit */
  recordFromAudit(
    providerId: string,
    latencyMs: number,
    status: "healthy" | "degraded" | "offline",
    quotaRemainingPct: number,
    failureRate: number,
    errors: number
  ) {
    this.record({
      timestamp: new Date().toISOString(),
      providerId,
      latencyMs,
      quotaRemainingPct,
      failureRate,
      status,
      errors,
    });
  }

  /** Detect anomalies: if latency jumped > 2x vs 24h avg */
  detectAnomalies(providerId: string): string[] {
    const alerts: string[] = [];
    const recent = this.avgLatency(providerId, 1);
    const dayAvg = this.avgLatency(providerId, 24);
    if (dayAvg > 0 && recent > dayAvg * 2) {
      alerts.push(`Latency spike: current ${recent}ms vs 24h avg ${dayAvg}ms`);
    }
    const uptime = this.uptimePct(providerId, 1);
    if (uptime < 80) {
      alerts.push(`Low uptime: ${uptime}% in the last hour`);
    }
    return alerts;
  }
}

export const HistoricalStore = new HistoricalStoreClass();
