/**
 * FactoryOS Frontier v2 — Indexed Experience Memory
 * Combines compact working memory, stable IDs, relationship linking, and full-fidelity storage.
 */

import { randomUUID } from "node:crypto";
import type { IMemoryRepository, MemoryRecord } from "../../database/DatabaseContracts";
import { InMemoryMemoryRepository } from "../../database/InMemoryDatabase";

export interface ExperienceMemoryEntry {
  readonly memoryId: string;
  readonly category: "ANOMALY_RESOLUTION" | "REPAIR_RECIPE" | "FLOOR_PERFORMANCE" | "AGENT_COLLABORATION";
  readonly title: string;
  readonly summary: string;
  readonly fullEvidence: Record<string, unknown>;
  readonly relatedMemoryIds: string[];
  readonly floorId?: string;
  readonly confidence: number;
  readonly successRate: number;
  readonly usageCount: number;
  readonly createdAt: string;
  lastAccessedAt: string;
}

export class IndexedExperienceMemory {
  private workingIndex: Map<string, ExperienceMemoryEntry> = new Map();
  private repository: IMemoryRepository;

  constructor(repository: IMemoryRepository = new InMemoryMemoryRepository()) {
    this.repository = repository;
  }

  async storeExperience(entry: {
    category: ExperienceMemoryEntry["category"];
    title: string;
    summary: string;
    fullEvidence: Record<string, unknown>;
    relatedMemoryIds?: string[];
    floorId?: string;
    confidence?: number;
  }): Promise<ExperienceMemoryEntry> {
    const memoryId = `mem_exp_${randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    const experience: ExperienceMemoryEntry = {
      memoryId,
      category: entry.category,
      title: entry.title,
      summary: entry.summary,
      fullEvidence: structuredClone(entry.fullEvidence),
      relatedMemoryIds: entry.relatedMemoryIds ? [...entry.relatedMemoryIds] : [],
      floorId: entry.floorId,
      confidence: entry.confidence ?? 0.95,
      successRate: 1.0,
      usageCount: 1,
      createdAt: now,
      lastAccessedAt: now,
    };

    this.workingIndex.set(memoryId, structuredClone(experience));

    // Save into persistent memory repository
    const record: MemoryRecord = {
      memoryId,
      layer: "CASE",
      key: `${entry.category}:${entry.title}`,
      content: JSON.stringify(experience),
      metadata: {
        category: entry.category,
        floorId: entry.floorId,
        title: entry.title,
      },
      confidence: experience.confidence,
      accessCount: 1,
      createdAt: now,
      lastAccessedAt: now,
    };

    await this.repository.saveMemory(record);
    return structuredClone(experience);
  }

  async recallByKeywords(query: string, floorId?: string, limit: number = 5): Promise<ExperienceMemoryEntry[]> {
    // If working index is empty, restore from repository
    if (this.workingIndex.size === 0) {
      const persisted = await this.repository.queryMemories("CASE", undefined, 100);
      for (const p of persisted) {
        try {
          const entry = JSON.parse(p.content) as ExperienceMemoryEntry;
          this.workingIndex.set(entry.memoryId, entry);
        } catch {}
      }
    }

    const terms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const results: { item: ExperienceMemoryEntry; score: number }[] = [];

    for (const item of this.workingIndex.values()) {
      if (floorId && item.floorId && item.floorId !== floorId) continue;

      let score = 0;
      const text = `${item.title} ${item.summary}`.toLowerCase();
      for (const term of terms) {
        if (text.includes(term)) score += 1;
      }

      if (score > 0 || terms.length === 0) {
        results.push({ item, score: score * item.confidence });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit).map((r) => structuredClone(r.item));
  }

  async getById(memoryId: string): Promise<ExperienceMemoryEntry | null> {
    const item = this.workingIndex.get(memoryId);
    if (item) {
      item.lastAccessedAt = new Date().toISOString();
      return structuredClone(item);
    }
    // Try to load from repository by memoryId
    const records = await this.repository.queryMemories("CASE", undefined, 200);
    const match = records.find((r) => r.memoryId === memoryId);
    if (match) {
      try {
        const parsed = JSON.parse(match.content) as ExperienceMemoryEntry;
        this.workingIndex.set(memoryId, parsed);
        return structuredClone(parsed);
      } catch {
        return null;
      }
    }
    return null;
  }

  async linkExperiences(memIdA: string, memIdB: string): Promise<void> {
    let a = this.workingIndex.get(memIdA);
    if (!a) {
      const recA = await this.repository.getMemory("CASE", memIdA);
      if (recA) a = JSON.parse(recA.content);
    }
    let b = this.workingIndex.get(memIdB);
    if (!b) {
      const recB = await this.repository.getMemory("CASE", memIdB);
      if (recB) b = JSON.parse(recB.content);
    }

    if (a && !a.relatedMemoryIds.includes(memIdB)) {
      a.relatedMemoryIds.push(memIdB);
      this.workingIndex.set(memIdA, structuredClone(a));
      await this.repository.saveMemory({
        memoryId: a.memoryId,
        layer: "CASE",
        key: `${a.category}:${a.title}`,
        content: JSON.stringify(a),
        metadata: { category: a.category, floorId: a.floorId, title: a.title },
        confidence: a.confidence,
        accessCount: a.usageCount,
        createdAt: a.createdAt,
        lastAccessedAt: new Date().toISOString(),
      });
    }

    if (b && !b.relatedMemoryIds.includes(memIdA)) {
      b.relatedMemoryIds.push(memIdA);
      this.workingIndex.set(memIdB, structuredClone(b));
      await this.repository.saveMemory({
        memoryId: b.memoryId,
        layer: "CASE",
        key: `${b.category}:${b.title}`,
        content: JSON.stringify(b),
        metadata: { category: b.category, floorId: b.floorId, title: b.title },
        confidence: b.confidence,
        accessCount: b.usageCount,
        createdAt: b.createdAt,
        lastAccessedAt: new Date().toISOString(),
      });
    }
  }
}
