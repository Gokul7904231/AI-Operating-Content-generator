/**
 * FactoryOS v0.1 — Overseer Contracts
 *
 * Overseer: supervisory control plane for runtime inspection,
 * explanation, recommendations, retry/resume requests, and
 * Guardian/worker status visibility.
 */

import type { WorkflowRun } from "../state/WorkflowState";

export interface FailureDiagnosis {
  runId: string;
  failedStepId: string;
  errorClass: string;
  errorMessage: string;
  stackTrace?: string;
  remediationSuggestion: string;
}

export interface Overseer {
  getActiveRuns(): Promise<WorkflowRun[]>;
  getRunDetails(runId: string): Promise<WorkflowRun | null>;
  analyzeFailure(runId: string): Promise<FailureDiagnosis | null>;
  pauseRun(runId: string): Promise<void>;
  resumeRun(runId: string): Promise<void>;
  cancelRun(runId: string): Promise<void>;
  forceCompleteStep(runId: string, stepId: string, output: any): Promise<void>;
}
