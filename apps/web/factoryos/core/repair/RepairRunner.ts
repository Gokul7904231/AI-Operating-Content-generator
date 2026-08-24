/**
 * FactoryOS v0.1 — Repair Runner
 *
 * Runs the Evaluation-Repair correction loop.
 * Retries outputs up to maxAttempts before throwing a terminal RepairFailedError.
 */

import type { EvaluationGuardianImpl } from "../guardian/EvaluationGuardianImpl";
import type { RepairEngine } from "./RepairContracts";
import { RepairExecutionError } from "../errors/Errors";

export interface RepairRunnerOptions {
  guardian: EvaluationGuardianImpl;
  repairEngine: RepairEngine;
  maxAttempts?: number;
}

export class RepairRunner {
  private readonly guardian: EvaluationGuardianImpl;
  private readonly repairEngine: RepairEngine;
  private readonly maxAttempts: number;

  constructor(options: RepairRunnerOptions) {
    this.guardian = options.guardian;
    this.repairEngine = options.repairEngine;
    this.maxAttempts = options.maxAttempts ?? 3;
  }

  async runWithRepair<TOutput>(
    generatorFn: () => Promise<TOutput>,
    referenceEvidence?: any
  ): Promise<{ output: TOutput; attempts: number }> {
    let output = await generatorFn();
    let attempt = 1;

    while (attempt <= this.maxAttempts) {
      const report = await this.guardian.evaluateOutput(output, referenceEvidence);

      if (report.decision === "PASS") {
        return { output, attempts: attempt };
      }

      if (report.decision === "FAIL") {
        throw new RepairExecutionError(
          `Terminal output evaluation failure in attempt ${attempt}: ${report.metrics
            .filter((m) => !m.passed)
            .map((m) => m.reason || m.name)
            .join(", ")}`
        );
      }

      // If decision is REPAIR, invoke the repair engine
      if (report.decision === "REPAIR") {
        output = await this.repairEngine.repair({
          originalOutput: output,
          report,
          attempt,
          maxAttempts: this.maxAttempts,
          referenceEvidence,
        });
        attempt++;
      }
    }

    throw new RepairExecutionError(
      `Exceeded max repair attempts (${this.maxAttempts}) without achieving PASS decision.`
    );
  }
}
