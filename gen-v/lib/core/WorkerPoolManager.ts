export type PoolType = "image" | "voice" | "render" | "upload" | "publish";

interface Task<T = any> {
  id: string;
  type: PoolType;
  fn: (signal?: AbortSignal) => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: any) => void;
  abortController?: AbortController;
  queuedAt: number;
  priority: number;
}

interface PoolStats {
  activeCount: number;
  queuedCount: number;
  completedCount: number;
  failedCount: number;
  concurrencyLimit: number;
  avgWaitTimeMs: number;
}

class SubPool {
  type: PoolType;
  concurrencyLimit: number;
  queueLimit: number;
  activeTasks = new Set<Task>();
  queue: Task[] = [];
  completedCount = 0;
  failedCount = 0;
  totalWaitTimeMs = 0;
  totalCompletedCount = 0;

  constructor(type: PoolType, concurrencyLimit: number, queueLimit = 50) {
    this.type = type;
    this.concurrencyLimit = concurrencyLimit;
    this.queueLimit = queueLimit;
  }

  async enqueue<T>(
    id: string,
    fn: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    priority = 0
  ): Promise<T> {
    // Backpressure Check
    if (this.queue.length >= this.queueLimit) {
      throw new Error(`[WorkerPoolManager] Backpressure trigger: queue limit (${this.queueLimit}) reached for pool: ${this.type}`);
    }

    return new Promise<T>((resolve, reject) => {
      const task: Task = {
        id,
        type: this.type,
        fn,
        resolve: resolve as any,
        reject,
        queuedAt: Date.now(),
        priority,
      };

      if (signal) {
        if (signal.aborted) {
          return reject(new DOMException("Task aborted before execution", "AbortError"));
        }
        signal.addEventListener("abort", () => {
          this.cancel(task.id);
        });
      }

      this.queue.push(task);
      // Sort queue by priority descending, then queuedTime ascending
      this.queue.sort((a, b) => b.priority - a.priority || a.queuedAt - b.queuedAt);

      this.process();
    });
  }

  private process() {
    if (this.activeTasks.size >= this.concurrencyLimit) {
      return;
    }

    const task = this.queue.shift();
    if (!task) return;

    this.activeTasks.add(task);
    const waitTime = Date.now() - task.queuedAt;
    this.totalWaitTimeMs += waitTime;

    const abortController = new AbortController();
    task.abortController = abortController;

    console.log(`[WorkerPoolManager] Running task ${task.id} in pool ${this.type} (waited ${waitTime}ms)`);

    task.fn(abortController.signal)
      .then((val) => {
        this.activeTasks.delete(task);
        this.completedCount++;
        this.totalCompletedCount++;
        task.resolve(val);
        this.process();
      })
      .catch((err) => {
        this.activeTasks.delete(task);
        this.failedCount++;
        task.reject(err);
        this.process();
      });
  }

  cancel(id: string) {
    // Check active
    for (const task of this.activeTasks) {
      if (task.id === id) {
        if (task.abortController) {
          task.abortController.abort();
        }
        this.activeTasks.delete(task);
        task.reject(new DOMException("Task cancelled", "AbortError"));
        this.process();
        return true;
      }
    }

    // Check queue
    const idx = this.queue.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const [task] = this.queue.splice(idx, 1);
      task.reject(new DOMException("Task cancelled before starting", "AbortError"));
      return true;
    }

    return false;
  }

  getStats(): PoolStats {
    const avgWaitTimeMs = this.totalCompletedCount > 0 ? this.totalWaitTimeMs / this.totalCompletedCount : 0;
    return {
      activeCount: this.activeTasks.size,
      queuedCount: this.queue.length,
      completedCount: this.completedCount,
      failedCount: this.failedCount,
      concurrencyLimit: this.concurrencyLimit,
      avgWaitTimeMs,
    };
  }

  async shutdown() {
    console.log(`[WorkerPoolManager] Shutting down pool: ${this.type}`);
    // Abort all active
    for (const task of this.activeTasks) {
      if (task.abortController) task.abortController.abort();
    }
    this.activeTasks.clear();

    // Reject all in queue
    for (const task of this.queue) {
      task.reject(new DOMException("Worker pool shutting down", "AbortError"));
    }
    this.queue = [];
  }
}

class WorkerPoolManagerClass {
  private pools = new Map<PoolType, SubPool>();

  constructor() {
    this.pools.set("image", new SubPool("image", 8));
    this.pools.set("voice", new SubPool("voice", 4));
    this.pools.set("render", new SubPool("render", 2));
    this.pools.set("upload", new SubPool("upload", 6));
    this.pools.set("publish", new SubPool("publish", 4));
  }

  getPool(type: PoolType): SubPool {
    const pool = this.pools.get(type);
    if (!pool) throw new Error(`Unknown pool type: ${type}`);
    return pool;
  }

  /**
   * Run a task in the specified pool.
   */
  async run<T>(
    type: PoolType,
    id: string,
    fn: (signal?: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
    priority = 0
  ): Promise<T> {
    const pool = this.getPool(type);
    return pool.enqueue(id, fn, signal, priority);
  }

  /**
   * Cancel a task across all pools.
   */
  cancel(id: string): boolean {
    for (const pool of this.pools.values()) {
      if (pool.cancel(id)) return true;
    }
    return false;
  }

  /**
   * Get metrics across all pools.
   */
  getStats(): Record<PoolType, PoolStats> {
    const report: any = {};
    for (const [key, pool] of this.pools.entries()) {
      report[key] = pool.getStats();
    }
    return report;
  }

  /**
   * Shutdown all worker pools gracefully.
   */
  async shutdown() {
    for (const pool of this.pools.values()) {
      await pool.shutdown();
    }
  }
}

export const WorkerPoolManager = new WorkerPoolManagerClass();
