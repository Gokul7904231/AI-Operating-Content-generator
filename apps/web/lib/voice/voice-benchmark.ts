import getSafeDatabase, { SafeDatabase } from "../safe-sqlite";
import path from "path";
import fs from "fs";

const dbDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "shortfactory.db");
const db: SafeDatabase = getSafeDatabase(dbPath);

// Initialize table
db.exec(`
  CREATE TABLE IF NOT EXISTS voice_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider_id TEXT,
    voice_id TEXT,
    latency_ms REAL,
    cold_start_ms REAL,
    warm_start_ms REAL,
    words_per_sec REAL,
    rtf REAL,
    cpu_pct REAL,
    ram_mb REAL,
    failure_count INTEGER,
    retry_count INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface VoiceBenchmarkRecord {
  providerId: string;
  voiceId: string;
  latencyMs: number;
  coldStartMs: number;
  warmStartMs: number;
  wordsPerSec: number;
  rtf: number;
  cpuPct: number;
  ramMb: number;
  failureCount: number;
  retryCount: number;
}

class VoiceBenchmarkDBClass {
  record(metrics: VoiceBenchmarkRecord) {
    try {
      const stmt = db.prepare(`
        INSERT INTO voice_benchmarks (
          provider_id, voice_id, latency_ms, cold_start_ms, warm_start_ms,
          words_per_sec, rtf, cpu_pct, ram_mb, failure_count, retry_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        metrics.providerId,
        metrics.voiceId,
        metrics.latencyMs,
        metrics.coldStartMs,
        metrics.warmStartMs,
        metrics.wordsPerSec,
        metrics.rtf,
        metrics.cpuPct,
        metrics.ramMb,
        metrics.failureCount,
        metrics.retryCount
      );
    } catch (err: any) {
      console.error("[VoiceBenchmark] Error inserting record:", err.message);
    }
  }

  getAverages(providerId: string): VoiceBenchmarkRecord | null {
    try {
      const row = db.prepare(`
        SELECT 
          AVG(latency_ms) as latencyMs,
          AVG(cold_start_ms) as coldStartMs,
          AVG(warm_start_ms) as warmStartMs,
          AVG(words_per_sec) as wordsPerSec,
          AVG(rtf) as rtf,
          AVG(cpu_pct) as cpuPct,
          AVG(ram_mb) as ramMb,
          SUM(failure_count) as failureCount,
          SUM(retry_count) as retryCount
        FROM voice_benchmarks 
        WHERE provider_id = ?
      `).get(providerId) as any;

      if (!row || row.latencyMs === null) return null;

      return {
        providerId,
        voiceId: "all",
        latencyMs: Math.round(row.latencyMs),
        coldStartMs: Math.round(row.coldStartMs),
        warmStartMs: Math.round(row.warmStartMs),
        wordsPerSec: parseFloat(row.wordsPerSec.toFixed(2)),
        rtf: parseFloat(row.rtf.toFixed(2)),
        cpuPct: parseFloat(row.cpuPct.toFixed(2)),
        ramMb: parseFloat(row.ramMb.toFixed(2)),
        failureCount: row.failureCount,
        retryCount: row.retryCount
      };
    } catch {
      return null;
    }
  }

  getHistory(limit = 50) {
    try {
      return db.prepare("SELECT * FROM voice_benchmarks ORDER BY timestamp DESC LIMIT ?").all(limit);
    } catch {
      return [];
    }
  }
}

export const VoiceBenchmarkDB = new VoiceBenchmarkDBClass();
export default VoiceBenchmarkDB;
