import { describe, it, expect, beforeEach } from "vitest";
import { ContextIndexer } from "../core/cognitive/rlm/ContextIndexer";
import { ContextRetriever, ContextDereferencer } from "../core/cognitive/rlm/ContextRetriever";
import { TerminationController } from "../core/cognitive/rlm/TerminationController";
import { RecursiveInvestigator, ContextOrchestrator } from "../core/cognitive/rlm/RecursiveInvestigator";

describe("FactoryOS Frontier v2 — RLM Context Engine Suite", () => {
  let indexer: ContextIndexer;
  let retriever: ContextRetriever;
  let dereferencer: ContextDereferencer;
  let terminationController: TerminationController;
  let investigator: RecursiveInvestigator;

  beforeEach(() => {
    indexer = new ContextIndexer();
    retriever = new ContextRetriever(indexer);
    dereferencer = new ContextDereferencer(indexer);
    terminationController = new TerminationController();
    investigator = new RecursiveInvestigator(indexer, retriever, dereferencer);
  });

  it("01: Externalizes large documentation/evidence without polluting prompt context", () => {
    const rawDoc = "A".repeat(20000); // ~5,000 tokens of raw log
    const ref = indexer.indexItem({
      type: "LOG",
      title: "Floor 03 FFmpeg Full Render Log",
      content: rawDoc,
      source: "rendering_pipeline",
      tags: ["ffmpeg", "render", "floor03"],
      confidence: 0.98,
    });

    expect(ref.refId).toMatch(/^ref_/);
    expect(ref.tokenCount).toBe(5000);
    expect(ref.summary.length).toBeLessThanOrEqual(160);
    expect(ref.isDereferenced).toBe(false);

    // Verify raw store holds full content while reference is compact
    expect(indexer.getRawContent(ref.refId)).toBe(rawDoc);
    expect(indexer.getTotalIndexedTokens()).toBe(5000);
  });

  it("02: Retrieves ranked context slices with significant token compression", () => {
    // Index 10 items representing 50k tokens
    for (let i = 1; i <= 10; i++) {
      indexer.indexItem({
        type: i % 2 === 0 ? "TELEMETRY" : "CASE_HISTORY",
        title: `Incident ${i}: Audio queue degradation`,
        content: `Detailed stack trace and telemetry sample for audio buffer issue #${i} ` + "X".repeat(4000),
        source: "floor03",
        tags: ["audio", "buffer", "floor03"],
        confidence: 0.9,
      });
    }

    const slice = retriever.retrieveSlice({
      query: "audio buffer degradation",
      limit: 3,
      maxTokens: 500,
    });

    expect(slice.references.length).toBe(3);
    expect(slice.totalTokens).toBeLessThan(500);
    expect(slice.compressionRatio).toBeLessThan(0.1); // >90% compression
  });

  it("03: Programmatically dereferences raw evidence on demand", () => {
    const fullContent = "CRITICAL_STACK_TRACE: FFmpeg segmentation fault at frame 428 in libavcodec.so";
    const ref = indexer.indexItem({
      type: "LOG",
      title: "FFmpeg Segfault Trace",
      content: fullContent,
      source: "floor03_asset_realization",
      tags: ["segfault", "ffmpeg"],
    });

    const dereferenced = dereferencer.dereference(ref.refId);
    expect(dereferenced).toBeDefined();
    expect(dereferenced?.rawContent).toBe(fullContent);
    expect(dereferenced?.reference.isDereferenced).toBe(true);
  });

  it("04: Termination controller computes dynamic budgets and enforces safety limits", () => {
    const criticalBudget = terminationController.calculateBudget({
      severity: "CRITICAL",
      uncertainty: 0.9,
      novelty: 0.8,
      expectedInformationGain: 0.9,
    });

    expect(criticalBudget.maxDepth).toBe(3);
    expect(criticalBudget.maxTokens).toBe(12000);
    expect(criticalBudget.maxSubcalls).toBe(8);

    const lowBudget = terminationController.calculateBudget({
      severity: "LOW",
      uncertainty: 0.2,
      novelty: 0.1,
      expectedInformationGain: 0.2,
    });

    expect(lowBudget.maxDepth).toBe(1);
    expect(lowBudget.maxTokens).toBe(2000);

    // Termination triggers
    const checkDepth = terminationController.shouldTerminate(3, 1000, 500, 2, criticalBudget);
    expect(checkDepth.terminate).toBe(true);
    expect(checkDepth.reason).toContain("Max recursion depth");

    const checkTokens = terminationController.shouldTerminate(1, 13000, 500, 2, criticalBudget);
    expect(checkTokens.terminate).toBe(true);
    expect(checkTokens.reason).toContain("Max token budget exhausted");
  });

  it("05: Recursive investigator decomposes ambiguous queries and records recursion trace", async () => {
    indexer.indexItem({
      type: "TELEMETRY",
      title: "GPU Memory Saturation Trace",
      content: "VRAM peaked at 99.2% due to unreleased video texture buffers during 4K render batch",
      source: "rendering_pipeline",
      tags: ["vram", "gpu", "render"],
      confidence: 0.95,
    });

    const result = await investigator.investigate({
      query: "GPU Memory Saturation",
      severity: "HIGH",
      uncertainty: 0.8,
      novelty: 0.6,
    });

    expect(result.trace).toBeDefined();
    expect(result.trace.nodes["node_0"]).toBeDefined();
    expect(result.trace.nodes["node_0"].status).toBe("COMPLETED");
    expect(result.conclusions.length).toBeGreaterThan(0);
    expect(result.dereferencedEvidence.length).toBeGreaterThan(0);
  });
});
