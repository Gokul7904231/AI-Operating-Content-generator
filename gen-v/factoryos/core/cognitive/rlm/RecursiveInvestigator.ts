/**
 * FactoryOS Frontier v2 — Recursive Investigator & RLM Context Orchestrator
 * Recursively explores evidence graphs and externalized context while respecting budget bounds.
 */

import { randomUUID } from "node:crypto";
import type {
  ContextReference,
  ContextSlice,
  RecursionBudget,
  RecursionNode,
  RecursionTrace,
} from "../CognitiveContracts";
import { ContextIndexer } from "./ContextIndexer";
import { ContextRetriever, ContextDereferencer } from "./ContextRetriever";
import { TerminationController } from "./TerminationController";

export interface InvestigationGoal {
  readonly query: string;
  readonly severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  readonly uncertainty?: number;
  readonly novelty?: number;
  readonly targetFloor?: string;
}

export class RecursiveInvestigator {
  private terminationController: TerminationController;

  constructor(
    private indexer: ContextIndexer,
    private retriever: ContextRetriever,
    private dereferencer: ContextDereferencer
  ) {
    this.terminationController = new TerminationController();
  }

  async investigate(goal: InvestigationGoal): Promise<{
    trace: RecursionTrace;
    conclusions: string[];
    dereferencedEvidence: { refId: string; title: string; content: string }[];
  }> {
    const startTime = Date.now();
    const traceId = `rtrace_${randomUUID().replace(/-/g, "").substring(0, 10)}`;

    const budget = this.terminationController.calculateBudget({
      severity: goal.severity || "MEDIUM",
      uncertainty: goal.uncertainty ?? 0.7,
      novelty: goal.novelty ?? 0.5,
      expectedInformationGain: 0.8,
    });

    const nodes: Record<string, RecursionNode> = {};
    const dereferenced: { refId: string; title: string; content: string }[] = [];
    const allFindings: string[] = [];

    let totalTokens = 0;
    let subcallCount = 0;

    // Root node
    const rootNodeId = `node_0`;
    const rootSlice = this.retriever.retrieveSlice({
      query: goal.query,
      limit: 10,
    });

    totalTokens += rootSlice.totalTokens;
    subcallCount += 1;

    // Dereference top 2 most promising clues
    for (const ref of rootSlice.references.slice(0, 2)) {
      const full = this.dereferencer.dereference(ref.refId);
      if (full) {
        dereferenced.push({
          refId: ref.refId,
          title: ref.title,
          content: full.rawContent,
        });
        totalTokens += Math.ceil(full.rawContent.length / 4);
      }
    }

    const rootFindings = rootSlice.references.map((r) => `Found relevant context [${r.type}]: ${r.title} (${r.summary})`);
    allFindings.push(...rootFindings);

    nodes[rootNodeId] = {
      nodeId: rootNodeId,
      depth: 0,
      query: goal.query,
      rationale: "Initial externalized context retrieval slice",
      tokensConsumed: rootSlice.totalTokens,
      cost: (rootSlice.totalTokens / 1000) * 0.002,
      durationMs: Date.now() - startTime,
      status: "COMPLETED",
      findings: rootFindings,
      subcallIds: [],
    };

    // Check if recursion is warranted (e.g. ambiguity or deeper investigation query)
    const check = this.terminationController.shouldTerminate(
      0,
      totalTokens,
      Date.now() - startTime,
      subcallCount,
      budget,
      rootSlice.references.length > 0 ? 0.8 : 0.1
    );

    let terminationReason = check.reason;

    if (!check.terminate && budget.maxDepth > 0) {
      // Decompose into sub-inquiry
      const subQuery = `${goal.query} root cause telemetry`;
      const subNodeId = `node_1`;
      const subStart = Date.now();

      const subSlice = this.retriever.retrieveSlice({
        query: subQuery,
        limit: 5,
      });

      totalTokens += subSlice.totalTokens;
      subcallCount += 1;

      // Dereference top sub-clue
      if (subSlice.references.length > 0) {
        const full = this.dereferencer.dereference(subSlice.references[0].refId);
        if (full) {
          dereferenced.push({
            refId: full.reference.refId,
            title: full.reference.title,
            content: full.rawContent,
          });
          totalTokens += Math.ceil(full.rawContent.length / 4);
        }
      }

      const subFindings = subSlice.references.map((r) => `Sub-investigation finding: ${r.title} -> ${r.summary}`);
      allFindings.push(...subFindings);

      nodes[subNodeId] = {
        nodeId: subNodeId,
        parentId: rootNodeId,
        depth: 1,
        query: subQuery,
        rationale: "Deepened inquiry to resolve underlying anomaly telemetry",
        tokensConsumed: subSlice.totalTokens,
        cost: (subSlice.totalTokens / 1000) * 0.002,
        durationMs: Date.now() - subStart,
        status: "COMPLETED",
        findings: subFindings,
        subcallIds: [],
      };

      nodes[rootNodeId].subcallIds.push(subNodeId);
      terminationReason = "Recursive investigation completed within budget";
    }

    const durationMs = Date.now() - startTime;
    const totalCost = (totalTokens / 1000) * 0.002;

    const trace: RecursionTrace = {
      traceId,
      rootQuery: goal.query,
      budget,
      nodes,
      totalTokens,
      totalCost,
      totalDurationMs: durationMs,
      terminationReason,
    };

    return {
      trace,
      conclusions: allFindings,
      dereferencedEvidence: dereferenced,
    };
  }
}

export class ContextOrchestrator {
  public indexer: ContextIndexer;
  public retriever: ContextRetriever;
  public dereferencer: ContextDereferencer;
  public investigator: RecursiveInvestigator;

  constructor() {
    this.indexer = new ContextIndexer();
    this.retriever = new ContextRetriever(this.indexer);
    this.dereferencer = new ContextDereferencer(this.indexer);
    this.investigator = new RecursiveInvestigator(this.indexer, this.retriever, this.dereferencer);
  }

  indexContext(items: Parameters<ContextIndexer["indexBatch"]>[0]): ContextReference[] {
    return this.indexer.indexBatch(items);
  }

  retrieveContext(options: Parameters<ContextRetriever["retrieveSlice"]>[0]): ContextSlice {
    return this.retriever.retrieveSlice(options);
  }

  dereference(refId: string) {
    return this.dereferencer.dereference(refId);
  }

  async runRecursiveInvestigation(goal: InvestigationGoal) {
    return this.investigator.investigate(goal);
  }
}
