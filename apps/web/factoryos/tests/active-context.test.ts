import { describe, it, expect, beforeEach } from "vitest";
import { ContextIndexer } from "../core/cognitive/rlm/ContextIndexer";
import { ActiveContextManager } from "../core/cognitive/context/ActiveContextManager";

describe("FactoryOS Frontier v2 — Active Context Management Suite (ARC)", () => {
  let indexer: ContextIndexer;
  let contextManager: ActiveContextManager;

  beforeEach(() => {
    indexer = new ContextIndexer();
    contextManager = new ActiveContextManager(indexer, 2000);
  });

  it("01: Audits active context health and detects staleness, redundancy, and low confidence", () => {
    const freshRef = indexer.indexItem({
      type: "LOG",
      title: "Fresh log entry",
      content: "Execution started normally",
      source: "floor01",
      confidence: 0.95,
      timestamp: new Date().toISOString(),
    });

    const staleRef = indexer.indexItem({
      type: "TELEMETRY",
      title: "Old telemetry sample",
      content: "CPU at 20%",
      source: "kernel",
      confidence: 0.9,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hrs old
    });

    const redundantRef = indexer.indexItem({
      type: "LOG",
      title: "Fresh log entry", // Duplicate title
      content: "Duplicate content",
      source: "floor01",
      confidence: 0.4, // Low confidence
    });

    contextManager.addContextItem(freshRef);
    contextManager.addContextItem(staleRef);
    contextManager.addContextItem(redundantRef);

    const audit = contextManager.auditHealth();
    expect(audit.totalItems).toBe(3);
    expect(audit.staleCount).toBe(1);
    expect(audit.redundantCount).toBe(1);
    expect(audit.lowConfidenceCount).toBe(1);
    expect(audit.healthScore).toBeLessThan(1.0);
    expect(audit.recommendedActions).toContain("ARCHIVE");
  });

  it("02: Prunes and optimizes active context by archiving stale and invalidating redundant items", () => {
    const r1 = indexer.indexItem({
      type: "LOG",
      title: "Active Job Log",
      content: "Job running " + "A".repeat(1200), // ~300 tokens
      source: "floor02",
    });

    const r2 = indexer.indexItem({
      type: "TELEMETRY",
      title: "Stale socket metric",
      content: "Socket open",
      source: "kernel",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    });

    const r3 = indexer.indexItem({
      type: "LOG",
      title: "Active Job Log", // Duplicate
      content: "Duplicate job log",
      source: "floor02",
    });

    contextManager.addContextItem(r1);
    contextManager.addContextItem(r2);
    contextManager.addContextItem(r3);

    const result = contextManager.pruneAndOptimize();
    expect(result.invalidatedCount).toBe(1);
    expect(result.archivedCount).toBe(1);
    expect(result.compressedCount).toBe(1);
    expect(result.savedTokens).toBeGreaterThan(0);

    const active = contextManager.getActiveItems();
    expect(active.length).toBe(1);
    expect(active[0].summary).toContain("[compressed]");
  });

  it("03: Maintains chronological audit log of all context operations", () => {
    const ref = indexer.indexItem({
      type: "MEMORY",
      title: "Important resolution recipe",
      content: "Recipe details",
      source: "memory_engine",
    });

    contextManager.addContextItem(ref);
    const auditLog = contextManager.getAuditLog();

    expect(auditLog.length).toBeGreaterThan(0);
    expect(auditLog[0].operation).toBe("RETAIN");
    expect(auditLog[0].targetRefId).toBe(ref.refId);
  });
});
