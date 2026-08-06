/**
 * FactoryOS v0.1 — Vector RAG Contracts
 *
 * Defines provider abstractions and data models for Vector RAG retrieval.
 * Core contracts remain provider-independent.
 */

export interface Document {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface Chunk {
  id: string;
  docId: string;
  chunkIndex: number;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
}

export interface EmbeddingProvider {
  readonly dimensions: number;
  generateEmbedding(text: string): Promise<number[]>;
  generateEmbeddings(texts: string[]): Promise<number[][]>;
}

export interface VectorSearchResult {
  chunk: Chunk;
  score: number;
}

export interface VectorStore {
  upsertChunks(chunks: Chunk[]): Promise<void>;
  search(queryEmbedding: number[], topK: number): Promise<VectorSearchResult[]>;
  getChunk(id: string): Promise<Chunk | null>;
  deleteDoc(docId: string): Promise<void>;
  clear(): Promise<void>;
}

export interface Evidence {
  id: string;
  docId: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
  source: "vector";
}

export interface RetrievalResult {
  query: string;
  evidence: Evidence[];
  durationMs: number;
}

export interface VectorRetriever {
  ingest(documents: Document[]): Promise<void>;
  retrieve(query: string, topK?: number): Promise<RetrievalResult>;
}
