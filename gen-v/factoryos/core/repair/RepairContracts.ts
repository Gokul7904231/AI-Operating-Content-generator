/**
 * FactoryOS v0.1 — Repair Engine Contracts
 *
 * Contracts for automatically recovering failed worker outputs using
 * deterministic correction loops.
 */

import type { EvaluationReport } from "../guardian/GuardianContracts";

export interface RepairContext<TOutput = any> {
  originalOutput: TOutput;
  report: EvaluationReport;
  attempt: number;
  maxAttempts: number;
  referenceEvidence?: any;
}

export interface RepairEngine<TOutput = any> {
  repair(context: RepairContext<TOutput>): Promise<TOutput>;
}
