/**
 * FactoryOS v0.1 — Graph Retrieval Contracts
 *
 * Explicit entity and relationship retrieval models.
 */

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  relation: string;
  properties?: Record<string, unknown>;
}

export interface GraphTraversalOptions {
  maxDepth?: number;
  direction?: "out" | "in" | "both";
}

export interface GraphTraversalResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphStore {
  addNode(node: GraphNode): Promise<void>;
  addEdge(edge: GraphEdge): Promise<void>;
  getNode(id: string): Promise<GraphNode | null>;
  getNeighbors(nodeId: string, direction?: "out" | "in" | "both"): Promise<GraphNode[]>;
  getEdges(nodeId: string, direction?: "out" | "in" | "both"): Promise<GraphEdge[]>;
  traverse(startNodeId: string, options?: GraphTraversalOptions): Promise<GraphTraversalResult>;
  clear(): Promise<void>;
  getAllNodes(): Promise<GraphNode[]>;
}

export interface GraphEvidence {
  node: GraphNode;
  connectedEdges: GraphEdge[];
  connectedNodes: GraphNode[];
  source: "graph";
}

export interface GraphRetrievalResult {
  query: string;
  evidence: GraphEvidence[];
  traversal: GraphTraversalResult;
  durationMs: number;
}

export interface EntityExtractor {
  extract(text: string, docId?: string): Promise<GraphTraversalResult>;
}

export interface GraphRetriever {
  ingest(documents: Array<{ id: string; content: string }>): Promise<void>;
  retrieve(query: string, maxDepth?: number): Promise<GraphRetrievalResult>;
}
