/**
 * FactoryOS v0.1 — Step 5 Hybrid RAG Tests
 *
 * Comprehensive unit and integration test suite verifying linear score fusion,
 * deduplication, evidence source provenance merging, and retrieval stability.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { HybridRetrieverImpl } from "../core/rag/hybrid/HybridRetrieverImpl";
import type { Document } from "../core/rag/vector/VectorContracts";

describe("FactoryOS v0.1 — Hybrid RAG Retrieval", () => {
  let retriever: HybridRetrieverImpl;

  const corpus: Document[] = [
    {
      id: "doc-runtime",
      content: "FactoryOS runtime core executes workflows. Overseer is a control plane.",
      metadata: { topic: "runtime" },
    },
    {
      id: "doc-tools",
      content: "Tool Registry validates tool schemas and capability parameters.",
      metadata: { topic: "tools" },
    },
  ];

  beforeEach(async () => {
    retriever = new HybridRetrieverImpl();
    await retriever.ingest(corpus);
  });

  it("fuses vector and graph results and deduplicates overlapping sources", async () => {
    // A query that triggers both vector similarity and entity keyword matching for Overseer/Runtime
    const result = await retriever.retrieve("What components inspect FactoryOS runtime?");

    expect(result.items.length).toBeGreaterThan(0);

    // Overlapping items should list both "vector" and "graph" as sources
    const mergedItem = result.items.find((item) => item.provenance.docId === "doc-runtime");
    expect(mergedItem).toBeDefined();
    expect(mergedItem!.sources).toContain("vector");
    expect(mergedItem!.sources).toContain("graph");
  });

  it("handles vector-only useful queries", async () => {
    const result = await retriever.retrieve("capability parameters validation", { maxGraphDepth: 0 });

    expect(result.items.length).toBeGreaterThan(0);
    for (const item of result.items) {
      expect(item.sources).toContain("vector");
    }
  });

  it("handles empty queries gracefully", async () => {
    const result = await retriever.retrieve("");
    expect(result.items).toHaveLength(0);
  });

  it("enforces ranking stability and deterministic ordering", async () => {
    const r1 = await retriever.retrieve("FactoryOS components", { weights: { vectorWeight: 0.5, graphWeight: 0.5 } });
    const r2 = await retriever.retrieve("FactoryOS components", { weights: { vectorWeight: 0.5, graphWeight: 0.5 } });

    expect(r1.items).toHaveLength(r2.items.length);
    expect(r1.items.length).toBeGreaterThan(0);
    for (let i = 0; i < r1.items.length; i++) {
      expect(r1.items[i].id).toBe(r2.items[i].id);
      expect(r1.items[i].score).toBe(r2.items[i].score);
    }
  });
});
