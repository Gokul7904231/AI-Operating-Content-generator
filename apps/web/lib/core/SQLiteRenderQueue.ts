import getSafeDatabase, { SafeDatabase } from "../safe-sqlite";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { RenderQueue, QueueJob, JobStatus } from "./RenderQueue";

export function calculateRequestHash(payload: any): string {
  // Canonical sort of keys to guarantee deterministic hashes
  const sortedKeys = Object.keys(payload || {}).sort();
  const canonicalString = JSON.stringify(payload, sortedKeys);
  return crypto.createHash("sha256").update(canonicalString).digest("hex");
}

export class SQLiteRenderQueue implements RenderQueue {
  private db: SafeDatabase;

  constructor() {
    const dbDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    const dbPath = path.join(dbDir, "shortfactory.db");
    this.db = getSafeDatabase(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("synchronous = NORMAL");
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS render_jobs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL DEFAULT 3,
        priority INTEGER NOT NULL DEFAULT 0,
        request_hash TEXT NOT NULL,
        worker_id TEXT,
        started_at INTEGER,
        heartbeat_at INTEGER,
        next_retry_at INTEGER,
        last_error TEXT,
        progress_percentage REAL NOT NULL DEFAULT 0,
        step_progress_json TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_render_jobs_status_priority_created ON render_jobs(status, priority DESC, created_at ASC);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_job_id ON render_jobs(job_id);
      CREATE INDEX IF NOT EXISTS idx_render_jobs_hash ON render_jobs(request_hash);
    `);
  }

  private mapRow(row: any): QueueJob {
    return {
      id: row.id,
      jobId: row.job_id,
      payload: JSON.parse(row.payload_json),
      status: row.status as JobStatus,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      priority: row.priority,
      requestHash: row.request_hash,
      workerId: row.worker_id,
      startedAt: row.started_at,
      heartbeatAt: row.heartbeat_at,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async enqueue(params: {
    jobId: string;
    payload: any;
    priority?: number;
    maxAttempts?: number;
  }): Promise<QueueJob> {
    const hash = calculateRequestHash(params.payload);
    
    const enqueueTx = this.db.transaction(() => {
      // 1. Idempotency check: see if there's an active job running with this request hash
      const activeRow = this.db.prepare(`
        SELECT * FROM render_jobs
        WHERE request_hash = ?
          AND status IN ('queued', 'claimed', 'running', 'retrying')
        LIMIT 1
      `).get(hash) as any;

      if (activeRow) {
        return activeRow;
      }

      // 2. Insert new row
      const id = `qjob_${crypto.randomBytes(8).toString("hex")}`;
      const now = Date.now();
      const row = {
        id,
        job_id: params.jobId,
        payload_json: JSON.stringify(params.payload),
        status: "queued",
        attempts: 0,
        max_attempts: params.maxAttempts ?? 3,
        priority: params.priority ?? 0,
        request_hash: hash,
        worker_id: null,
        started_at: null,
        heartbeat_at: null,
        next_retry_at: null,
        last_error: null,
        progress_percentage: 0,
        step_progress_json: null,
        created_at: now,
        updated_at: now,
      };

      this.db.prepare(`
        INSERT INTO render_jobs (
          id, job_id, payload_json, status, attempts, max_attempts, priority,
          request_hash, worker_id, started_at, heartbeat_at, next_retry_at,
          last_error, progress_percentage, step_progress_json, created_at, updated_at
        ) VALUES (
          @id, @job_id, @payload_json, @status, @attempts, @max_attempts, @priority,
          @request_hash, @worker_id, @started_at, @heartbeat_at, @next_retry_at,
          @last_error, @progress_percentage, @step_progress_json, @created_at, @updated_at
        )
      `).run(row);

      return row;
    });

    const resultRow = enqueueTx();
    return this.mapRow(resultRow);
  }

  async claim(workerId: string): Promise<QueueJob | null> {
    const now = Date.now();

    // Use transaction for atomic claim isolation
    const claimTx = this.db.transaction(() => {
      // Find candidate: either newly queued or retrying past delay time
      const candidate = this.db.prepare(`
        SELECT * FROM render_jobs
        WHERE status = 'queued'
           OR (status = 'retrying' AND next_retry_at <= ?)
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
      `).get(now) as any;

      if (!candidate) return null;

      const nextStatus = "claimed";
      this.db.prepare(`
        UPDATE render_jobs
        SET status = ?,
            worker_id = ?,
            started_at = ?,
            heartbeat_at = ?,
            attempts = attempts + 1,
            updated_at = ?
        WHERE id = ?
      `).run(nextStatus, workerId, now, now, now, candidate.id);

      candidate.status = nextStatus;
      candidate.worker_id = workerId;
      candidate.started_at = now;
      candidate.heartbeat_at = now;
      candidate.attempts += 1;
      candidate.updated_at = now;

      return candidate;
    });

    const row = claimTx();
    return row ? this.mapRow(row) : null;
  }

  async heartbeat(id: string, workerId: string): Promise<void> {
    const now = Date.now();
    this.db.prepare(`
      UPDATE render_jobs
      SET heartbeat_at = ?, updated_at = ?
      WHERE id = ? AND worker_id = ?
    `).run(now, now, id, workerId);
  }

  async updateProgress(id: string, stepId: string, progressPercentage: number, stateJson: any): Promise<void> {
    const now = Date.now();
    this.db.prepare(`
      UPDATE render_jobs
      SET status = 'running',
          progress_percentage = ?,
          step_progress_json = ?,
          updated_at = ?
      WHERE id = ?
    `).run(progressPercentage, JSON.stringify(stateJson), now, id);
  }

  async complete(id: string, outputJson: any): Promise<void> {
    const now = Date.now();
    this.db.prepare(`
      UPDATE render_jobs
      SET status = 'completed',
          progress_percentage = 100,
          updated_at = ?
      WHERE id = ?
    `).run(now, id);
  }

  async fail(id: string, error: string, nextRetryDelaySec?: number): Promise<void> {
    const now = Date.now();
    
    // Fetch current attempts count
    const job = this.db.prepare("SELECT attempts, max_attempts FROM render_jobs WHERE id = ?").get(id) as {
      attempts: number;
      max_attempts: number;
    } | undefined;

    if (!job) return;

    if (job.attempts < job.max_attempts) {
      const delay = nextRetryDelaySec ?? 10;
      const nextRetryAt = now + delay * 1000;
      this.db.prepare(`
        UPDATE render_jobs
        SET status = 'retrying',
            next_retry_at = ?,
            last_error = ?,
            updated_at = ?
        WHERE id = ?
      `).run(nextRetryAt, error, now, id);
      console.log(`[SQLiteRenderQueue] Job ${id} marked for retry in ${delay}s. Attempts: ${job.attempts}/${job.max_attempts}`);
    } else {
      this.db.prepare(`
        UPDATE render_jobs
        SET status = 'failed',
            last_error = ?,
            updated_at = ?
        WHERE id = ?
      `).run(error, now, id);
      console.error(`[SQLiteRenderQueue] Job ${id} permanently failed. Max attempts reached: ${job.attempts}`);
    }
  }

  async cancel(jobId: string): Promise<boolean> {
    const now = Date.now();
    const info = this.db.prepare(`
      UPDATE render_jobs
      SET status = 'cancelled',
          last_error = 'Cancelled by user',
          updated_at = ?
      WHERE (job_id = ? OR id = ?) AND status NOT IN ('completed')
    `).run(now, jobId, jobId);
    return info.changes > 0;
  }

  async getJob(jobId: string): Promise<QueueJob | null> {
    const row = this.db.prepare("SELECT * FROM render_jobs WHERE job_id = ?").get(jobId);
    return row ? this.mapRow(row) : null;
  }

  async findActiveByHash(requestHash: string): Promise<QueueJob | null> {
    const row = this.db.prepare(`
      SELECT * FROM render_jobs
      WHERE request_hash = ?
        AND status IN ('queued', 'claimed', 'running', 'retrying')
      LIMIT 1
    `).get(requestHash);
    return row ? this.mapRow(row) : null;
  }

  /**
   * Recovers stale jobs where the worker stopped reporting heartbeats.
   * If a job is claimed/running and has no heartbeat within `timeoutMs`,
   * it resets the status to 'retrying' or 'failed'.
   */
  async evictStaleJobs(timeoutMs: number): Promise<void> {
    const now = Date.now();
    const threshold = now - timeoutMs;

    const staleRows = this.db.prepare(`
      SELECT * FROM render_jobs
      WHERE status IN ('claimed', 'running')
        AND (heartbeat_at IS NULL OR heartbeat_at < ?)
    `).all(threshold) as any[];

    for (const row of staleRows) {
      console.warn(`[SQLiteRenderQueue] Evicting stale job ${row.id} (Worker: ${row.worker_id}) due to heartbeat timeout.`);
      await this.fail(row.id, `Worker heartbeat timeout: no report since ${new Date(row.heartbeat_at).toISOString()}`, 5);
    }
  }
}
