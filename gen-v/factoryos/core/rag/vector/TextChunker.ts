/**
 * FactoryOS v0.1 — Text Chunker
 *
 * Deterministic text chunking for Vector RAG.
 * Splits documents into overlapping text chunks with stable IDs.
 */

import type { Document, Chunk } from "./VectorContracts";
import { InvalidWorkflowDefinitionError } from "../../errors/Errors";

export interface ChunkerOptions {
  chunkSize?: number;     // max characters per chunk (default: 200)
  chunkOverlap?: number;  // character overlap between chunks (default: 40)
}

export class TextChunker {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;

  constructor(options: ChunkerOptions = {}) {
    this.chunkSize = options.chunkSize ?? 200;
    this.chunkOverlap = options.chunkOverlap ?? 40;

    if (this.chunkOverlap >= this.chunkSize) {
      throw new InvalidWorkflowDefinitionError("chunkOverlap must be less than chunkSize");
    }
  }

  chunkDocument(doc: Document): Chunk[] {
    if (!doc || typeof doc !== "object") {
      throw new InvalidWorkflowDefinitionError("Document must be an object");
    }
    if (!doc.id || typeof doc.id !== "string" || doc.id.trim() === "") {
      throw new InvalidWorkflowDefinitionError("Document id must be a non-empty string");
    }
    if (typeof doc.content !== "string") {
      throw new InvalidWorkflowDefinitionError("Document content must be a string");
    }

    const text = doc.content.trim();
    if (text.length === 0) {
      return [];
    }

    const chunks: Chunk[] = [];
    let start = 0;
    let chunkIndex = 0;

    while (start < text.length) {
      const end = Math.min(start + this.chunkSize, text.length);
      const content = text.slice(start, end);

      chunks.push({
        id: `chunk_${doc.id}_${chunkIndex}`,
        docId: doc.id,
        chunkIndex,
        content,
        metadata: doc.metadata ? { ...doc.metadata } : undefined,
      });

      chunkIndex++;
      if (end >= text.length) break;
      start += this.chunkSize - this.chunkOverlap;
    }

    return chunks;
  }

  chunkDocuments(docs: Document[]): Chunk[] {
    const all: Chunk[] = [];
    for (const doc of docs) {
      all.push(...this.chunkDocument(doc));
    }
    return all;
  }
}
