/**
 * FactoryOS v1 — 5-Layer Autonomous Memory Architecture
 */

import { randomUUID } from "node:crypto";
import type { IMemoryRepository, MemoryRecord } from "../database/DatabaseContracts";
import { InMemoryMemoryRepository } from "../database/InMemoryDatabase";

export class MemoryEngine {
  private repository: IMemoryRepository;
  private workingMemory: Map<string, unknown> = new Map();

  constructor(repository: IMemoryRepository = new InMemoryMemoryRepository()) {
    this.repository = repository;
  }

  // Layer 1: Working Memory (Live ephemeral context during an active run)
  setWorking(key: string, value: unknown): void {
    this.workingMemory.set(key, structuredClone(value));
  }

  getWorking<T = unknown>(key: string): T | undefined {
    const val = this.workingMemory.get(key);
    return val !== undefined ? (structuredClone(val) as T) : undefined;
  }

  clearWorking(): void {
    this.workingMemory.clear();
  }

  // Persistent Layers: EPISODIC, SEMANTIC, OPERATIONAL, CASE, TRANSITION
  async remember(
    layer: MemoryRecord["layer"],
    key: string,
    content: string,
    metadata: Record<string, unknown> = {},
    confidence: number = 0.95
  ): Promise<MemoryRecord> {
    const existing = await this.repository.getMemory(layer, key);
    const now = new Date().toISOString();

    const record: MemoryRecord = {
      memoryId: existing ? existing.memoryId : `mem_${randomUUID().replace(/-/g, "").substring(0, 10)}`,
      layer,
      key,
      content,
      metadata: structuredClone(metadata),
      confidence,
      accessCount: existing ? existing.accessCount + 1 : 1,
      createdAt: existing ? existing.createdAt : now,
      lastAccessedAt: now,
    };

    await this.repository.saveMemory(record);
    return record;
  }

  async recall(layer: MemoryRecord["layer"], key: string): Promise<MemoryRecord | null> {
    const record = await this.repository.getMemory(layer, key);
    if (record) {
      // Update access count and timestamp
      const updated: MemoryRecord = {
        ...record,
        accessCount: record.accessCount + 1,
        lastAccessedAt: new Date().toISOString(),
      };
      await this.repository.saveMemory(updated);
      return updated;
    }
    return null;
  }

  async searchMemories(layer?: MemoryRecord["layer"], queryText?: string, limit: number = 10): Promise<MemoryRecord[]> {
    return this.repository.queryMemories(layer, queryText, limit);
  }
}
