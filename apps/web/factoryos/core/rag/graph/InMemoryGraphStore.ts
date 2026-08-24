/**
 * FactoryOS v0.1 — InMemory Graph Store
 *
 * In-memory graph database storing entity nodes and directional edges.
 * Features cycle-safe BFS traversal, depth bounds, and reference isolation.
 */

import type {
  GraphStore,
  GraphNode,
  GraphEdge,
  GraphTraversalOptions,
  GraphTraversalResult,
} from "./GraphContracts";

import { InvalidWorkflowDefinitionError } from "../../errors/Errors";

export class InMemoryGraphStore implements GraphStore {
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();

  async addNode(node: GraphNode): Promise<void> {
    if (!node || typeof node !== "object") {
      throw new InvalidWorkflowDefinitionError("GraphNode must be an object");
    }
    if (!node.id || typeof node.id !== "string" || node.id.trim() === "") {
      throw new InvalidWorkflowDefinitionError("GraphNode id must be a non-empty string");
    }
    if (!node.label || typeof node.label !== "string") {
      throw new InvalidWorkflowDefinitionError("GraphNode label must be a string");
    }
    this.nodes.set(node.id, structuredClone(node));
  }

  async addEdge(edge: GraphEdge): Promise<void> {
    if (!edge || typeof edge !== "object") {
      throw new InvalidWorkflowDefinitionError("GraphEdge must be an object");
    }
    if (!edge.id || typeof edge.id !== "string" || edge.id.trim() === "") {
      throw new InvalidWorkflowDefinitionError("GraphEdge id must be a non-empty string");
    }
    if (!edge.sourceId || !edge.targetId || !edge.relation) {
      throw new InvalidWorkflowDefinitionError("GraphEdge must have sourceId, targetId, and relation");
    }
    this.edges.set(edge.id, structuredClone(edge));
  }

  async getNode(id: string): Promise<GraphNode | null> {
    const node = this.nodes.get(id);
    return node ? structuredClone(node) : null;
  }

  async getEdges(nodeId: string, direction: "out" | "in" | "both" = "both"): Promise<GraphEdge[]> {
    const result: GraphEdge[] = [];
    for (const edge of this.edges.values()) {
      if (direction === "out" && edge.sourceId === nodeId) {
        result.push(structuredClone(edge));
      } else if (direction === "in" && edge.targetId === nodeId) {
        result.push(structuredClone(edge));
      } else if (direction === "both" && (edge.sourceId === nodeId || edge.targetId === nodeId)) {
        result.push(structuredClone(edge));
      }
    }
    return result;
  }

  async getNeighbors(nodeId: string, direction: "out" | "in" | "both" = "both"): Promise<GraphNode[]> {
    const edges = await this.getEdges(nodeId, direction);
    const neighborIds = new Set<string>();

    for (const edge of edges) {
      if (edge.sourceId !== nodeId) neighborIds.add(edge.sourceId);
      if (edge.targetId !== nodeId) neighborIds.add(edge.targetId);
    }

    const neighbors: GraphNode[] = [];
    for (const id of neighborIds) {
      const n = this.nodes.get(id);
      if (n) neighbors.push(structuredClone(n));
    }
    return neighbors;
  }

  /**
   * Cycle-safe Breadth-First Traversal up to maxDepth.
   */
  async traverse(
    startNodeId: string,
    options: GraphTraversalOptions = {}
  ): Promise<GraphTraversalResult> {
    const maxDepth = options.maxDepth ?? 2;
    const direction = options.direction ?? "both";

    const visitedNodes = new Set<string>();
    const visitedEdges = new Set<string>();
    const resultNodes: GraphNode[] = [];
    const resultEdges: GraphEdge[] = [];

    const startNode = this.nodes.get(startNodeId);
    if (!startNode) {
      return { nodes: [], edges: [] };
    }

    // Queue entries: [nodeId, currentDepth]
    const queue: Array<[string, number]> = [[startNodeId, 0]];
    visitedNodes.add(startNodeId);
    resultNodes.push(structuredClone(startNode));

    while (queue.length > 0) {
      const [currId, depth] = queue.shift()!;
      if (depth >= maxDepth) continue;

      const edges = await this.getEdges(currId, direction);

      for (const edge of edges) {
        if (!visitedEdges.has(edge.id)) {
          visitedEdges.add(edge.id);
          resultEdges.push(edge);
        }

        const nextId = edge.sourceId === currId ? edge.targetId : edge.sourceId;

        if (!visitedNodes.has(nextId)) {
          visitedNodes.add(nextId);
          const nextNode = this.nodes.get(nextId);
          if (nextNode) {
            resultNodes.push(structuredClone(nextNode));
            queue.push([nextId, depth + 1]);
          }
        }
      }
    }

    return { nodes: resultNodes, edges: resultEdges };
  }

  async getAllNodes(): Promise<GraphNode[]> {
    return Array.from(this.nodes.values()).map((n) => structuredClone(n));
  }

  async clear(): Promise<void> {
    this.nodes.clear();
    this.edges.clear();
  }

  nodeCount(): number {
    return this.nodes.size;
  }

  edgeCount(): number {
    return this.edges.size;
  }
}
