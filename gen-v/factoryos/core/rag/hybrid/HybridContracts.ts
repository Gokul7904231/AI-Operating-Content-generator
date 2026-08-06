/**
 * FactoryOS v0.1 — Hybrid RAG Contracts
 *
 * Models for evidence fusion combining Vector RAG and Graph RAG.
 */

import type { RetrievalResult as VectorRetrievalResult } from "../vector/VectorContracts";
import type { GraphRetrievalResult } from "../graph/GraphContracts";

export type EvidenceSourceType = "vector" | "graph" | "hybrid";

export interface UnifiedEvidence {
  id: string;
  content: string;
  score: number; // Normalized score [0.0, 1.0]
  sources: EvidenceSourceType[];
  provenance: {
    docId?: string;
    nodeId?: string;
    metadata?: Record<string, unknown>;
  };
}

export interface EvidencePack {
  query: string;
  items: UnifiedEvidence[];
  vectorCount: number;
  graphCount: number;
  fusionMethod: "weighted_reciprocal_rank" | "linear_fusion";
  durationMs: number;
}

export interface FusionWeights {
  vectorWeight?: number; // Default 0.6
  graphWeight?: number;  // Default 0.4
}

export interface HybridRetriever {
  ingest(documents: Array<{ id: string; content: string; metadata?: Record<string, unknown> }>): Promise<void>;
  retrieve(query: string, options?: { topK?: number; maxGraphDepth?: number; weights?: FusionWeights }): Promise<EvidencePack>;
}
