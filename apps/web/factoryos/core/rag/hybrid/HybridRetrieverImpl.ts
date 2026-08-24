/**
 * FactoryOS v0.1 — Hybrid Retriever Implementation
 *
 * Coordinates parallel retrieval from Vector RAG and Graph RAG,
 * then combines and reranks evidence using the EvidenceFusion engine.
 */

import type {
  HybridRetriever,
  EvidencePack,
  FusionWeights,
} from "./HybridContracts";

import { VectorRetrieverImpl } from "../vector/VectorRetrieverImpl";
import { GraphRetrieverImpl } from "../graph/GraphRetrieverImpl";
import { EvidenceFusion } from "./EvidenceFusion";

export interface HybridRetrieverOptions {
  vectorRetriever?: VectorRetrieverImpl;
  graphRetriever?: GraphRetrieverImpl;
}

export class HybridRetrieverImpl implements HybridRetriever {
  readonly vectorRetriever: VectorRetrieverImpl;
  readonly graphRetriever: GraphRetrieverImpl;

  constructor(options: HybridRetrieverOptions = {}) {
    this.vectorRetriever = options.vectorRetriever ?? new VectorRetrieverImpl();
    this.graphRetriever = options.graphRetriever ?? new GraphRetrieverImpl();
  }

  async ingest(
    documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>
  ): Promise<void> {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return;
    }

    // Ingest into both parallel retrieval systems
    await Promise.all([
      this.vectorRetriever.ingest(documents),
      this.graphRetriever.ingest(documents),
    ]);
  }

  async retrieve(
    query: string,
    options: { topK?: number; maxGraphDepth?: number; weights?: FusionWeights } = {}
  ): Promise<EvidencePack> {
    const t0 = Date.now();
    const topK = options.topK ?? 5;
    const maxGraphDepth = options.maxGraphDepth ?? 2;
    const weights = options.weights ?? {};

    if (!query || typeof query !== "string" || query.trim() === "") {
      return {
        query: query ?? "",
        items: [],
        vectorCount: 0,
        graphCount: 0,
        fusionMethod: "linear_fusion",
        durationMs: Date.now() - t0,
      };
    }

    // Retrieve from both systems in parallel
    const [vectorResult, graphResult] = await Promise.all([
      this.vectorRetriever.retrieve(query, topK),
      this.graphRetriever.retrieve(query, maxGraphDepth),
    ]);

    const durationMs = Date.now() - t0;

    // Fuse and rerank the results
    return EvidenceFusion.fuse(query, vectorResult, graphResult, weights, durationMs);
  }
}
