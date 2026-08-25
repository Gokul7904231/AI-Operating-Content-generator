import getSafeDatabase, { SafeDatabase } from "../safe-sqlite";
import path from "path";
import fs from "fs";

const dbDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, "shortfactory.db");
const db: SafeDatabase = getSafeDatabase(dbPath);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS job_checkpoints (
    job_id TEXT PRIMARY KEY,
    current_step TEXT,
    status TEXT,
    context_snapshot TEXT,
    outputs TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workflow_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT,
    event_type TEXT,
    payload TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS execution_relations (
    subject_id TEXT,
    relation TEXT,
    object_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (subject_id, relation, object_id)
  );

  DROP TABLE IF EXISTS assets;

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    type TEXT,
    provider TEXT,
    prompt_hash TEXT,
    resolution TEXT,
    sha256 TEXT,
    job_id TEXT,
    mime_type TEXT,
    width INTEGER,
    height INTEGER,
    duration REAL,
    checksum TEXT,
    cache_status TEXT,
    version TEXT,
    source TEXT,
    expires_at TEXT,
    path TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export interface Checkpoint {
  job_id: string;
  current_step: string;
  status: string;
  context_snapshot: string; // JSON String
  outputs: string; // JSON String
  updated_at?: string;
}

export interface WorkflowEvent {
  id?: number;
  job_id: string;
  event_type: string;
  payload: string; // JSON String
  timestamp?: string;
}

export interface AssetRecord {
  id: string;
  type: string;
  provider: string;
  prompt_hash: string;
  resolution: string;
  sha256: string;
  job_id: string;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  checksum?: string;
  cache_status?: string;
  version?: string;
  source?: string;
  expires_at?: string;
  path?: string;
}

export const CheckpointDB = {
  // Checkpoints
  saveCheckpoint(jobId: string, step: string, status: string, contextSnapshot: any, outputs: any) {
    const stmt = db.prepare(`
      INSERT INTO job_checkpoints (job_id, current_step, status, context_snapshot, outputs, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(job_id) DO UPDATE SET
        current_step = excluded.current_step,
        status = excluded.status,
        context_snapshot = excluded.context_snapshot,
        outputs = excluded.outputs,
        updated_at = CURRENT_TIMESTAMP
    `);
    stmt.run(
      jobId,
      step,
      status,
      JSON.stringify(contextSnapshot),
      JSON.stringify(outputs)
    );
  },

  getCheckpoint(jobId: string): Checkpoint | null {
    const stmt = db.prepare(`SELECT * FROM job_checkpoints WHERE job_id = ?`);
    const row = stmt.get(jobId);
    return row ? (row as Checkpoint) : null;
  },

  updateCheckpointStatus(jobId: string, status: string) {
    const stmt = db.prepare(`UPDATE job_checkpoints SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE job_id = ?`);
    stmt.run(status, jobId);
  },

  deleteCheckpoint(jobId: string) {
    const stmt = db.prepare(`DELETE FROM job_checkpoints WHERE job_id = ?`);
    stmt.run(jobId);
  },

  // Event Sourcing
  logEvent(jobId: string, eventType: string, payload: any) {
    const stmt = db.prepare(`
      INSERT INTO workflow_events (job_id, event_type, payload)
      VALUES (?, ?, ?)
    `);
    stmt.run(jobId, eventType, JSON.stringify(payload));
  },

  getEvents(jobId: string): WorkflowEvent[] {
    const stmt = db.prepare(`SELECT * FROM workflow_events WHERE job_id = ? ORDER BY id ASC`);
    return stmt.all(jobId) as WorkflowEvent[];
  },

  // Asset Registry
  registerAsset(asset: AssetRecord) {
    const stmt = db.prepare(`
      INSERT INTO assets (
        id, type, provider, prompt_hash, resolution, sha256, job_id,
        mime_type, width, height, duration, checksum, cache_status,
        version, source, expires_at, path
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        provider = excluded.provider,
        prompt_hash = excluded.prompt_hash,
        resolution = excluded.resolution,
        sha256 = excluded.sha256,
        job_id = excluded.job_id,
        mime_type = excluded.mime_type,
        width = excluded.width,
        height = excluded.height,
        duration = excluded.duration,
        checksum = excluded.checksum,
        cache_status = excluded.cache_status,
        version = excluded.version,
        source = excluded.source,
        expires_at = excluded.expires_at,
        path = excluded.path
    `);
    stmt.run(
      asset.id,
      asset.type,
      asset.provider,
      asset.prompt_hash,
      asset.resolution,
      asset.sha256,
      asset.job_id,
      asset.mime_type ?? null,
      asset.width ?? null,
      asset.height ?? null,
      asset.duration ?? null,
      asset.checksum ?? null,
      asset.cache_status ?? null,
      asset.version ?? null,
      asset.source ?? null,
      asset.expires_at ?? null,
      asset.path ?? null
    );
  },

  getAsset(id: string): AssetRecord | null {
    const stmt = db.prepare(`SELECT * FROM assets WHERE id = ?`);
    const row = stmt.get(id);
    return row ? (row as AssetRecord) : null;
  },

  // Knowledge Graph Relations
  recordRelation(subjectId: string, relation: string, objectId: string) {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO execution_relations (subject_id, relation, object_id)
      VALUES (?, ?, ?)
    `);
    stmt.run(subjectId, relation, objectId);
  },

  getRelations(subjectId?: string): Array<{ subject_id: string; relation: string; object_id: string }> {
    if (subjectId) {
      const stmt = db.prepare(`SELECT * FROM execution_relations WHERE subject_id = ? OR object_id = ?`);
      return stmt.all(subjectId, subjectId) as any[];
    }
    const stmt = db.prepare(`SELECT * FROM execution_relations`);
    return stmt.all() as any[];
  },
};
