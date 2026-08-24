/**
 * FactoryOS v0.1 — CheckpointStore
 *
 * Abstract interface for checkpoint persistence.
 * Step 1 provides an InMemoryCheckpointStore for deterministic tests.
 *
 * Durability (SQLite/Redis/Postgres) is deferred to a later phase.
 * See BACKLOG.md → "distributed checkpoint persistence".
 *
 * Checkpoint Safety Rule (spec §13):
 *   Checkpoints are written ONLY after a worker successfully completes.
 *   The runtime enforces this sequence:
 *     worker.execute() → result.success → mark COMPLETED → persist checkpoint
 */

import type { StepStatus } from "../state/StepState";

/**
 * A single persisted step checkpoint.
 */
export interface StepCheckpoint {
  checkpointId: string;
  workflowId: string;
  workflowVersion: string;
  runId: string;
  stepId: string;
  stepStatus: StepStatus;
  /** Accumulated outputs as of this step completing */
  output: unknown;
  createdAt: string;
}

/**
 * CheckpointStore — the storage abstraction for FactoryOS.
 *
 * Implementations must be safe to call concurrently for DIFFERENT runIds.
 * Concurrent access for the SAME runId is prevented by FactoryRuntime's
 * per-run execution lock (see FactoryRuntime.ts).
 */
export interface CheckpointStore {
  /** Persist a checkpoint for a completed step */
  save(checkpoint: StepCheckpoint): Promise<void>;

  /**
   * Retrieve all checkpoints for a given run, ordered by creation time.
   * Returns an empty array if no checkpoints exist.
   */
  getRun(runId: string): Promise<StepCheckpoint[]>;

  /**
   * Retrieve the most recent checkpoint for a specific step in a run.
   * Returns null if no checkpoint exists for that step.
   */
  getLatest(runId: string, stepId: string): Promise<StepCheckpoint | null>;

  /**
   * Delete all checkpoints for a run.
   * Used for cleanup after COMPLETED or CANCELLED.
   * Optional — implementations may choose not to delete.
   */
  deleteRun?(runId: string): Promise<void>;
}

// ─── In-Memory Implementation ─────────────────────────────────────────────────

/**
 * InMemoryCheckpointStore
 *
 * Deterministic, synchronous-backed, zero-dependency checkpoint store.
 * Suitable for test isolation and Step 1 verification.
 *
 * LIMITATION: Data does not survive process restart.
 * This is explicitly documented and acknowledged.
 * See BACKLOG.md → "distributed checkpoint persistence".
 */
export class InMemoryCheckpointStore implements CheckpointStore {
  /** runId → stepId → list of checkpoints (multiple attempts) */
  private store = new Map<string, Map<string, StepCheckpoint[]>>();

  async save(checkpoint: StepCheckpoint): Promise<void> {
    if (!this.store.has(checkpoint.runId)) {
      this.store.set(checkpoint.runId, new Map());
    }
    const runStore = this.store.get(checkpoint.runId)!;
    if (!runStore.has(checkpoint.stepId)) {
      runStore.set(checkpoint.stepId, []);
    }
    runStore.get(checkpoint.stepId)!.push(structuredClone(checkpoint));
  }

  async getRun(runId: string): Promise<StepCheckpoint[]> {
    const runStore = this.store.get(runId);
    if (!runStore) return [];
    const all: StepCheckpoint[] = [];
    for (const checkpoints of runStore.values()) {
      all.push(...checkpoints);
    }
    // Return in insertion order (Map preserves insertion order)
    return all
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map((c) => structuredClone(c));
  }

  async getLatest(runId: string, stepId: string): Promise<StepCheckpoint | null> {
    const runStore = this.store.get(runId);
    if (!runStore) return null;
    const checkpoints = runStore.get(stepId);
    if (!checkpoints || checkpoints.length === 0) return null;
    return structuredClone(checkpoints[checkpoints.length - 1]);
  }

  async deleteRun(runId: string): Promise<void> {
    this.store.delete(runId);
  }

  /** Test helper — returns total checkpoint count across all runs */
  totalCount(): number {
    let count = 0;
    for (const runStore of this.store.values()) {
      for (const checkpoints of runStore.values()) {
        count += checkpoints.length;
      }
    }
    return count;
  }

  /** Test helper — returns all checkpoints for a run as a flat array */
  snapshotRun(runId: string): StepCheckpoint[] {
    const runStore = this.store.get(runId);
    if (!runStore) return [];
    const all: StepCheckpoint[] = [];
    for (const checkpoints of runStore.values()) {
      all.push(...checkpoints);
    }
    return all.map((c) => structuredClone(c));
  }
}
