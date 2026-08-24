import { describe, it, expect } from "vitest";
import { EvidenceGraphEngine } from "../core/cognitive/graph/EvidenceGraphEngine";

describe("FactoryOS Frontier v2 — Phase 9: Cognitive Evidence Graph Suite", () => {
  it("1. Evidence Graph Assembly: Constructs causal chain linking symptoms and hypotheses", () => {
    const graphEngine = new EvidenceGraphEngine();
    const caseId = "case_graph_01";

    const symptom = graphEngine.addNode(caseId, {
      nodeType: "SYMPTOM",
      title: "Audio Desynchronization",
      description: "Audio buffer lag > 200ms",
      confidence: 0.9,
      source: "floor03_asset_realization",
      verified: true,
    });

    const hypothesis = graphEngine.addNode(caseId, {
      nodeType: "HYPOTHESIS",
      title: "Audio Stream Buffer Drift",
      description: "Sample rate mismatch between worker and synthesizer",
      confidence: 0.85,
      source: "slayer_rendering",
      verified: false,
    });

    graphEngine.addEdge(caseId, {
      fromNodeId: symptom.nodeId,
      toNodeId: hypothesis.nodeId,
      relationship: "CAUSES",
      weight: 0.85,
    });

    const subGraph = graphEngine.getGraph(caseId);
    expect(subGraph).toBeDefined();
    expect(Object.keys(subGraph!.nodes).length).toBe(2);
    expect(subGraph!.edges.length).toBe(1);
    expect(subGraph!.edges[0].relationship).toBe("CAUSES");
  });
});
