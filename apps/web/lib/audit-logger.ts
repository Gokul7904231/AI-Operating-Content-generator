/**
 * SRE Audit Logger
 *
 * Provides append-only, immutable SRE logging.
 * Implements strict INSERT statements to log key events (rotations, approvals, configuration shifts).
 * No updates or deletes allowed.
 */

// Dynamically import better-sqlite3 to write directly to queues.db
import path from "path";
import fs from "fs";
import getSafeDatabase, { SafeDatabase } from "./safe-sqlite";

export interface AuditRecord {
  action: string;
  userId: string;
  targetId: string;
  payload: Record<string, any>;
  ipAddress?: string;
}

let _db: SafeDatabase | null = null;

function getAuditDB(): SafeDatabase {
  if (_db) return _db;

  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const dbPath = path.join(dataDir, "queues.db");
  _db = getSafeDatabase(dbPath);

  _db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      action        TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      target_id     TEXT NOT NULL,
      payload_json  TEXT,
      ip_address    TEXT,
      recorded_at   INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);

  return _db;
}

export const AuditLogger = {
  /**
   * Append-only: write audit trail to DB.
   */
  log(record: AuditRecord): void {
    try {
      const dbInstance = getAuditDB();
      dbInstance.prepare(`
        INSERT INTO audit_logs (action, user_id, target_id, payload_json, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        record.action,
        record.userId,
        record.targetId,
        record.payload ? JSON.stringify(record.payload) : null,
        record.ipAddress || "127.0.0.1"
      );
      console.log(`[AuditLogger] Appended audit entry: "${record.action}" on target: "${record.targetId}"`);
    } catch (err: any) {
      console.error("[AuditLogger] Failed to write audit record:", err.message);
    }
  },

  /**
   * Read history (ordered by recorded_at DESC) for dashboard audit logging.
   */
  query(limit = 100): any[] {
    try {
      const dbInstance = getAuditDB();
      return dbInstance
        .prepare("SELECT * FROM audit_logs ORDER BY recorded_at DESC LIMIT ?")
        .all(limit);
    } catch {
      return [];
    }
  }
};
