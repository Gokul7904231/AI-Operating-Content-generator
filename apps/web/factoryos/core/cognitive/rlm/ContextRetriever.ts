/**
 * FactoryOS Frontier v2 — Context Retriever & Ranker & Dereferencer
 * Filters, scores, ranks, and programmatically resolves external context slices on demand.
 */

import type { ContextReference, ContextSlice } from "../CognitiveContracts";
import type { ContextIndexer } from "./ContextIndexer";

export interface RetrieveOptions {
  readonly query?: string;
  readonly tags?: string[];
  readonly types?: ContextReference["type"][];
  readonly minConfidence?: number;
  readonly maxTokens?: number;
  readonly limit?: number;
}

export class ContextRanker {
  score(ref: ContextReference, queryTerms: string[], targetTags: string[]): number {
    let score = 0.0;
    const titleLower = ref.title.toLowerCase();
    const summaryLower = ref.summary.toLowerCase();

    // Keyword matching in title and summary
    for (const term of queryTerms) {
      if (titleLower.includes(term)) score += 0.4;
      if (summaryLower.includes(term)) score += 0.2;
    }

    // Tag matching
    if (targetTags.length > 0 && ref.tags) {
      const matchCount = ref.tags.filter((t) => targetTags.includes(t.toLowerCase())).length;
      score += matchCount * 0.3;
    }

    // Confidence weighting
    score *= ref.confidence;

    // Recency weighting (penalty for stale context > 1 hr old)
    const ageHours = (Date.now() - new Date(ref.timestamp).getTime()) / (1000 * 60 * 60);
    const recencyFactor = Math.max(0.2, 1.0 - Math.min(0.8, ageHours * 0.05));
    score *= recencyFactor;

    return score;
  }
}

export class ContextRetriever {
  private ranker: ContextRanker;

  constructor(private indexer: ContextIndexer) {
    this.ranker = new ContextRanker();
  }

  retrieveSlice(options: RetrieveOptions = {}): ContextSlice {
    const allRefs = this.indexer.getAllReferences();
    const queryTerms = options.query
      ? options.query.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
      : [];
    const targetTags = options.tags ? options.tags.map((t) => t.toLowerCase()) : [];

    let filtered = allRefs;

    if (options.types && options.types.length > 0) {
      filtered = filtered.filter((r) => options.types!.includes(r.type));
    }

    if (options.minConfidence !== undefined) {
      filtered = filtered.filter((r) => r.confidence >= options.minConfidence!);
    }

    // Score and rank
    const scored = filtered.map((ref) => ({
      ref,
      score: this.ranker.score(ref, queryTerms, targetTags),
    }));

    if (queryTerms.length > 0 || targetTags.length > 0) {
      scored.sort((a, b) => b.score - a.score);
    }

    const limit = options.limit || 20;
    const maxTokens = options.maxTokens || 4000;

    const selected: ContextReference[] = [];
    let currentTokens = 0;

    for (const item of scored) {
      if (selected.length >= limit) break;
      const refTokenCost = Math.ceil(item.ref.summary.length / 4);
      if (currentTokens + refTokenCost > maxTokens && selected.length > 0) break;

      selected.push(item.ref);
      currentTokens += refTokenCost;
    }

    const totalRawTokens = this.indexer.getTotalIndexedTokens();
    const compressionRatio = totalRawTokens > 0 ? currentTokens / totalRawTokens : 1.0;

    return {
      sliceId: `slice_${Date.now()}`,
      references: selected,
      totalTokens: currentTokens,
      compressionRatio,
      generatedAt: new Date().toISOString(),
    };
  }

  retrieveContext(options: RetrieveOptions = {}): ContextSlice {
    return this.retrieveSlice(options);
  }

  dereference(refId: string): string {
    const raw = this.indexer.getRawContent(refId);
    if (raw === undefined) {
      throw new Error(`Cannot dereference ${refId}: not found in indexer/store.`);
    }
    return raw;
  }
}

export class ContextDereferencer {
  constructor(private indexer: ContextIndexer) {}

  dereference(refId: string): { reference: ContextReference; rawContent: string; metadata?: Record<string, unknown> } | null {
    const ref = this.indexer.getReference(refId);
    const content = this.indexer.getRawContent(refId);
    if (!ref || content === undefined) return null;

    const meta = this.indexer.getMetadata(refId);
    return {
      reference: {
        ...ref,
        isDereferenced: true,
      },
      rawContent: content,
      metadata: meta,
    };
  }
}
