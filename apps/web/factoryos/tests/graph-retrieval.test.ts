/**
 * FactoryOS v0.1 — Step 4 Graph Retrieval Tests & Adversarial Suite
 *
 * Comprehensive unit, integration, and red-team test suite for Graph Retrieval.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { InMemoryGraphStore } from "../core/rag/graph/InMemoryGraphStore";
import { DeterministicEntityExtractor } from "../core/rag/graph/DeterministicEntityExtractor";
import { GraphRetrieverImpl } from "../core/rag/graph/GraphRetrieverImpl";
import { InvalidWorkflowDefinitionError } from "../core/errors/Errors";

import type { GraphNode, GraphEdge } from "../core/rag/graph/GraphContracts";

describe("FactoryOS v0.1 — InMemory Graph Store & Traversal", () => {
  let store: InMemoryGraphStore;

  beforeEach(() => {
    store = new InMemoryGraphStore();
  });

  // ─── §1 Node & Edge Operations ──────────────────────────────────────────────

  it("adds nodes and edges and retrieves neighbors", async () => {
    const nodeA: GraphNode = { id: "node_a", label: "Node A", type: "concept" };
    const nodeB: GraphNode = { id: "node_b", label: "Node B", type: "concept" };
    const edge: GraphEdge = { id: "e1", sourceId: "node_a", targetId: "node_b", relation: "CONNECTS_TO" };

    await store.addNode(nodeA);
    await store.addNode(nodeB);
    await store.addEdge(edge);

    expect(store.nodeCount()).toBe(2);
    expect(store.edgeCount()).toBe(1);

    const neighborsA = await store.getNeighbors("node_a");
    expect(neighborsA).toHaveLength(1);
    expect(neighborsA[0].id).toBe("node_b");
  });

  it("handles duplicate node & edge upserts cleanly", async () => {
    const node: GraphNode = { id: "n1", label: "Original Label", type: "concept" };
    await store.addNode(node);

    const updatedNode: GraphNode = { id: "n1", label: "Updated Label", type: "concept" };
    await store.addNode(updatedNode);

    expect(store.nodeCount()).toBe(1);
    const retrieved = await store.getNode("n1");
    expect(retrieved!.label).toBe("Updated Label");
  });

  it("rejects invalid nodes or edges", async () => {
    await expect(store.addNode({ id: "", label: "x", type: "t" } as any)).rejects.toThrowError(InvalidWorkflowDefinitionError);
    await expect(store.addEdge({ id: "e", sourceId: "", targetId: "b", relation: "r" } as any)).rejects.toThrowError(InvalidWorkflowDefinitionError);
  });

  // ─── §2 Cycle Safety & Traversal Depth Bounds ───────────────────────────────

  it("RED-TEAM: graph with circular references (A → B → C → A) does NOT cause infinite loop", async () => {
    await store.addNode({ id: "A", label: "A", type: "node" });
    await store.addNode({ id: "B", label: "B", type: "node" });
    await store.addNode({ id: "C", label: "C", type: "node" });

    // Cycle A -> B -> C -> A
    await store.addEdge({ id: "e_ab", sourceId: "A", targetId: "B", relation: "NEXT" });
    await store.addEdge({ id: "e_bc", sourceId: "B", targetId: "C", relation: "NEXT" });
    await store.addEdge({ id: "e_ca", sourceId: "C", targetId: "A", relation: "NEXT" });

    // Traverse starting at A with maxDepth=10
    const result = await store.traverse("A", { maxDepth: 10 });

    expect(result.nodes).toHaveLength(3);
    const nodeIds = result.nodes.map((n) => n.id);
    expect(nodeIds).toContain("A");
    expect(nodeIds).toContain("B");
    expect(nodeIds).toContain("C");
    expect(result.edges).toHaveLength(3);
  });

  it("enforces maxDepth traversal bounds", async () => {
    // Chain A -> B -> C -> D -> E
    const nodes = ["A", "B", "C", "D", "E"];
    for (const id of nodes) {
      await store.addNode({ id, label: id, type: "chain" });
    }
    await store.addEdge({ id: "e1", sourceId: "A", targetId: "B", relation: "NEXT" });
    await store.addEdge({ id: "e2", sourceId: "B", targetId: "C", relation: "NEXT" });
    await store.addEdge({ id: "e3", sourceId: "C", targetId: "D", relation: "NEXT" });
    await store.addEdge({ id: "e4", sourceId: "D", targetId: "E", relation: "NEXT" });

    const resDepth1 = await store.traverse("A", { maxDepth: 1, direction: "out" });
    expect(resDepth1.nodes.map((n) => n.id)).toEqual(["A", "B"]);

    const resDepth2 = await store.traverse("A", { maxDepth: 2, direction: "out" });
    expect(resDepth2.nodes.map((n) => n.id)).toEqual(["A", "B", "C"]);
  });

  it("handles non-existent start node gracefully", async () => {
    const res = await store.traverse("nonexistent_node", { maxDepth: 5 });
    expect(res.nodes).toHaveLength(0);
    expect(res.edges).toHaveLength(0);
  });
});

// ─── §3 Deterministic Entity Extraction & Graph Retriever ───────────────────

describe("FactoryOS v0.1 — Graph Retriever Pipeline", () => {
  let retriever: GraphRetrieverImpl;

  beforeEach(() => {
    retriever = new GraphRetrieverImpl();
  });

  it("extracts entities and ingests graph structure from technical text", async () => {
    const text = `FactoryOS consists of Overseer, Evaluation Guardian, WorkflowRuntime, and ToolRegistry. Overseer inspects runtime state. Guardian validates execution.`;

    await retriever.ingest([{ id: "doc_arch", content: text }]);

    const store = retriever.graphStore as InMemoryGraphStore;
    expect(store.nodeCount()).toBeGreaterThanOrEqual(4);
    expect(store.edgeCount()).toBeGreaterThanOrEqual(3);
  });

  it("answers 'What components belong to FactoryOS?' with graph evidence pack", async () => {
    const doc = {
      id: "doc_factory",
      content: "FactoryOS contains Overseer, Evaluation Guardian, WorkflowRuntime, and ToolRegistry.",
    };

    await retriever.ingest([doc]);

    const result = await retriever.retrieve("What components belong to FactoryOS?");

    expect(result.evidence).toHaveLength(1);
    const ev = result.evidence[0];
    expect(ev.node.id).toBe("factoryos");
    expect(ev.source).toBe("graph");
    expect(ev.connectedNodes.length).toBeGreaterThanOrEqual(3);

    const connectedIds = ev.connectedNodes.map((n) => n.id);
    expect(connectedIds).toContain("overseer");
    expect(connectedIds).toContain("guardian");
    expect(connectedIds).toContain("workflow_runtime");
  });

  it("handles unknown graph query gracefully", async () => {
    const result = await retriever.retrieve("What is the recipe for chocolate cake?");
    expect(result.evidence).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });
});
