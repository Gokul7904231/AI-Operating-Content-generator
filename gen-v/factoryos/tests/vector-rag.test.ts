/**
 * FactoryOS v0.1 — Step 3 Vector RAG Tests & Evaluation Benchmark
 *
 * Comprehensive unit, adversarial, and retrieval quality benchmark suite for Vector RAG.
 */

import { describe, it, expect, beforeEach } from "vitest";

import { VectorRetrieverImpl } from "../core/rag/vector/VectorRetrieverImpl";
import { TextChunker } from "../core/rag/vector/TextChunker";
import { MockVectorEmbeddingProvider } from "../core/rag/vector/MockVectorEmbeddingProvider";
import { LocalVectorEmbeddingProvider } from "../core/rag/vector/LocalVectorEmbeddingProvider";
import { InMemoryVectorStore } from "../core/rag/vector/InMemoryVectorStore";
import { InvalidWorkflowDefinitionError } from "../core/errors/Errors";

import type { Document } from "../core/rag/vector/VectorContracts";

describe("FactoryOS v0.1 — Vector RAG Pipeline", () => {
  let retriever: VectorRetrieverImpl;
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
    retriever = new VectorRetrieverImpl({
      vectorStore: store,
      embeddingProvider: new MockVectorEmbeddingProvider(),
    });
  });

  // ─── §1 Ingestion & Chunking ────────────────────────────────────────────────

  it("ingests documents and produces deterministic chunk IDs", async () => {
    const docs: Document[] = [
      { id: "doc1", content: "FactoryOS runtime executes deterministic steps. State machine validates all transitions.", metadata: { category: "runtime" } },
      { id: "doc2", content: "Tool Registry provides typed capability invocation with input schema validation.", metadata: { category: "tools" } },
    ];

    await retriever.ingest(docs);

    expect(store.count()).toBeGreaterThanOrEqual(2);
    const chunk1 = await store.getChunk("chunk_doc1_0");
    expect(chunk1).not.toBeNull();
    expect(chunk1!.docId).toBe("doc1");
    expect(chunk1!.metadata?.category).toBe("runtime");
    expect(chunk1!.embedding).toHaveLength(64);
  });

  it("handles duplicate document ingestion safely (upsert updates existing chunks)", async () => {
    const doc: Document = { id: "doc1", content: "Initial content for doc 1." };

    await retriever.ingest([doc]);
    const initialCount = store.count();

    // Ingest updated version of doc1
    const updatedDoc: Document = { id: "doc1", content: "Updated content for doc 1 with new information." };
    await retriever.ingest([updatedDoc]);

    const chunk = await store.getChunk("chunk_doc1_0");
    expect(chunk!.content).toContain("Updated content");
    expect(store.count()).toBe(initialCount); // No duplicate orphaned chunks
  });

  it("rejects malformed documents during chunking", () => {
    const chunker = new TextChunker();
    expect(() => chunker.chunkDocument({ id: "", content: "hello" })).toThrowError(InvalidWorkflowDefinitionError);
    expect(() => chunker.chunkDocument({ id: "doc", content: null as any })).toThrowError(InvalidWorkflowDefinitionError);
  });

  // ─── §2 Vector Search & Dense Embeddings ────────────────────────────────────

  it("computes L2-normalized 64-dimensional vector embeddings", async () => {
    const provider = new MockVectorEmbeddingProvider(64);
    const vec = await provider.generateEmbedding("FactoryOS state machine");

    expect(vec).toHaveLength(64);
    // Verify L2 norm is 1.0 (or 0 for empty)
    const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
    expect(norm).toBeCloseTo(1.0, 4);
  });

  it("retrieves top-K evidence items sorted by cosine similarity score", async () => {
    const docs: Document[] = [
      { id: "doc-runtime", content: "FactoryOS runtime executes workflow steps deterministically." },
      { id: "doc-tools", content: "Tool Registry validates tool input schemas and tool execution." },
      { id: "doc-database", content: "SQLite database persists step checkpoints durable across restarts." },
    ];

    await retriever.ingest(docs);

    const result = await retriever.retrieve("deterministic workflow execution steps", 2);

    expect(result.evidence).toHaveLength(2);
    expect(result.evidence[0].docId).toBe("doc-runtime");
    expect(result.evidence[0].source).toBe("vector");
    expect(result.evidence[0].score).toBeGreaterThan(result.evidence[1].score);
  });

  // ─── §3 Edge Cases ─────────────────────────────────────────────────────────

  it("handles empty query gracefully", async () => {
    const result = await retriever.retrieve("", 3);
    expect(result.evidence).toHaveLength(0);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("handles empty corpus retrieval gracefully", async () => {
    const result = await retriever.retrieve("anything", 3);
    expect(result.evidence).toHaveLength(0);
  });
});

