/**
 * FactoryOS v0.1 — Evidence Fusion Engine
 *
 * Fuses Vector RAG results and Graph RAG results into a unified, reranked EvidencePack.
 * Deduplicates overlapping concepts and preserves strict provenance for every item.
 */

import type {
  UnifiedEvidence,
  EvidencePack,
  FusionWeights,
  EvidenceSourceType,
} from "./HybridContracts";

import type { RetrievalResult as VectorRetrievalResult } from "../vector/VectorContracts";
import type { GraphRetrievalResult } from "../graph/GraphContracts";

export class EvidenceFusion {
  static fuse(
    query: string,
    vectorResult: VectorRetrievalResult,
    graphResult: GraphRetrievalResult,
    weights: FusionWeights = {},
    durationMs = 0
  ): EvidencePack {
    const vectorWeight = weights.vectorWeight ?? 0.6;
    const graphWeight = weights.graphWeight ?? 0.4;

    const map = new Map<string, UnifiedEvidence>();

    // 1. Process Vector Evidence
    if (vectorResult && vectorResult.evidence) {
      const maxVecScore = Math.max(...vectorResult.evidence.map((e) => e.score), 1e-6);

      for (let i = 0; i < vectorResult.evidence.length; i++) {
        const ve = vectorResult.evidence[i];
        // Normalized score in range [0, 1]
        const normScore = (ve.score / maxVecScore) * vectorWeight;
        const key = ve.docId ?? ve.id;

        map.set(key, {
          id: ve.id,
          content: ve.content,
          score: normScore,
          sources: ["vector"],
          provenance: {
            docId: ve.docId,
            metadata: ve.metadata,
          },
        });
      }
    }

    // 2. Process Graph Evidence
    if (graphResult && graphResult.evidence) {
      for (const ge of graphResult.evidence) {
        const key = ge.node.properties?.docId
          ? String(ge.node.properties.docId)
          : `node_${ge.node.id}`;

        const connectedNames = ge.connectedNodes.map((n) => n.label).join(", ");
        const graphContent = `Entity ${ge.node.label} (${ge.node.type}) connects to: ${connectedNames}`;
        const graphScore = 0.8 * graphWeight;

        if (map.has(key)) {
          // Merge with existing vector evidence
          const existing = map.get(key)!;
          if (!existing.sources.includes("graph")) {
            existing.sources.push("graph");
          }
          if (!existing.sources.includes("hybrid")) {
            existing.sources.push("hybrid");
          }
          existing.score = Math.min(1.0, existing.score + graphScore); // Combined fused score capped at 1.0
          existing.provenance.nodeId = ge.node.id;
        } else {
          map.set(key, {
            id: `graph_${ge.node.id}`,
            content: graphContent,
            score: graphScore,
            sources: ["graph"],
            provenance: {
              docId: ge.node.properties?.docId as string | undefined,
              nodeId: ge.node.id,
            },
          });
        }
      }
    }

    // 3. Sort items deterministically descending by score
    const items = Array.from(map.values()).sort((a, b) => {
      if (Math.abs(b.score - a.score) > 1e-5) {
        return b.score - a.score;
      }
      return a.id.localeCompare(b.id); // Deterministic tie-breaker
    });

    return {
      query,
      items,
      vectorCount: vectorResult?.evidence?.length ?? 0,
      graphCount: graphResult?.evidence?.length ?? 0,
      fusionMethod: "linear_fusion",
      durationMs,
    };
  }
}
