export type UserTier = "FREE" | "PRO" | "ENTERPRISE";
export type RenderJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface RenderJob {
  id: string;
  jobId: string;
  userId: string;
  tier: UserTier;
  topic: string;
  status: RenderJobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  workerId?: string;
  renderDurationSeconds?: number;
  outputArtifactUrl?: string;
  error?: string;
}

export interface WorkerInfo {
  id: string;
  name: string;
  status: "ONLINE" | "BUSY" | "OFFLINE";
  endpoint: string;
  activeJobId?: string;
  lastHeartbeat: string;
}

export class RenderQueueManager {
  private static queue: RenderJob[] = [];
  private static activeJobs = new Map<string, RenderJob>();
  private static workers: WorkerInfo[] = [
    {
      id: "worker-vps-main",
      name: "Shared VPS Render Worker #1",
      status: "ONLINE",
      endpoint: process.env.NEXT_PUBLIC_RENDER_ENGINE_URL || "http://127.0.0.1:8000",
      lastHeartbeat: new Date().toISOString(),
    },
  ];

  static enqueue(jobData: Omit<RenderJob, "status" | "attempts" | "maxAttempts" | "createdAt">): RenderJob {
    const job: RenderJob = {
      ...jobData,
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
    this.sortQueue();
    return job;
  }

  static sortQueue() {
    // Sort queue by tier priority (ENTERPRISE = 3, PRO = 2, FREE = 1) then by createdAt ASC
    const tierPriority: Record<UserTier, number> = { ENTERPRISE: 3, PRO: 2, FREE: 1 };
    this.queue.sort((a, b) => {
      const pA = tierPriority[a.tier] || 1;
      const pB = tierPriority[b.tier] || 1;
      if (pA !== pB) return pB - pA;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  static getQueue(): RenderJob[] {
    return [...this.queue];
  }

  static getActiveJobs(): RenderJob[] {
    return Array.from(this.activeJobs.values());
  }

  static getWorkers(): WorkerInfo[] {
    return [...this.workers];
  }

  static processNextJob(workerId: string): RenderJob | null {
    if (this.queue.length === 0) return null;
    const worker = this.workers.find(w => w.id === workerId);
    if (!worker || worker.status === "BUSY") return null;

    const job = this.queue.shift()!;
    job.status = "PROCESSING";
    job.startedAt = new Date().toISOString();
    job.workerId = workerId;
    job.attempts += 1;

    worker.status = "BUSY";
    worker.activeJobId = job.id;

    this.activeJobs.set(job.id, job);
    return job;
  }

  static completeJob(jobId: string, outputArtifactUrl: string, renderDurationSeconds: number): RenderJob | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.outputArtifactUrl = outputArtifactUrl;
    job.renderDurationSeconds = renderDurationSeconds;

    if (job.workerId) {
      const worker = this.workers.find(w => w.id === job.workerId);
      if (worker) {
        worker.status = "ONLINE";
        worker.activeJobId = undefined;
      }
    }

    this.activeJobs.delete(jobId);
    return job;
  }

  static failJob(jobId: string, error: string): RenderJob | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    if (job.workerId) {
      const worker = this.workers.find(w => w.id === job.workerId);
      if (worker) {
        worker.status = "ONLINE";
        worker.activeJobId = undefined;
      }
    }

    if (job.attempts < job.maxAttempts) {
      // Re-enqueue for retry
      job.status = "QUEUED";
      job.error = `Attempt ${job.attempts} failed: ${error}`;
      this.queue.push(job);
      this.sortQueue();
      this.activeJobs.delete(jobId);
      return job;
    }

    job.status = "FAILED";
    job.completedAt = new Date().toISOString();
    job.error = error;
    this.activeJobs.delete(jobId);
    return job;
  }

  static cancelJob(jobId: string): boolean {
    const inQueueIndex = this.queue.findIndex(j => j.id === jobId || j.jobId === jobId);
    if (inQueueIndex >= 0) {
      this.queue.splice(inQueueIndex, 1);
      return true;
    }

    const activeJob = Array.from(this.activeJobs.values()).find(j => j.id === jobId || j.jobId === jobId);
    if (activeJob) {
      activeJob.status = "CANCELLED";
      if (activeJob.workerId) {
        const worker = this.workers.find(w => w.id === activeJob.workerId);
        if (worker) {
          worker.status = "ONLINE";
          worker.activeJobId = undefined;
        }
      }
      this.activeJobs.delete(activeJob.id);
      return true;
    }

    return false;
  }
}
