import { describe, it, expect, beforeEach } from "vitest";
import { EvidenceGraphEngine } from "../core/cognitive/graph/EvidenceGraphEngine";
import { ContradictionResolver } from "../core/cognitive/conflict/ContradictionResolver";

describe("FactoryOS Frontier v2 — Evidence Graph & Contradiction Resolution Suite", () => {
  let graphEngine: EvidenceGraphEngine;
  let resolver: ContradictionResolver;

  beforeEach(() => {
    graphEngine = new EvidenceGraphEngine();
    resolver = new ContradictionResolver(graphEngine);
  });

  it("01: Builds causal evidence graph with symptoms, evidence, hypotheses, and verification", () => {
    const caseId = "case_graph_001";
    const graph = graphEngine.createGraph(caseId);
    expect(graph.caseId).toBe(caseId);

    const symptom = graphEngine.addNode(caseId, {
      nodeType: "SYMPTOM",
      title: "Audio Desync Symptom",
      description: "Audio lags video by 1.4s on Floor 03",
      source: "slayer_general_patrol",
      confidence: 0.95,
    });

    const evidence = graphEngine.addNode(caseId, {
      nodeType: "EVIDENCE",
      title: "FFmpeg Timestamp Trace",
      description: "PTS offset detected in audio stream track 1",
      source: "slayer_pipeline",
      confidence: 0.9,
    });

    const hypothesis = graphEngine.addNode(caseId, {
      nodeType: "HYPOTHESIS",
      title: "Timestamp Offset Hypothesis",
      description: "Audio stream encoded without start_time alignment",
      source: "slayer_pipeline",
      confidence: 0.85,
    });

    const edge1 = graphEngine.addEdge(caseId, {
      fromNodeId: symptom.nodeId,
      toNodeId: evidence.nodeId,
      relationship: "CAUSES",
      explanation: "Desync symptom caused by stream timestamp discrepancy",
    });

    const edge2 = graphEngine.addEdge(caseId, {
      fromNodeId: evidence.nodeId,
      toNodeId: hypothesis.nodeId,
      relationship: "SUPPORTS",
      explanation: "PTS offset evidence supports the hypothesis",
    });

    expect(edge1.relationship).toBe("CAUSES");
    expect(edge2.relationship).toBe("SUPPORTS");

    const supporting = graphEngine.getSupportingEvidence(caseId, hypothesis.nodeId);
    expect(supporting.length).toBe(1);
    expect(supporting[0].nodeId).toBe(evidence.nodeId);

    const confidence = graphEngine.calculateHypothesisConfidence(caseId, hypothesis.nodeId);
    expect(confidence).toBe(0.9);
  });

  it("02: Detects and resolves contradictory agent claims using targeted diagnostic probes", () => {
    const caseId = "case_conflict_002";
    graphEngine.createGraph(caseId);

    const conflict = resolver.detectConflict(
      caseId,
      {
        claimant: "slayer_compute",
        claim: "GPU Compute Fault",
        evidenceIds: ["ev_gpu_01"],
      },
      {
        claimant: "slayer_rendering",
        claim: "Storage Socket Drop",
        evidenceIds: ["ev_sock_02"],
      },
      {
        metrics: { gpuPercent: 12.0, storageReachable: false, socketError: "ECONNRESET" },
        supports: "B",
      }
    );

    expect(conflict.conflictId).toMatch(/^conf_/);
    expect(conflict.status).toBe("DETECTED");
    expect(conflict.telemetryPerspective?.supports).toBe("B");

    // Execute diagnostic probe resolving in favor of Claim B (Storage Socket Drop)
    const resolved = resolver.resolveConflict(conflict.conflictId, {
      supportedClaim: "B",
      objectiveMetrics: { socketError: "ECONNRESET", pingTimeMs: -1 },
      confidence: 0.98,
      rationale: "Socket probe confirmed network socket RST while GPU load remained below 15%.",
    });

    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.selectedClaim).toBe("B");
    expect(resolved.resolutionRationale).toContain("Socket probe confirmed network socket RST");
  });
});
