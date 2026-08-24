import fs from "fs";
import path from "path";

export interface BenchmarkRecord {
  task: string;
  provider: string;
  model: string;
  capability: string;
  promptHash: string;
  responseHash: string;
  executionTime: number; // ms
  memoryUsage: number; // bytes
  cpuUsage: number; // %
  gpuUsage: number; // %
  temperature: number;
  maxTokens: number;
  costUSD: number;
  jsonSuccess: boolean;
  retryCount: number;
  hookScore?: number;
  sceneScore?: number;
  videoSuccess?: boolean;
}

class BenchmarkDatabaseClass {
  private memoryCache: BenchmarkRecord[] = [];
  private dbPath = "";
  private isSqliteAvailable = false;
  private sqliteDb: any = null;

  constructor() {
    this.initDatabase();
  }

  private initDatabase() {
    // Resolve repo root relative path: apps/web/generated/benchmarks.db
    const outDir = path.join(__dirname, "..", "generated");
    if (!fs.existsSync(outDir)) {
      try {
        fs.mkdirSync(outDir, { recursive: true });
      } catch {
        // ignore write issues in read-only envs
      }
    }
    this.dbPath = path.join(outDir, "benchmarks.db");

    try {
      // Attempt to load better-sqlite3 library dynamically
      const Database = require("better-sqlite3");
      this.sqliteDb = new Database(this.dbPath);
      this.isSqliteAvailable = true;

      this.sqliteDb.exec(`
        CREATE TABLE IF NOT EXISTS benchmarks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task TEXT,
          provider TEXT,
          model TEXT,
          capability TEXT,
          promptHash TEXT,
          responseHash TEXT,
          executionTime INTEGER,
          memoryUsage INTEGER,
          cpuUsage REAL,
          gpuUsage REAL,
          temperature REAL,
          maxTokens INTEGER,
          costUSD REAL,
          jsonSuccess INTEGER,
          retryCount INTEGER,
          hookScore REAL,
          sceneScore REAL,
          videoSuccess INTEGER,
          createdAt TEXT
        )
      `);
      console.log(`[BenchmarkDB] SQLite initialized at ${this.dbPath}`);
    } catch (e) {
      console.warn("[BenchmarkDB] SQLite library not available. Falling back to local JSON and in-memory cache.");
      this.isSqliteAvailable = false;
    }
  }

  /**
   * Records a new capability execution benchmark record.
   */
  async record(record: BenchmarkRecord): Promise<void> {
    const createdAt = new Date().toISOString();
    this.memoryCache.push(record);

    if (this.isSqliteAvailable && this.sqliteDb) {
      try {
        const stmt = this.sqliteDb.prepare(`
          INSERT INTO benchmarks (
            task, provider, model, capability, promptHash, responseHash,
            executionTime, memoryUsage, cpuUsage, gpuUsage, temperature, maxTokens,
            costUSD, jsonSuccess, retryCount, hookScore, sceneScore, videoSuccess, createdAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
          record.task,
          record.provider,
          record.model,
          record.capability,
          record.promptHash,
          record.responseHash,
          record.executionTime,
          record.memoryUsage,
          record.cpuUsage,
          record.gpuUsage,
          record.temperature,
          record.maxTokens,
          record.costUSD,
          record.jsonSuccess ? 1 : 0,
          record.retryCount,
          record.hookScore ?? null,
          record.sceneScore ?? null,
          record.videoSuccess !== undefined ? (record.videoSuccess ? 1 : 0) : null,
          createdAt
        );
      } catch (err) {
        console.error("[BenchmarkDB] Error inserting record into SQLite:", err);
      }
    } else {
      // JSON File Fallback
      const fallbackPath = path.join(__dirname, "..", "generated", "benchmarks-fallback.json");
      try {
        let current: any[] = [];
        if (fs.existsSync(fallbackPath)) {
          current = JSON.parse(fs.readFileSync(fallbackPath, "utf-8"));
        }
        current.push({ ...record, createdAt });
        // Keep file small (last 500 records) to prevent disk issues
        if (current.length > 500) {
          current = current.slice(-500);
        }
        fs.writeFileSync(fallbackPath, JSON.stringify(current, null, 2), "utf-8");
      } catch (err) {
        // ignore disk issues
      }
    }
  }

  /**
   * Retrieves benchmark averages to assist the Intelligent Router.
   */
  async getModelStats(modelId: string, capability: string): Promise<{ avgLatency: number; jsonSuccessRate: number; avgCost: number }> {
    const defaultStats = { avgLatency: 1500, jsonSuccessRate: 0.95, avgCost: 0.0 };

    if (this.isSqliteAvailable && this.sqliteDb) {
      try {
        const row = this.sqliteDb.prepare(`
           SELECT 
             AVG(executionTime) as avgLatency, 
             AVG(jsonSuccess) as jsonSuccessRate,
             AVG(costUSD) as avgCost
           FROM benchmarks 
           WHERE model = ? AND capability = ?
        `).get(modelId, capability);

        if (!row || (row as any).avgLatency === null) {
          return defaultStats;
        } else {
          const r = row as any;
          return {
            avgLatency: Math.round(r.avgLatency),
            jsonSuccessRate: r.jsonSuccessRate ?? 1.0,
            avgCost: r.avgCost ?? 0.0,
          };
        }
      } catch (err) {
        return defaultStats;
      }
    } else {
      // In-Memory Search
      const matches = this.memoryCache.filter((r) => r.model === modelId && r.capability === capability);
      if (matches.length === 0) return defaultStats;

      const sumLatency = matches.reduce((acc, curr) => acc + curr.executionTime, 0);
      const sumJson = matches.reduce((acc, curr) => acc + (curr.jsonSuccess ? 1 : 0), 0);
      const sumCost = matches.reduce((acc, curr) => acc + curr.costUSD, 0);

      return {
        avgLatency: Math.round(sumLatency / matches.length),
        jsonSuccessRate: sumJson / matches.length,
        avgCost: sumCost / matches.length,
      };
    }
  }
}

export const BenchmarkDatabase = new BenchmarkDatabaseClass();
export const BenchmarkRecorder = BenchmarkDatabase;
