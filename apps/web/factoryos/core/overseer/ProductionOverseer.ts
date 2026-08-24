import { AutonomousScheduler } from "../production/AutonomousScheduler";
import { ProductionJob, ProductionJobStatus } from "../production/ProductionJob";
import { NetworkCapability, NetworkCapabilityMonitor } from "../production/NetworkCapabilityMonitor";
import { QuizGuardian } from "../guardian/QuizGuardian";

export interface OverseerSnapshot {
  timestamp: string;
  date: string;
  dailyPolicy: {
    maxPerDay: number;
    planned: number;
    completed: number;
    running: number;
    waiting: number;
    failed: number;
    remainingQuota: number;
  };
  currentJob?: {
    id: string;
    topic: string;
    stage: ProductionJobStatus;
    attempts: number;
    startedAt?: string;
  };
  nextScheduledJob?: {
    id: string;
    topic: string;
    plannedSlot: number;
  };
  nextAction: string;
  systemStatus: {
    network: NetworkCapability;
    drive: "AVAILABLE" | "OFFLINE" | "UNCONFIGURED";
    guardian: "HEALTHY" | "DEGRADED";
  };
  timeline: Array<{ time: string; event: string; jobId?: string }>;
}

export class ProductionOverseer {
  private scheduler: AutonomousScheduler;
  private networkMonitor: NetworkCapabilityMonitor;
  private guardian: QuizGuardian;
  private auditTimeline: Array<{ time: string; event: string; jobId?: string }> = [];

  constructor(scheduler: AutonomousScheduler, guardian?: QuizGuardian) {
    this.scheduler = scheduler;
    this.networkMonitor = NetworkCapabilityMonitor.getInstance();
    this.guardian = guardian ?? new QuizGuardian();
  }

  logAuditEvent(event: string, jobId?: string): void {
    const entry = { time: new Date().toISOString(), event, jobId };
    this.auditTimeline.push(entry);
    console.log(`[OverseerAudit] ${entry.time} | Job: ${jobId ?? "N/A"} | ${event}`);
  }

  getSnapshot(date: string): OverseerSnapshot {
    const jobs = this.scheduler.getJobsForDate(date);
    const config = this.scheduler.getPolicy();

    const planned = jobs.filter((j) => j.status === "PLANNED").length;
    const completed = jobs.filter((j) => j.status === "COMPLETED").length;
    const running = jobs.filter((j) =>
      ["GENERATING", "VALIDATING", "REPAIRING", "RENDERING", "OUTPUT_VALIDATION", "UPLOADING"].includes(j.status)
    ).length;
    const waiting = jobs.filter((j) => ["WAITING", "DELIVERY_PENDING", "RETRY_WAIT"].includes(j.status)).length;
    const failed = jobs.filter((j) => j.status === "FAILED").length;

    const currentJob = jobs.find((j) =>
      ["GENERATING", "VALIDATING", "REPAIRING", "RENDERING", "OUTPUT_VALIDATION", "UPLOADING", "DELIVERY_PENDING"].includes(j.status)
    );

    const nextScheduled = jobs.find((j) => j.status === "PLANNED" || j.status === "WAITING");

    let nextAction = "Idle - Waiting for next scheduled slot.";
    if (currentJob) {
      switch (currentJob.status) {
        case "GENERATING":
          nextAction = `Generating quiz payload for topic "${currentJob.topic}"`;
          break;
        case "VALIDATING":
        case "REPAIRING":
          nextAction = `Validating quiz quality via Quiz Guardian`;
          break;
        case "RENDERING":
          nextAction = `Rendering video MP4 via Video Pipeline`;
          break;
        case "OUTPUT_VALIDATION":
          nextAction = `Verifying generated video artifact integrity`;
          break;
        case "DELIVERY_PENDING":
        case "UPLOADING":
          nextAction = `Delivering output artifact to Google Drive outbox`;
          break;
      }
    } else if (nextScheduled) {
      nextAction = `Execute scheduled slot ${nextScheduled.plannedSlot}: "${nextScheduled.topic}"`;
    }

    const netStatus = this.networkMonitor.getStatus();
    const hasDriveCredentials =
      process.env.GOOGLE_DRIVE_CLIENT_EMAIL ||
      process.env.GOOGLE_DRIVE_CREDENTIALS_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      (process.env.GOOGLE_DRIVE_CLIENT_ID &&
        process.env.GOOGLE_DRIVE_CLIENT_SECRET &&
        process.env.GOOGLE_DRIVE_REFRESH_TOKEN);
    const driveStatus = hasDriveCredentials
      ? netStatus === "OFFLINE"
        ? "OFFLINE"
        : "AVAILABLE"
      : "UNCONFIGURED";

    return {
      timestamp: new Date().toISOString(),
      date,
      dailyPolicy: {
        maxPerDay: config.maxPerDay,
        planned,
        completed,
        running,
        waiting,
        failed,
        remainingQuota: Math.max(0, config.maxPerDay - (completed + running)),
      },
      currentJob: currentJob
        ? {
            id: currentJob.id,
            topic: currentJob.topic,
            stage: currentJob.status,
            attempts: currentJob.attempts,
            startedAt: currentJob.startedAt,
          }
        : undefined,
      nextScheduledJob: nextScheduled
        ? {
            id: nextScheduled.id,
            topic: nextScheduled.topic,
            plannedSlot: nextScheduled.plannedSlot,
          }
        : undefined,
      nextAction,
      systemStatus: {
        network: netStatus,
        drive: driveStatus,
        guardian: "HEALTHY",
      },
      timeline: [...this.auditTimeline.slice(-20)],
    };
  }

  // Overseer Permitted Actions
  pauseJob(jobId: string): ProductionJob {
    this.logAuditEvent(`Overseer paused job execution`, jobId);
    return this.scheduler.updateJobStatus(jobId, "PAUSED", "Paused by Overseer intervention");
  }

  resumeJob(jobId: string): ProductionJob {
    this.logAuditEvent(`Overseer resumed job execution`, jobId);
    return this.scheduler.updateJobStatus(jobId, "WAITING");
  }

  cancelJob(jobId: string, reason: string): ProductionJob {
    this.logAuditEvent(`Overseer cancelled job: ${reason}`, jobId);
    return this.scheduler.updateJobStatus(jobId, "CANCELLED", reason);
  }

  retryJob(jobId: string): ProductionJob {
    const job = this.scheduler.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== "FAILED" && job.status !== "RETRY_WAIT") {
      throw new Error(`Overseer cannot retry job ${jobId} in status ${job.status}`);
    }
    this.logAuditEvent(`Overseer manually triggered retry for job`, jobId);

    let target = job;
    if (target.status === "FAILED") {
      target = this.scheduler.updateJobStatus(jobId, "RETRY_WAIT", "Queued for retry");
    }
    return this.scheduler.updateJobStatus(target.id, "WAITING", "Retry activated");
  }

  // Enforce Overseer Safety Constraints
  forceComplete(jobId: string): never {
    throw new Error("[OverseerSecurityViolation] Overseer is prohibited from forcing job status to COMPLETED without valid delivery.");
  }

  forceGuardianPass(jobId: string): never {
    throw new Error("[OverseerSecurityViolation] Overseer is prohibited from overriding Quiz Guardian evaluation decisions.");
  }
}
