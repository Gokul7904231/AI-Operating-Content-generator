/**
 * FactoryOS v1 — Validator Contracts
 * Defines independent deterministic verification requirements before a case can be closed.
 */

export interface InvariantCheckResult {
  readonly invariantId: string;
  readonly description: string;
  readonly passed: boolean;
  readonly expectedValue: unknown;
  readonly actualValue: unknown;
  readonly checkTimestamp: string;
}

export interface ValidatorReport {
  readonly reportId: string;
  readonly caseId: string;
  readonly validatorId: string;
  readonly overallPassed: boolean;
  readonly invariantsChecked: InvariantCheckResult[];
  readonly telemetryNormalized: boolean;
  readonly noRegressionsDetected: boolean;
  readonly verificationDurationMs: number;
  readonly evidenceSummary: string;
  readonly verifiedAt: string;
}
