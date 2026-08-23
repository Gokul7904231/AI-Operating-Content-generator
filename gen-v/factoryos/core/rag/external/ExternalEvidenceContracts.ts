/**
 * FactoryOS Authoritative External Evidence Contract
 * 
 * Strict schemas and type definitions for independent external evidence documents and chunks.
 * Enforces verifiable source provenance, SHA-256 deterministic content hashing, and explicit trust levels.
 */

import crypto from "crypto";

export type SourceType =
  | "WIKIPEDIA"
  | "GOVERNMENT"
  | "OFFICIAL_DOCUMENT"
  | "RESEARCH_PAPER"
  | "WEB_PAGE"
  | "SEARCH_SNIPPET";

export type SourceTrustLevel =
  | "OFFICIAL"
  | "GOVERNMENT"
  | "ACADEMIC"
  | "REFERENCE"
  | "GENERAL_WEB"
  | "SEARCH_SNIPPET";

export const FORBIDDEN_SOURCES = [
  "GENERATED_QUIZ",
  "LLM_OUTPUT",
  "INTERNAL_FALLBACK",
  "FABRICATED_SOURCE",
  "factoryos.internal",
  "FALLBACK_CORPUS",
  "example.com",
  "fake",
] as const;

export interface AuthoritativeExternalDocument {
  id: string;
  sourceId: string;
  sourceType: SourceType;
  sourceTrustLevel: SourceTrustLevel;
  title: string;
  sourceUrl: string;
  content: string;
  contentHash: string; // SHA-256
  retrievedAt: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface EvidenceChunk {
  chunkId: string;
  sourceId: string;
  title: string;
  sourceUrl: string;
  content: string;
  contentHash: string;
  sourceTrustLevel: SourceTrustLevel;
  sourceType: SourceType;
  chunkIndex: number;
}

export class ExternalEvidenceValidator {
  /**
   * Computes deterministic SHA-256 hash over normalized string content.
   */
  static computeContentHash(content: string): string {
    return crypto.createHash("sha256").update(content.trim(), "utf8").digest("hex");
  }

  /**
   * Validates that an external document strictly satisfies authoritative evidence requirements.
   */
  static validate(doc: AuthoritativeExternalDocument): void {
    if (!doc || typeof doc !== "object") {
      throw new Error("AuthoritativeExternalDocument must be a valid object.");
    }
    if (!doc.id || typeof doc.id !== "string") {
      throw new Error("AuthoritativeExternalDocument missing valid id.");
    }
    if (!doc.sourceId || typeof doc.sourceId !== "string") {
      throw new Error("AuthoritativeExternalDocument missing valid sourceId.");
    }
    if (!doc.title || typeof doc.title !== "string" || doc.title.trim().length === 0) {
      throw new Error("AuthoritativeExternalDocument missing title.");
    }
    if (!doc.content || typeof doc.content !== "string" || doc.content.trim().length === 0) {
      throw new Error("AuthoritativeExternalDocument content cannot be empty.");
    }
    if (!doc.sourceUrl || typeof doc.sourceUrl !== "string") {
      throw new Error("AuthoritativeExternalDocument missing sourceUrl.");
    }

    // URL must be valid HTTP/HTTPS
    if (!doc.sourceUrl.startsWith("http://") && !doc.sourceUrl.startsWith("https://")) {
      throw new Error(`Invalid sourceUrl scheme "${doc.sourceUrl}". Must start with http:// or https://.`);
    }

    // Check forbidden placeholder / fabricated strings
    for (const forbidden of FORBIDDEN_SOURCES) {
      if (
        doc.sourceUrl.toLowerCase().includes(forbidden.toLowerCase()) ||
        doc.id.toLowerCase().includes(forbidden.toLowerCase()) ||
        doc.sourceId.toLowerCase().includes(forbidden.toLowerCase())
      ) {
        throw new Error(`AuthoritativeExternalDocument contains forbidden source indicator: "${forbidden}"`);
      }
    }

    // Verify SHA-256 hash
    const expectedHash = this.computeContentHash(doc.content);
    if (!doc.contentHash || doc.contentHash !== expectedHash) {
      throw new Error(
        `AuthoritativeExternalDocument contentHash mismatch. Expected ${expectedHash}, got ${doc.contentHash}`
      );
    }
  }
}
