/**
 * FactoryOS v1 — Overseer Decision Ledger
 * Records every reasoning trajectory, choice, prediction, actual outcome, and learning data.
 */

import { randomUUID } from "node:crypto";
import type { DecisionRecord, ThinkingMode } from "../contracts/OverseerThinkingContracts";
import type { IDecisionRepository } from "../database/DatabaseContracts";
import { InMemoryDecisionRepository } from "../database/InMemoryDatabase";

export interface LogDecisionParams {
  readonly goalId?: string;
  readonly caseId?: string;
  readonly stateSnapshot: Record<string, unknown>;
  readonly thinkingMode: ThinkingMode;
  readonly availableOptions: string[];
  readonly selectedOption: string;
  readonly reasoningSummary: string;
  readonly predictedOutcome: string;
  readonly agentsUsed: string[];
  readonly toolsUsed: string[];
  readonly executionTimeMs: number;
  readonly costEstimateTokens?: number;
  readonly verified?: boolean;
}

export class DecisionLedger {
  private repository: IDecisionRepository;

  constructor(repository: IDecisionRepository = new InMemoryDecisionRepository()) {
    this.repository = repository;
  }

  async record(params: LogDecisionParams): Promise<DecisionRecord> {
    const decision: DecisionRecord = {
      decisionId: `dec_${randomUUID().replace(/-/g, "").substring(0, 12)}`,
      goalId: params.goalId,
      caseId: params.caseId,
      stateSnapshot: structuredClone(params.stateSnapshot),
      thinkingMode: params.thinkingMode,
      availableOptions: [...params.availableOptions],
      selectedOption: params.selectedOption,
      reasoningSummary: params.reasoningSummary,
      predictedOutcome: params.predictedOutcome,
      agentsUsed: [...params.agentsUsed],
      toolsUsed: [...params.toolsUsed],
      executionTimeMs: params.executionTimeMs,
      costEstimateTokens: params.costEstimateTokens || 0,
      verified: params.verified ?? true,
      timestamp: new Date().toISOString(),
    };

    await this.repository.recordDecision(decision);
    return decision;
  }

  async updateActualOutcome(
    decisionId: string,
    actualOutcome: string,
    predictionError: number = 0.0,
    lessonsLearned: string[] = []
  ): Promise<void> {
    const dec = await this.repository.getDecisionById(decisionId);
    if (dec) {
      dec.actualOutcome = actualOutcome;
      dec.predictionError = predictionError;
      dec.lessonsLearned = lessonsLearned;
      await this.repository.recordDecision(dec);
    }
  }

  async getRecentDecisions(limit: number = 50): Promise<DecisionRecord[]> {
    return this.repository.getRecentDecisions(limit);
  }
}
