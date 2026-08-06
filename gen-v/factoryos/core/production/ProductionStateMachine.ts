import { ProductionJob, ProductionJobStatus } from "./ProductionJob";

export class InvalidStateTransitionError extends Error {
  constructor(public from: ProductionJobStatus, public to: ProductionJobStatus, message?: string) {
    super(message || `Invalid state transition from ${from} to ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export class ProductionStateMachine {
  private static readonly ALLOWED_TRANSITIONS: Record<ProductionJobStatus, ProductionJobStatus[]> = {
    PLANNED: ["WAITING", "CANCELLED", "BLOCKED"],
    WAITING: ["GENERATING", "PAUSED", "CANCELLED", "BLOCKED"],
    GENERATING: ["VALIDATING", "RETRY_WAIT", "FAILED", "CANCELLED"],
    VALIDATING: ["REPAIRING", "RENDERING", "RETRY_WAIT", "FAILED", "CANCELLED"],
    REPAIRING: ["VALIDATING", "RETRY_WAIT", "FAILED", "CANCELLED"],
    RENDERING: ["OUTPUT_VALIDATION", "RETRY_WAIT", "FAILED", "CANCELLED"],
    OUTPUT_VALIDATION: ["DELIVERY_PENDING", "FAILED", "CANCELLED"],
    DELIVERY_PENDING: ["UPLOADING", "PAUSED", "BLOCKED", "CANCELLED"],
    UPLOADING: ["COMPLETED", "DELIVERY_PENDING", "RETRY_WAIT", "FAILED", "CANCELLED"],
    COMPLETED: [], // Terminal
    RETRY_WAIT: ["WAITING", "GENERATING", "RENDERING", "UPLOADING", "CANCELLED", "FAILED"],
    PAUSED: ["WAITING", "GENERATING", "RENDERING", "DELIVERY_PENDING", "UPLOADING", "CANCELLED"],
    BLOCKED: ["WAITING", "DELIVERY_PENDING", "CANCELLED"],
    FAILED: ["RETRY_WAIT", "CANCELLED"], // Allows controlled retry reset
    CANCELLED: [], // Terminal
  };

  static validateTransition(currentStatus: ProductionJobStatus, targetStatus: ProductionJobStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus] || [];
    return allowed.includes(targetStatus);
  }

  static transition(job: ProductionJob, targetStatus: ProductionJobStatus, reason?: string): ProductionJob {
    if (!this.validateTransition(job.status, targetStatus)) {
      throw new InvalidStateTransitionError(job.status, targetStatus);
    }

    const updatedJob: ProductionJob = {
      ...job,
      status: targetStatus,
    };

    if (reason) {
      updatedJob.failureReason = reason;
    }

    if (targetStatus === "GENERATING" && !updatedJob.startedAt) {
      updatedJob.startedAt = new Date().toISOString();
    }

    if (targetStatus === "COMPLETED" || targetStatus === "FAILED" || targetStatus === "CANCELLED") {
      updatedJob.completedAt = new Date().toISOString();
    }

    return updatedJob;
  }
}
