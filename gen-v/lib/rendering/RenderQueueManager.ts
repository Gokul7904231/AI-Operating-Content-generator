export type UserTier = "FREE" | "PRO" | "ENTERPRISE" | "ADMIN";
export type RenderJobStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type ContentEngineType = "quiz" | "facts" | "narration" | "education" | "stories" | "v2_custom";
export type AIExecutionMode = "CLOUD" | "BYOK" | "BYOLM";

export interface RenderJobOutputConfig {
  format: "mp4" | "webm";
  width: number;
  height: number;
  fps: number;
}

export interface RenderJobDeliveryConfig {
  download: boolean;
  googleDrive: boolean;
}

export interface RenderArtifactMeta {
  uri: string;
  sizeBytes: number;
  durationMs: number;
}

export interface UniversalRenderJob {
  id: string;
  jobId: string;
  factoryVersion: string; // e.g. "v1"
  contentEngine: ContentEngineType;
  tenantId: string;
  userId: string;
  tier: UserTier;
  aiExecutionMode: AIExecutionMode;
  topic: string;
  status: RenderJobStatus;
  attempts: number;
  maxAttempts: number;
  timeline: any;
  assets: any[];
  audio: any[];
  subtitles: any;
  output: RenderJobOutputConfig;
  delivery: RenderJobDeliveryConfig;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  workerId?: string;
  renderDurationSeconds?: number;
  outputArtifact?: RenderArtifactMeta;
  error?: string;
}

export interface WorkerHeartbeat {
  workerId: string;
  name: string;
  status: "READY" | "BUSY" | "OFFLINE";
  architecture: "arm64" | "x86_64";
  ffmpegAvailable: boolean;
  queueDepth: number;
  endpoint: string;
  activeJobId?: string;
  lastHeartbeat: string;
}

export class RenderQueueManager {
  private static queue: UniversalRenderJob[] = [];
  private static activeJobs = new Map<string, UniversalRenderJob>();
  private static workers: WorkerHeartbeat[] = [
    {
      workerId: "oracle-a1-01",
      name: "Oracle Cloud Always Free A1 (ARM64 Worker)",
      status: "READY",
      architecture: "arm64",
      ffmpegAvailable: true,
      queueDepth: 0,
      endpoint: process.env.NEXT_PUBLIC_RENDER_ENGINE_URL || "http://127.0.0.1:8000",
      lastHeartbeat: new Date().toISOString(),
    },
  ];

  static enqueue(jobData: Partial<UniversalRenderJob> & { jobId: string; topic: string; tenantId: string; userId: string }): UniversalRenderJob {
    const job: UniversalRenderJob = {
      id: jobData.id || `render_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      jobId: jobData.jobId,
      factoryVersion: jobData.factoryVersion || "v1",
      contentEngine: jobData.contentEngine || "quiz",
      tenantId: jobData.tenantId,
      userId: jobData.userId,
      tier: jobData.tier || "FREE",
      aiExecutionMode: jobData.aiExecutionMode || "CLOUD",
      topic: jobData.topic,
      status: "QUEUED",
      attempts: 0,
      maxAttempts: 3,
      timeline: jobData.timeline || {},
      assets: jobData.assets || [],
      audio: jobData.audio || [],
      subtitles: jobData.subtitles || {},
      output: jobData.output || { format: "mp4", width: 1080, height: 1920, fps: 30 },
      delivery: jobData.delivery || { download: true, googleDrive: true },
      createdAt: new Date().toISOString(),
    };

    this.queue.push(job);
    this.sortQueue();
    this.updateWorkerQueueDepths();
    return job;
  }

  static sortQueue() {
    const tierPriority: Record<UserTier, number> = { ADMIN: 4, ENTERPRISE: 3, PRO: 2, FREE: 1 };
    this.queue.sort((a, b) => {
      const pA = tierPriority[a.tier] || 1;
      const pB = tierPriority[b.tier] || 1;
      if (pA !== pB) return pB - pA;
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
  }

  static updateWorkerQueueDepths() {
    for (const w of this.workers) {
      w.queueDepth = this.queue.length;
    }
  }

  static getQueue(): UniversalRenderJob[] {
    return [...this.queue];
  }

  static getActiveJobs(): UniversalRenderJob[] {
    return Array.from(this.activeJobs.values());
  }

  static getWorkers(): WorkerHeartbeat[] {
    return [...this.workers];
  }

  static processNextJob(workerId: string): UniversalRenderJob | null {
    if (this.queue.length === 0) return null;
    const worker = this.workers.find(w => w.workerId === workerId);
    if (!worker || worker.status === "BUSY") return null;

    const job = this.queue.shift()!;
    job.status = "PROCESSING";
    job.startedAt = new Date().toISOString();
    job.workerId = workerId;
    job.attempts += 1;

    worker.status = "BUSY";
    worker.activeJobId = job.id;
    this.updateWorkerQueueDepths();

    this.activeJobs.set(job.id, job);
    return job;
  }

  static completeJob(jobId: string, artifact: RenderArtifactMeta): UniversalRenderJob | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.outputArtifact = artifact;
    job.renderDurationSeconds = Math.round(artifact.durationMs / 1000);

    if (job.workerId) {
      const worker = this.workers.find(w => w.workerId === job.workerId);
      if (worker) {
        worker.status = "READY";
        worker.activeJobId = undefined;
      }
    }

    this.activeJobs.delete(jobId);
    return job;
  }

  static failJob(jobId: string, error: string): UniversalRenderJob | null {
    const job = this.activeJobs.get(jobId);
    if (!job) return null;

    if (job.workerId) {
      const worker = this.workers.find(w => w.workerId === job.workerId);
      if (worker) {
        worker.status = "READY";
        worker.activeJobId = undefined;
      }
    }

    if (job.attempts < job.maxAttempts) {
      job.status = "QUEUED";
      job.error = `Attempt ${job.attempts} failed: ${error}`;
      this.queue.push(job);
      this.sortQueue();
      this.updateWorkerQueueDepths();
      this.activeJobs.delete(jobId);
      return job;
    }

    job.status = "FAILED";
    job.completedAt = new Date().toISOString();
    job.error = error;
    this.activeJobs.delete(jobId);
    return job;
  }

  static cancelJob(jobId: string, requestingTenantId?: string): boolean {
    // Multi-tenant check: tenantId must match if provided
    const inQueueIndex = this.queue.findIndex(j => (j.id === jobId || j.jobId === jobId) && (!requestingTenantId || j.tenantId === requestingTenantId));
    if (inQueueIndex >= 0) {
      this.queue.splice(inQueueIndex, 1);
      this.updateWorkerQueueDepths();
      return true;
    }

    const activeJob = Array.from(this.activeJobs.values()).find(j => (j.id === jobId || j.jobId === jobId) && (!requestingTenantId || j.tenantId === requestingTenantId));
    if (activeJob) {
      activeJob.status = "CANCELLED";
      if (activeJob.workerId) {
        const worker = this.workers.find(w => w.workerId === activeJob.workerId);
        if (worker) {
          worker.status = "READY";
          worker.activeJobId = undefined;
        }
      }
      this.activeJobs.delete(activeJob.id);
      return true;
    }

    return false;
  }
}
