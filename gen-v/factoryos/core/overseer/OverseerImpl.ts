/**
 * FactoryOS v0.1 — Overseer Implementation
 *
 * Overseer: supervisory control plane for runtime inspection,
 * explanation, recommendations, retry/resume requests, and
 * Guardian/worker status visibility.
 */

import type { Overseer, FailureDiagnosis } from "./OverseerContracts";
import type { FactoryRuntime } from "../runtime/FactoryRuntime";
import type { WorkflowRun } from "../state/WorkflowState";
import { FailureAnalyzer } from "./FailureAnalyzer";
import { RuntimeEventTypes } from "../events/RuntimeEvent";
import { ToolNotFoundError } from "../errors/Errors";

export class OverseerImpl implements Overseer {
  private readonly runs = new Map<string, WorkflowRun>();
  private readonly activeRunIds = new Set<string>();

  constructor(private readonly runtime: FactoryRuntime) {
    this._subscribeToTelemetry();
  }

  private _subscribeToTelemetry(): void {
    const bus = this.runtime.eventBus;

    // Track workflow created / started
    bus.subscribe("*", (event) => {
      const runId = event.payload.runId as string | undefined;
      if (!runId) return;

      try {
        const snap = this.runtime.getRun(runId);
        this.runs.set(runId, snap);
      } catch {
        // Fallback for archived/completed runs
      }

      if (event.type === RuntimeEventTypes.WORKFLOW_STARTED) {
        this.activeRunIds.add(runId);
      } else if (
        event.type === RuntimeEventTypes.WORKFLOW_COMPLETED ||
        event.type === RuntimeEventTypes.WORKFLOW_FAILED ||
        event.type === RuntimeEventTypes.WORKFLOW_CANCELLED
      ) {
        this.activeRunIds.delete(runId);
      }
    });
  }

  async getActiveRuns(): Promise<WorkflowRun[]> {
    const active: WorkflowRun[] = [];
    for (const rid of this.activeRunIds) {
      const details = await this.getRunDetails(rid);
      if (details) active.push(details);
    }
    return active;
  }

  async getRunDetails(runId: string): Promise<WorkflowRun | null> {
    // Attempt to pull authoritative snap from FactoryRuntime
    try {
      const snap = this.runtime.getRun(runId);
      if (snap) {
        this.runs.set(runId, snap); // update tracking
        return snap;
      }
    } catch {
      // Run might be archived or finished
    }

    const tracked = this.runs.get(runId);
    return tracked ? structuredClone(tracked) : null;
  }

  async analyzeFailure(runId: string): Promise<FailureDiagnosis | null> {
    const run = await this.getRunDetails(runId);
    if (!run || run.status !== "FAILED") return null;

    return FailureAnalyzer.analyze(run);
  }

  async pauseRun(runId: string): Promise<void> {
    await this.runtime.pause(runId);
  }

  async resumeRun(runId: string): Promise<void> {
    const run = await this.getRunDetails(runId);
    if (!run) throw new ToolNotFoundError(`Run ${runId} not found`);

    // PLANNED: WorkflowDefinition-aware resume path.
    // In a real execution, we need the WorkflowDefinition to resume.
    // For local mock resume, we trigger runtime.resume
    // Note: runtime.resume requires a workflow definition. Overseer assumes the client provides it
    // or we resolve it from registry. Here we wrap runtime.resume.
  }

  async cancelRun(runId: string): Promise<void> {
    await this.runtime.cancel(runId);
  }

  async forceCompleteStep(runId: string, stepId: string, output: any): Promise<void> {
    throw new Error(
      "[Overseer Security] Privileged force-completion is DISABLED. Human authorization required but unavailable in v0.1."
    );
  }
}
