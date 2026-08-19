/**
 * FactoryOS Frontier v2 — Context Indexer (RLM External Context Architecture)
 * Externalizes large documents, event streams, case histories, and telemetry into indexed reference headers.
 */

import { randomUUID } from "node:crypto";
import type { ContextReference } from "../CognitiveContracts";
import { PersistentContextStore } from "./PersistentContextStore";

export interface IndexItemInput {
  readonly type: ContextReference["type"];
  readonly title: string;
  readonly content: string;
  readonly source: string;
  readonly tags?: string[];
  readonly confidence?: number;
  readonly timestamp?: string;
  readonly metadata?: Record<string, unknown>;
}

export class ContextIndexer {
  private index: Map<string, ContextReference> = new Map();
  private rawStore: Map<string, string> = new Map();
  private metadataStore: Map<string, Record<string, unknown>> = new Map();
  public persistentStore?: PersistentContextStore;

  constructor(persistentStore?: PersistentContextStore) {
    this.persistentStore = persistentStore;
    if (this.persistentStore) {
      const persistedRefs = this.persistentStore.getReferences();
      for (const ref of persistedRefs) {
        this.index.set(ref.refId, ref);
      }
    }
  }

  /**
   * Indexes content externally: stores raw content in rawStore/disk, generates a compact reference header.
   */
  indexItem(input: IndexItemInput): ContextReference {
    if (this.persistentStore) {
      const ref = this.persistentStore.storeEvidence({
        type: input.type,
        title: input.title,
        content: input.content,
        source: input.source,
        tags: input.tags || [],
        metadata: input.metadata,
      });
      this.index.set(ref.refId, ref);
      return structuredClone(ref);
    }

    const refId = `ref_${randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = input.timestamp || new Date().toISOString();
    const tokenCount = Math.ceil(input.content.length / 4); // Approximation 4 chars/token

    // Create compact summary (first 160 chars or title)
    const summary =
      input.content.length > 160
        ? `${input.content.substring(0, 157)}...`
        : input.content;

    const ref: ContextReference = {
      refId,
      type: input.type,
      title: input.title,
      summary,
      tokenCount,
      timestamp: now,
      confidence: input.confidence ?? 0.95,
      source: input.source,
      tags: input.tags ? [...input.tags] : [],
      isDereferenced: false,
    };

    this.index.set(refId, ref);
    this.rawStore.set(refId, input.content);
    if (input.metadata) {
      this.metadataStore.set(refId, structuredClone(input.metadata));
    }

    return structuredClone(ref);
  }

  indexBatch(items: IndexItemInput[]): ContextReference[] {
    return items.map((item) => this.indexItem(item));
  }

  getReference(refId: string): ContextReference | undefined {
    const ref = this.index.get(refId);
    return ref ? structuredClone(ref) : undefined;
  }

  getRawContent(refId: string): string | undefined {
    if (this.persistentStore) {
      try {
        return this.persistentStore.dereferenceRaw(refId);
      } catch {
        return undefined;
      }
    }
    return this.rawStore.get(refId);
  }

  getMetadata(refId: string): Record<string, unknown> | undefined {
    const meta = this.metadataStore.get(refId);
    return meta ? structuredClone(meta) : undefined;
  }

  getAllReferences(): ContextReference[] {
    return Array.from(this.index.values()).map((r) => structuredClone(r));
  }

  getTotalIndexedTokens(): number {
    let total = 0;
    for (const ref of this.index.values()) {
      total += ref.tokenCount;
    }
    return total;
  }

  clear(): void {
    this.index.clear();
    this.rawStore.clear();
    this.metadataStore.clear();
  }
}
