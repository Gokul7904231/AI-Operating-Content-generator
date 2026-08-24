/**
 * FactoryOS v0.1 — InMemory Vector Store
 *
 * In-memory vector database computing real vector dot product / cosine similarity.
 * Reference-safe via structuredClone.
 */

import type { VectorStore, Chunk, VectorSearchResult } from "./VectorContracts";

export class InMemoryVectorStore implements VectorStore {
  /** chunkId -> Chunk */
  private readonly chunks = new Map<string, Chunk>();

  async upsertChunks(newChunks: Chunk[]): Promise<void> {
    for (const chunk of newChunks) {
      if (!chunk.id) continue;
      this.chunks.set(chunk.id, structuredClone(chunk));
    }
  }

  async search(queryEmbedding: number[], topK = 5): Promise<VectorSearchResult[]> {
    if (!queryEmbedding || queryEmbedding.length === 0 || this.chunks.size === 0) {
      return [];
    }

    const results: VectorSearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding || chunk.embedding.length !== queryEmbedding.length) {
        continue;
      }

      // Cosine similarity = dot product of L2 normalized vectors
      let score = 0;
      for (let i = 0; i < queryEmbedding.length; i++) {
        score += queryEmbedding[i] * chunk.embedding[i];
      }

      results.push({
        chunk: structuredClone(chunk),
        score,
      });
    }

    // Sort descending by similarity score
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  async getChunk(id: string): Promise<Chunk | null> {
    const chunk = this.chunks.get(id);
    return chunk ? structuredClone(chunk) : null;
  }

  async deleteDoc(docId: string): Promise<void> {
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.docId === docId) {
        this.chunks.delete(id);
      }
    }
  }

  async clear(): Promise<void> {
    this.chunks.clear();
  }

  /** Count total chunks */
  count(): number {
    return this.chunks.size;
  }
}