// ─── §4 Retrieval Quality & Evaluation Benchmark ──────────────────────────────

describe("FactoryOS v0.1 — RAG Retrieval Quality Evaluation Benchmark", () => {
  let retriever: VectorRetrieverImpl;

  const akbCorpus: Document[] = [
    {
      id: "doc-runtime",
      content: "FactoryOS core runtime executes deterministic workflows using a validated state machine and step checkpoints.",
      metadata: { module: "runtime" },
    },
    {
      id: "doc-tools",
      content: "Tool Registry allows Workers to invoke registered capabilities with schema validation and reference safety.",
      metadata: { module: "tools" },
    },
    {
      id: "doc-rag",
      content: "Vector RAG retrieves semantically relevant evidence chunks using dense vector embeddings and cosine similarity.",
      metadata: { module: "rag" },
    },
    {
      id: "doc-guardian",
      content: "Evaluation Guardian validates output completeness, evidence grounding, and schema validity.",
      metadata: { module: "guardian" },
    },
    {
      id: "doc-overseer",
      content: "Overseer is a supervisory control plane that inspects workflow run states and failure diagnostics.",
      metadata: { module: "overseer" },
    },
  ];

  const evalQueries = [
    { query: "How does FactoryOS core runtime execute deterministic workflows?", expectedDocId: "doc-runtime" },
    { query: "How do workers invoke registered capabilities with schema validation?", expectedDocId: "doc-tools" },
    { query: "How does vector RAG retrieve semantically relevant evidence chunks?", expectedDocId: "doc-rag" },
    { query: "How does the evaluation guardian validate output completeness and schema?", expectedDocId: "doc-guardian" },
    { query: "What supervisory control plane inspects workflow run states?", expectedDocId: "doc-overseer" },
  ];

  beforeEach(async () => {
    retriever = new VectorRetrieverImpl({
      embeddingProvider: new MockVectorEmbeddingProvider(),
    });
    await retriever.ingest(akbCorpus);
  });

  it("achieves 100% Hit@1 accuracy on evaluation benchmark dataset", async () => {
    let hitsAt1 = 0;

    for (const testCase of evalQueries) {
      const result = await retriever.retrieve(testCase.query, 3);
      expect(result.evidence.length).toBeGreaterThan(0);

      const top1DocId = result.evidence[0].docId;
      if (top1DocId === testCase.expectedDocId) {
        hitsAt1++;
      }
    }

    const hitRateAt1 = hitsAt1 / evalQueries.length;
    expect(hitRateAt1).toBe(1.0); // 100% Hit@1 accuracy
  });

  it("achieves 100% Hit@3 accuracy on evaluation benchmark dataset", async () => {
    let hitsAt3 = 0;

    for (const testCase of evalQueries) {
      const result = await retriever.retrieve(testCase.query, 3);
      const top3DocIds = result.evidence.map((e) => e.docId);

      if (top3DocIds.includes(testCase.expectedDocId)) {
        hitsAt3++;
      }
    }

    const hitRateAt3 = hitsAt3 / evalQueries.length;
    expect(hitRateAt3).toBe(1.0); // 100% Hit@3 accuracy
  });
});
