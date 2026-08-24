/**
 * FactoryOS v0.1 — Deterministic Entity Extractor
 *
 * Extract nodes and edges from structured technical text without needing an LLM.
 * Parses explicit entity mentions and relationship definitions.
 */

import type { EntityExtractor, GraphTraversalResult, GraphNode, GraphEdge } from "./GraphContracts";

export class DeterministicEntityExtractor implements EntityExtractor {
  async extract(text: string, docId = "doc_unknown"): Promise<GraphTraversalResult> {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    if (!text || typeof text !== "string") return { nodes, edges };

    const lower = text.toLowerCase();

    // Key entities map
    const knownEntities: Array<{ id: string; label: string; type: string }> = [
      { id: "factoryos", label: "FactoryOS", type: "system" },
      { id: "overseer", label: "Overseer", type: "control_plane" },
      { id: "guardian", label: "Evaluation Guardian", type: "guardian" },
      { id: "workflow_runtime", label: "WorkflowRuntime", type: "runtime" },
      { id: "tool_registry", label: "ToolRegistry", type: "tooling" },
      { id: "vector_rag", label: "VectorRAG", type: "retrieval" },
      { id: "graph_rag", label: "GraphRAG", type: "retrieval" },
      { id: "repair_engine", label: "RepairEngine", type: "engine" },
    ];

    const presentEntityIds = new Set<string>();

    for (const ent of knownEntities) {
      if (lower.includes(ent.id.replace("_", "")) || lower.includes(ent.label.toLowerCase())) {
        nodes.push({
          id: ent.id,
          label: ent.label,
          type: ent.type,
          properties: { docId },
        });
        presentEntityIds.add(ent.id);
      }
    }

    // Relation patterns
    const relationRules: Array<{
      source: string;
      target: string;
      relation: string;
      keywords: string[];
    }> = [
      { source: "factoryos", target: "overseer", relation: "HAS_COMPONENT", keywords: ["factoryos", "overseer"] },
      { source: "factoryos", target: "guardian", relation: "HAS_COMPONENT", keywords: ["factoryos", "guardian"] },
      { source: "factoryos", target: "workflow_runtime", relation: "HAS_COMPONENT", keywords: ["factoryos", "runtime"] },
      { source: "factoryos", target: "tool_registry", relation: "HAS_COMPONENT", keywords: ["factoryos", "tool"] },
      { source: "factoryos", target: "vector_rag", relation: "HAS_COMPONENT", keywords: ["factoryos", "vector"] },
      { source: "factoryos", target: "graph_rag", relation: "HAS_COMPONENT", keywords: ["factoryos", "graph"] },
      { source: "overseer", target: "workflow_runtime", relation: "INSPECTS", keywords: ["overseer", "inspect"] },
      { source: "guardian", target: "workflow_runtime", relation: "VALIDATES", keywords: ["guardian", "validate"] },
      { source: "workflow_runtime", target: "tool_registry", relation: "USES", keywords: ["runtime", "tool"] },
      { source: "repair_engine", target: "guardian", relation: "REPAIRS", keywords: ["repair", "guardian"] },
    ];

    let edgeCounter = 0;
    for (const rule of relationRules) {
      if (presentEntityIds.has(rule.source) && presentEntityIds.has(rule.target)) {
        edges.push({
          id: `edge_${docId}_${edgeCounter++}`,
          sourceId: rule.source,
          targetId: rule.target,
          relation: rule.relation,
          properties: { docId },
        });
      }
    }

    return { nodes, edges };
  }
}
