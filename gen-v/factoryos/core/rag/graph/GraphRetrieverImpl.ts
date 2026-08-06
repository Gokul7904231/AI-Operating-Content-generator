/**
 * FactoryOS v0.1 — Graph Retriever Implementation
 *
 * Coordinates Document entity extraction, graph persistence, and relationship traversal.
 */

import type {
  GraphRetriever,
  GraphStore,
  EntityExtractor,
  GraphRetrievalResult,
  GraphEvidence,
} from "./GraphContracts";

import { InMemoryGraphStore } from "./InMemoryGraphStore";
import { DeterministicEntityExtractor } from "./DeterministicEntityExtractor";

export interface GraphRetrieverOptions {
  graphStore?: GraphStore;
  extractor?: EntityExtractor;
}

export class GraphRetrieverImpl implements GraphRetriever {
  readonly graphStore: GraphStore;
  private readonly extractor: EntityExtractor;

  constructor(options: GraphRetrieverOptions = {}) {
    this.graphStore = options.graphStore ?? new InMemoryGraphStore();
    this.extractor = options.extractor ?? new DeterministicEntityExtractor();
  }

  async ingest(documents: Array<{ id: string; content: string }>): Promise<void> {
    if (!documents || !Array.isArray(documents)) return;

    for (const doc of documents) {
      if (!doc || !doc.content) continue;

      const { nodes, edges } = await this.extractor.extract(doc.content, doc.id);

      for (const node of nodes) {
        await this.graphStore.addNode(node);
      }
      for (const edge of edges) {
        await this.graphStore.addEdge(edge);
      }
    }
  }

  async retrieve(query: string, maxDepth = 2): Promise<GraphRetrievalResult> {
    const t0 = Date.now();
    if (!query || typeof query !== "string" || query.trim() === "") {
      return {
        query: query ?? "",
        evidence: [],
        traversal: { nodes: [], edges: [] },
        durationMs: Date.now() - t0,
      };
    }

    const lower = query.toLowerCase();

    // 1. Identify starting root node dynamically from query string
    const allNodes = await this.graphStore.getAllNodes();
    let rootNodeId: string | null = null;

    for (const node of allNodes) {
      const idLower = node.id.toLowerCase();
      const labelLower = node.label.toLowerCase();
      if (
        lower.includes(idLower) ||
        lower.includes(labelLower) ||
        idLower.includes(lower) ||
        labelLower.includes(lower)
      ) {
        rootNodeId = node.id;
        break;
      }
    }

    if (!rootNodeId) {
      if (lower.includes("runtime")) rootNodeId = "workflow_runtime";
      else if (lower.includes("tool")) rootNodeId = "tool_registry";
      else if (lower.includes("vector")) rootNodeId = "vector_rag";
      else if (lower.includes("graph")) rootNodeId = "graph_rag";
    }

    if (!rootNodeId) {
      return {
        query,
        evidence: [],
        traversal: { nodes: [], edges: [] },
        durationMs: Date.now() - t0,
      };
    }

    // 2. Perform cycle-safe BFS graph traversal
    const traversal = await this.graphStore.traverse(rootNodeId, { maxDepth });

    // 3. Format evidence pack
    const rootNode = traversal.nodes.find((n) => n.id === rootNodeId);
    const evidence: GraphEvidence[] = [];

    if (rootNode) {
      const connectedEdges = traversal.edges.filter(
        (e) => e.sourceId === rootNodeId || e.targetId === rootNodeId
      );
      const connectedNodes = traversal.nodes.filter((n) => n.id !== rootNodeId);

      evidence.push({
        node: rootNode,
        connectedEdges,
        connectedNodes,
        source: "graph",
      });
    }

    return {
      query,
      evidence,
      traversal,
      durationMs: Date.now() - t0,
    };
  }
}
