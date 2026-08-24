/**
 * FactoryOS Frontier v2 — Persistent Context Store
 * Provides persistent externalized storage for RLM-style context references and raw evidence chunks.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";
import type { ContextReference } from "../CognitiveContracts";

export class PersistentContextStore {
  private baseDir: string;
  private refsFile: string;
  private rawDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || path.join(process.cwd(), "data", "factoryos_state", "context_store");
    this.refsFile = path.join(this.baseDir, "index_manifest.json");
    this.rawDir = path.join(this.baseDir, "raw_chunks");
    this.ensureDirs();
  }

  private ensureDirs(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    if (!fs.existsSync(this.rawDir)) {
      fs.mkdirSync(this.rawDir, { recursive: true });
    }
  }

  private readManifest(): Map<string, ContextReference> {
    if (!fs.existsSync(this.refsFile)) return new Map();
    try {
      const raw = fs.readFileSync(this.refsFile, "utf-8");
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  private writeManifest(map: Map<string, ContextReference>): void {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(this.refsFile, JSON.stringify(obj, null, 2), "utf-8");
  }

  storeEvidence(params: {
    type: ContextReference["type"];
    title: string;
    content: string;
    source: string;
    tags: string[];
    metadata?: Record<string, unknown>;
  }): ContextReference {
    const refId = `ref_${randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const tokenCount = Math.max(1, Math.ceil(params.content.length / 4));
    const rawFilePath = path.join(this.rawDir, `${refId}.txt`);

    // Write raw chunk to disk
    fs.writeFileSync(rawFilePath, params.content, "utf-8");

    const reference: ContextReference = {
      refId,
      type: params.type,
      title: params.title,
      summary: params.content.substring(0, 160).replace(/\n/g, " "),
      tokenCount,
      timestamp: new Date().toISOString(),
      confidence: 0.98,
      source: params.source,
      tags: [...params.tags],
      isDereferenced: false,
    };

    const manifest = this.readManifest();
    manifest.set(refId, reference);
    this.writeManifest(manifest);

    return reference;
  }

  getReferences(): ContextReference[] {
    const manifest = this.readManifest();
    return Array.from(manifest.values());
  }

  getReference(refId: string): ContextReference | null {
    const manifest = this.readManifest();
    return manifest.get(refId) || null;
  }

  dereferenceRaw(refId: string): string {
    const rawFilePath = path.join(this.rawDir, `${refId}.txt`);
    if (!fs.existsSync(rawFilePath)) {
      throw new Error(`Raw evidence chunk ${refId} not found in persistent store.`);
    }
    return fs.readFileSync(rawFilePath, "utf-8");
  }

  getTotalTokens(): number {
    const refs = this.getReferences();
    return refs.reduce((sum, r) => sum + r.tokenCount, 0);
  }

  clear(): void {
    if (fs.existsSync(this.baseDir)) {
      fs.rmSync(this.baseDir, { recursive: true, force: true });
      this.ensureDirs();
    }
  }
}
