import fs from "fs";
import path from "path";
import { DailyProductionPolicy, ProductionQuotaLimit } from "./DailyProductionPolicy";
import { ProductionJob, ProductionJobStatus } from "./ProductionJob";
import { ProductionStateMachine } from "./ProductionStateMachine";
import { ProductionIdempotency } from "./ProductionIdempotency";

export class AutonomousScheduler {
  private policy: DailyProductionPolicy;
  private jobs: Map<string, ProductionJob> = new Map();
  private idempotencyStore: Set<string> = new Set();
  private persistenceFilePath: string;

  constructor(policy?: DailyProductionPolicy, persistenceFilePath?: string) {
    this.policy = policy ?? new DailyProductionPolicy();
    this.persistenceFilePath =
      persistenceFilePath ??
      (process.env.VITEST || process.env.NODE_ENV === "test"
        ? ""
        : path.join(process.cwd(), "data", "production_jobs.json"));

    if (this.persistenceFilePath) {
      const dir = path.dirname(this.persistenceFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.loadFromDisk();
    }
  }

  setQuota(limit: ProductionQuotaLimit): void {
    this.policy.setQuota(limit);
  }

  getPolicy() {
    return this.policy.getConfig();
  }

  planDailySchedule(date: string, topics: string[]): ProductionJob[] {
    const config = this.policy.getConfig();
    const plannedJobs: ProductionJob[] = [];
    const maxSlots = Math.min(topics.length, config.maxPerDay);

    for (let slot = 1; slot <= maxSlots; slot++) {
      const topic = topics[slot - 1];
      const idempotencyKey = ProductionIdempotency.generateScheduleKey(date, slot, topic);

      if (this.idempotencyStore.has(idempotencyKey)) {
        console.warn(`[AutonomousScheduler] Slot ${slot} for ${date} ("${topic}") already planned (idempotency key match). Skipping.`);
        continue;
      }

      const jobId = `job_${date}_slot${slot}_${Date.now().toString(36)}`;
      const job: ProductionJob = {
        id: jobId,
        scheduleId: `sched_${date}_slot${slot}`,
        requestedDate: date,
        plannedSlot: slot,
        topic,
        status: "PLANNED",
        attempts: 0,
        maxAttempts: config.maxRetriesPerJob,
        createdAt: new Date().toISOString(),
        idempotencyKey,
      };

      this.jobs.set(jobId, job);
      this.idempotencyStore.add(idempotencyKey);
      plannedJobs.push(job);
    }

    this.saveToDisk();
    return plannedJobs;
  }

  getJob(jobId: string): ProductionJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): ProductionJob[] {
    return Array.from(this.jobs.values());
  }

  getJobsForDate(date: string): ProductionJob[] {
    return this.getAllJobs().filter((j) => j.requestedDate === date);
  }

  updateJobStatus(jobId: string, targetStatus: ProductionJobStatus, reason?: string): ProductionJob {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in AutonomousScheduler.`);
    }

    // Check daily quota before moving into GENERATING
    if (targetStatus === "GENERATING") {
      const dateJobs = this.getJobsForDate(job.requestedDate);
      const completedOrActive = dateJobs.filter((j) =>
        ["GENERATING", "VALIDATING", "REPAIRING", "RENDERING", "OUTPUT_VALIDATION", "DELIVERY_PENDING", "UPLOADING", "COMPLETED"].includes(j.status)
      ).length;

      const config = this.policy.getConfig();
      if (completedOrActive >= config.maxPerDay) {
        console.warn(`[AutonomousScheduler] Quota limit reached for date ${job.requestedDate} (${completedOrActive}/${config.maxPerDay}). Job ${jobId} set to BLOCKED.`);
        const blockedJob = ProductionStateMachine.transition(job, "BLOCKED", `Daily quota limit (${config.maxPerDay}) reached.`);
        this.updateJob(blockedJob);
        return blockedJob;
      }
    }

    const updated = ProductionStateMachine.transition(job, targetStatus, reason);
    this.updateJob(updated);
    return updated;
  }

  updateJob(job: ProductionJob): void {
    this.jobs.set(job.id, job);
    if (job.idempotencyKey) {
      this.idempotencyStore.add(job.idempotencyKey);
    }
    this.saveToDisk();
  }

  private saveToDisk(): void {
    if (!this.persistenceFilePath) return;
    try {
      const array = Array.from(this.jobs.values());
      fs.writeFileSync(this.persistenceFilePath, JSON.stringify(array, null, 2));
    } catch (err: any) {
      console.error(`[AutonomousScheduler] Failed writing jobs to disk:`, err?.message ?? err);
    }
  }

  private loadFromDisk(): void {
    if (!this.persistenceFilePath) return;
    if (fs.existsSync(this.persistenceFilePath)) {
      try {
        const raw = fs.readFileSync(this.persistenceFilePath, "utf-8");
        const list: ProductionJob[] = JSON.parse(raw);
        for (const job of list) {
          this.jobs.set(job.id, job);
          if (job.idempotencyKey) {
            this.idempotencyStore.add(job.idempotencyKey);
          }
        }
        console.log(`[AutonomousScheduler] Loaded ${this.jobs.size} persisted production jobs from disk.`);
      } catch (err: any) {
        console.warn(`[AutonomousScheduler] Failed reading jobs from disk:`, err?.message ?? err);
      }
    }
  }
}
