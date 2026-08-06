/**
 * FactoryOS v0.1 — Vector Retriever Implementation
 *
 * Coordinates Document chunking, vector embedding generation, vector store upsertion,
 * and semantic retrieval of grounded evidence packs.
 */

import type {
  VectorRetriever,
  Document,
  EmbeddingProvider,
  VectorStore,
  RetrievalResult,
  Evidence,
} from "./VectorContracts";

import { TextChunker } from "./TextChunker";
import { LocalVectorEmbeddingProvider } from "./LocalVectorEmbeddingProvider";
import { InMemoryVectorStore } from "./InMemoryVectorStore";

export interface VectorRetrieverOptions {
  chunker?: TextChunker;
  embeddingProvider?: EmbeddingProvider;
  vectorStore?: VectorStore;
}

export class VectorRetrieverImpl implements VectorRetriever {
  private readonly chunker: TextChunker;
  readonly embeddingProvider: EmbeddingProvider;
  readonly vectorStore: VectorStore;

  constructor(options: VectorRetrieverOptions = {}) {
    this.chunker = options.chunker ?? new TextChunker();
    this.embeddingProvider =
      options.embeddingProvider ?? new LocalVectorEmbeddingProvider();
    this.vectorStore = options.vectorStore ?? new InMemoryVectorStore();
  }

  async ingest(documents: Document[]): Promise<void> {
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return;
    }

    // 1. Chunk documents
    const chunks = this.chunker.chunkDocuments(documents);
    if (chunks.length === 0) return;

    // 2. Generate embeddings for chunks
    const texts = chunks.map((c) => c.content);
    const embeddings = await this.embeddingProvider.generateEmbeddings(texts);

    // 3. Attach embeddings to chunks
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].embedding = embeddings[i];
    }

    // 4. Upsert chunks into VectorStore
    await this.vectorStore.upsertChunks(chunks);
  }

  async retrieve(query: string, topK = 5): Promise<RetrievalResult> {
    const t0 = Date.now();
    if (!query || typeof query !== "string" || query.trim() === "") {
      return {
        query: query ?? "",
        evidence: [],
        durationMs: Date.now() - t0,
      };
    }

    // 1. Generate embedding for query
    const queryEmbedding = await this.embeddingProvider.generateEmbedding(query);

    // 2. Search VectorStore
    const searchResults = await this.vectorStore.search(queryEmbedding, topK);

    // 3. Map search results to Evidence format
    const evidence: Evidence[] = searchResults.map((res) => ({
      id: res.chunk.id,
      docId: res.chunk.docId,
      content: res.chunk.content,
      score: res.score,
      metadata: res.chunk.metadata,
      source: "vector",
    }));

    return {
      query,
      evidence,
      durationMs: Date.now() - t0,
    };
  }
}
