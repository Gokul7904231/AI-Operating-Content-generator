export type JobStatus =
  | "queued"
  | "claimed"
  | "running"
  | "retrying"
  | "paused"
  | "completed"
  | "failed"
  | "cancelled"
  | "expired";

export interface QueueJob {
  id: string; // Internal queue ID
  jobId: string; // The user-facing jobId
  payload: any; // Raw JSON payload
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  priority: number; // 0 = standard, higher = higher priority
  requestHash: string; // For request idempotency checks
  workerId: string | null;
  startedAt: number | null; // epoch ms
  heartbeatAt: number | null; // epoch ms
  lastError: string | null;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

export interface RenderQueue {
  /**
   * Pushes a new rendering job onto the queue.
   */
  enqueue(params: {
    jobId: string;
    payload: any;
    priority?: number;
    maxAttempts?: number;
  }): Promise<QueueJob>;

  /**
   * Claims the next high-priority queued/retrying job for execution.
   */
  claim(workerId: string): Promise<QueueJob | null>;

  /**
   * Sends a heartbeat update to prevent worker timeout eviction.
   */
  heartbeat(id: string, workerId: string): Promise<void>;

  /**
   * Updates intermediate progress percentages and Saga state serializations.
   */
  updateProgress(id: string, stepId: string, progressPercentage: number, stateJson: any): Promise<void>;

  /**
   * Finalizes the job as completed.
   */
  complete(id: string, outputJson: any): Promise<void>;

  /**
   * Flags the job attempt as failed, scheduling retries with backoff or failing permanently.
   */
  fail(id: string, error: string, nextRetryDelaySec?: number): Promise<void>;

  /**
   * Cancels a pending or running job.
   */
  cancel(jobId: string): Promise<boolean>;

  /**
   * Retrieves a job by user-facing jobId.
   */
  getJob(jobId: string): Promise<QueueJob | null>;

  /**
   * Finds an active (queued, claimed, running, retrying) job with a matching request hash.
   */
  findActiveByHash(requestHash: string): Promise<QueueJob | null>;
}
