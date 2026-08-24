/**
 * FactoryOS v0.1 — Failure Analyzer
 *
 * Inspects failed workflow runs and diagnoses errors to provide
 * actionable operator remediation suggestions.
 */

import type { FailureDiagnosis } from "./OverseerContracts";
import type { WorkflowRun } from "../state/WorkflowState";

export class FailureAnalyzer {
  static analyze(run: WorkflowRun): FailureDiagnosis | null {
    if (!run || run.status !== "FAILED") return null;

    // Find the failed step
    let failedStepId = "";
    let errorMessage = "";
    let errorClass = "UnknownError";

    for (const [sid, step] of Object.entries(run.steps)) {
      if (step.status === "FAILED") {
        failedStepId = sid;
        const rawError = step.error || "Step execution failed with unknown error.";
        errorMessage = typeof rawError === "object" ? JSON.stringify(rawError) : String(rawError);
        break;
      }
    }

    if (!failedStepId) {
      // General workflow failure outside a specific step
      errorMessage = run.failure?.errorMessage || "Workflow execution failed.";
    }

    // Determine error class and suggest remediation
    let remediationSuggestion = "Check step implementation for unhandled exceptions or resource exhaustion.";

    if (errorMessage.includes("Tool not found") || errorMessage.includes("ToolNotFoundError")) {
      errorClass = "ToolNotFoundError";
      remediationSuggestion = "Register the missing tool in the FactoryRuntime tool registry before restarting.";
    } else if (errorMessage.includes("Validation failed for tool") || errorMessage.includes("ToolValidationError")) {
      errorClass = "ToolValidationError";
      remediationSuggestion = "Verify the input argument schema of the tool invocation matches its contract.";
    } else if (errorMessage.includes("Workflow version mismatch") || errorMessage.includes("WorkflowVersionMismatchError")) {
      errorClass = "WorkflowVersionMismatchError";
      remediationSuggestion = "Align the resume workflow version with the original version stored in the checkpoint.";
    } else if (errorMessage.includes("Invalid workflow definition") || errorMessage.includes("InvalidWorkflowDefinitionError")) {
      errorClass = "InvalidWorkflowDefinitionError";
      remediationSuggestion = "Remove duplicate step IDs or resolve structural issues in the workflow definition.";
    }

    return {
      runId: run.runId,
      failedStepId,
      errorClass,
      errorMessage,
      remediationSuggestion,
    };
  }
}
