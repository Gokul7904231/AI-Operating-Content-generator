/**
 * FactoryOS v0.1 — Local Vector Embedding Provider
 *
 * Real local semantic dense vector embedding provider using @xenova/transformers.
 * NO network required after first run download (models cached in node_modules/.cache).
 */

import { pipeline } from "@xenova/transformers";
import type { EmbeddingProvider } from "./VectorContracts";

export class LocalVectorEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions = 384; // all-MiniLM-L6-v2 dimensions
  private extractor: any = null;

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || typeof text !== "string" || text.trim() === "") {
      return new Array<number>(this.dimensions).fill(0);
    }

    if (!this.extractor) {
      this.extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    }

    const output = await this.extractor(text, { pooling: "mean", normalize: true });
    return Array.from(output.data) as number[];
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }
}
