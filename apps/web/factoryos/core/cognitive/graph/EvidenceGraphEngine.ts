/**
 * FactoryOS Frontier v2 — Evidence Graph Engine
 * Constructs, traverses, and evaluates causal graphs for anomaly investigations.
 */

import { randomUUID } from "node:crypto";
import type { EvidenceEdge, EvidenceGraph, EvidenceNode } from "../CognitiveContracts";

export class EvidenceGraphEngine {
  private graphs: Map<string, EvidenceGraph> = new Map();

  createGraph(caseId: string): EvidenceGraph {
    const graphId = `egraph_${randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    const graph: EvidenceGraph = {
      graphId,
      caseId,
      nodes: {},
      edges: [],
      createdAt: now,
      updatedAt: now,
    };

    this.graphs.set(caseId, graph);
    return structuredClone(graph);
  }

  getGraph(caseId: string): EvidenceGraph | undefined {
    const graph = this.graphs.get(caseId);
    return graph ? structuredClone(graph) : undefined;
  }

  addNode(
    caseId: string,
    node: {
      nodeType: EvidenceNode["nodeType"];
      title: string;
      description: string;
      confidence?: number;
      source: string;
      data?: Record<string, unknown>;
      verified?: boolean;
    }
  ): EvidenceNode {
    let graph = this.graphs.get(caseId);
    if (!graph) {
      this.createGraph(caseId);
      graph = this.graphs.get(caseId)!;
    }

    const nodeId = `enode_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
    const newNode: EvidenceNode = {
      nodeId,
      nodeType: node.nodeType,
      title: node.title,
      description: node.description,
      confidence: node.confidence ?? 0.9,
      source: node.source,
      timestamp: new Date().toISOString(),
      data: node.data ? structuredClone(node.data) : {},
      verified: node.verified ?? false,
    };

    graph.nodes[nodeId] = newNode;
    graph.updatedAt = new Date().toISOString();
    return structuredClone(newNode);
  }

  addEdge(
    caseId: string,
    edge: {
      fromNodeId: string;
      toNodeId: string;
      relationship: EvidenceEdge["relationship"];
      weight?: number;
      explanation?: string;
    }
  ): EvidenceEdge {
    const graph = this.graphs.get(caseId);
    if (!graph) throw new Error(`Evidence graph for case ${caseId} not found`);

    if (!graph.nodes[edge.fromNodeId] || !graph.nodes[edge.toNodeId]) {
      throw new Error("Cannot create edge: one or both nodes do not exist in graph");
    }

    const edgeId = `edge_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
    const newEdge: EvidenceEdge = {
      edgeId,
      fromNodeId: edge.fromNodeId,
      toNodeId: edge.toNodeId,
      relationship: edge.relationship,
      weight: edge.weight ?? 1.0,
      explanation: edge.explanation,
    };

    graph.edges.push(newEdge);
    graph.updatedAt = new Date().toISOString();
    return structuredClone(newEdge);
  }

  findContradictions(caseId: string): EvidenceEdge[] {
    const graph = this.graphs.get(caseId);
    if (!graph) return [];
    return graph.edges.filter((e) => e.relationship === "CONTRADICTS");
  }

  getSupportingEvidence(caseId: string, hypothesisNodeId: string): EvidenceNode[] {
    const graph = this.graphs.get(caseId);
    if (!graph) return [];

    const incomingEdges = graph.edges.filter(
      (e) => e.toNodeId === hypothesisNodeId && e.relationship === "SUPPORTS"
    );

    return incomingEdges
      .map((e) => graph.nodes[e.fromNodeId])
      .filter((n): n is EvidenceNode => n !== undefined)
      .map((n) => structuredClone(n));
  }

  calculateHypothesisConfidence(caseId: string, hypothesisNodeId: string): number {
    const graph = this.graphs.get(caseId);
    if (!graph || !graph.nodes[hypothesisNodeId]) return 0;

    const supporting = this.getSupportingEvidence(caseId, hypothesisNodeId);
    if (supporting.length === 0) return graph.nodes[hypothesisNodeId].confidence;

    let score = 0;
    for (const ev of supporting) {
      score += ev.confidence;
    }
    return Math.min(1.0, score / supporting.length);
  }
}
