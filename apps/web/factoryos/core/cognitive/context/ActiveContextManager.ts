/**
 * FactoryOS Frontier v2 — Active Context Manager (ARC-Inspired Architecture)
 * Detects context degradation, irrelevance, overload, and staleness; executes active context operations.
 */

import type { ContextAuditRecord, ContextOperationType, ContextReference } from "../CognitiveContracts";
import type { ContextIndexer } from "../rlm/ContextIndexer";

export interface ContextHealthAudit {
  readonly totalItems: number;
  readonly totalTokens: number;
  readonly staleCount: number;
  readonly redundantCount: number;
  readonly lowConfidenceCount: number;
  readonly healthScore: number; // 0.0 to 1.0
  readonly recommendedActions: ContextOperationType[];
}

export class ActiveContextManager {
  private activeItems: Map<string, ContextReference> = new Map();
  private auditLog: ContextAuditRecord[] = [];
  private maxActiveTokens: number;

  constructor(private indexer: ContextIndexer, maxActiveTokens: number = 8000) {
    this.maxActiveTokens = maxActiveTokens;
  }

  addContextItem(ref: ContextReference): void {
    this.activeItems.set(ref.refId, structuredClone(ref));
    this.recordAudit("RETAIN", ref.refId, "Added item to active working context");
  }

  getActiveItems(): ContextReference[] {
    return Array.from(this.activeItems.values()).map((r) => structuredClone(r));
  }

  getActiveTokenCount(): number {
    let sum = 0;
    for (const item of this.activeItems.values()) {
      sum += item.tokenCount;
    }
    return sum;
  }

  /**
   * Health audit of the current working context.
   */
  auditHealth(): ContextHealthAudit {
    const now = Date.now();
    let staleCount = 0;
    let redundantCount = 0;
    let lowConfidenceCount = 0;
    const seenTitles = new Set<string>();

    for (const item of this.activeItems.values()) {
      // Staleness check (> 2 hours old for logs/telemetry)
      const ageHours = (now - new Date(item.timestamp).getTime()) / (1000 * 60 * 60);
      if (ageHours > 2 && (item.type === "TELEMETRY" || item.type === "LOG")) {
        staleCount += 1;
      }

      // Redundancy check
      if (seenTitles.has(item.title.toLowerCase())) {
        redundantCount += 1;
      } else {
        seenTitles.add(item.title.toLowerCase());
      }

      // Low confidence check
      if (item.confidence < 0.5) {
        lowConfidenceCount += 1;
      }
    }

    const totalTokens = this.getActiveTokenCount();
    const tokenSaturation = Math.min(1.0, totalTokens / this.maxActiveTokens);
    const healthScore = Math.max(
      0.1,
      1.0 -
        (staleCount * 0.1 +
          redundantCount * 0.15 +
          lowConfidenceCount * 0.15 +
          (tokenSaturation > 0.9 ? 0.3 : 0.0))
    );

    const recommended: ContextOperationType[] = [];
    if (staleCount > 0) recommended.push("ARCHIVE");
    if (redundantCount > 0) recommended.push("INVALIDATE");
    if (tokenSaturation > 0.8) recommended.push("COMPRESS");

    return {
      totalItems: this.activeItems.size,
      totalTokens,
      staleCount,
      redundantCount,
      lowConfidenceCount,
      healthScore,
      recommendedActions: recommended,
    };
  }

  /**
   * Optimizes active context: compresses verbose items, archives stale items, and removes low-value noise.
   */
  pruneAndOptimize(): {
    archivedCount: number;
    compressedCount: number;
    invalidatedCount: number;
    savedTokens: number;
  } {
    const startTokens = this.getActiveTokenCount();
    let archivedCount = 0;
    let compressedCount = 0;
    let invalidatedCount = 0;
    const seenTitles = new Set<string>();
    const now = Date.now();

    for (const [refId, item] of Array.from(this.activeItems.entries())) {
      const ageHours = (now - new Date(item.timestamp).getTime()) / (1000 * 60 * 60);

      // Invalidate redundant
      if (seenTitles.has(item.title.toLowerCase())) {
        this.activeItems.delete(refId);
        invalidatedCount += 1;
        this.recordAudit("INVALIDATE", refId, "Removed duplicate context item");
        continue;
      }
      seenTitles.add(item.title.toLowerCase());

      // Archive stale
      if (ageHours > 2 && (item.type === "TELEMETRY" || item.type === "LOG")) {
        this.activeItems.delete(refId);
        archivedCount += 1;
        this.recordAudit("ARCHIVE", refId, "Archived stale telemetry context");
        continue;
      }

      // Compress large items
      if (item.tokenCount > 200) {
        const compressed: ContextReference = {
          ...item,
          summary: `${item.summary.substring(0, 100)}... [compressed]`,
          tokenCount: 40,
        };
        this.activeItems.set(refId, compressed);
        compressedCount += 1;
        this.recordAudit("COMPRESS", refId, "Compressed verbose context header");
      }
    }

    const endTokens = this.getActiveTokenCount();
    return {
      archivedCount,
      compressedCount,
      invalidatedCount,
      savedTokens: Math.max(0, startTokens - endTokens),
    };
  }

  reorderContext(priorityType?: ContextReference["type"]): void {
    const items = Array.from(this.activeItems.values());
    items.sort((a, b) => {
      if (priorityType) {
        if (a.type === priorityType && b.type !== priorityType) return -1;
        if (b.type === priorityType && a.type !== priorityType) return 1;
      }
      return b.confidence - a.confidence;
    });

    this.activeItems.clear();
    for (const item of items) {
      this.activeItems.set(item.refId, item);
    }
  }

  getAuditLog(): ContextAuditRecord[] {
    return structuredClone(this.auditLog);
  }

  private recordAudit(operation: ContextOperationType, targetRefId: string, reason: string): void {
    this.auditLog.push({
      operation,
      targetRefId,
      reason,
      timestamp: new Date().toISOString(),
    });
    if (this.auditLog.length > 200) {
      this.auditLog.shift();
    }
  }

  clear(): void {
    this.activeItems.clear();
    this.auditLog = [];
  }
}
