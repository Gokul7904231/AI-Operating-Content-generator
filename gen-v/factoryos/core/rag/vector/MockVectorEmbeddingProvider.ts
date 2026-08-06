/**
 * FactoryOS v0.1 — Mock Vector Embedding Provider
 *
 * Fast, deterministic n-gram hashing provider used for fast unit tests.
 */

import type { EmbeddingProvider } from "./VectorContracts";

export class MockVectorEmbeddingProvider implements EmbeddingProvider {
  readonly dimensions: number;

  constructor(dimensions = 64) {
    this.dimensions = dimensions;
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    if (!text || typeof text !== "string" || text.trim() === "") {
      return vector;
    }

    const normalized = text.toLowerCase().replace(/[^\w\s]/g, "");
    const words = normalized.split(/\s+/).filter((w) => w.length > 0);

    for (const word of words) {
      const h1 = this._hashString(word) % this.dimensions;
      const h2 = this._hashString(word + "_2") % this.dimensions;
      vector[h1] += 1.0;
      vector[h2] += 0.5;
    }

    for (let i = 0; i <= normalized.length - 3; i++) {
      const trigram = normalized.slice(i, i + 3);
      const h = this._hashString(trigram) % this.dimensions;
      vector[h] += 0.25;
    }

    let norm = 0;
    for (let i = 0; i < this.dimensions; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);

    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      results.push(await this.generateEmbedding(text));
    }
    return results;
  }

  private _hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 33) ^ str.charCodeAt(i);
    }
    return Math.abs(hash);
  }
}
