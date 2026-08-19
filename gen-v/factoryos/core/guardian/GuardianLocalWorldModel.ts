/**
 * FactoryOS Frontier v2 — Guardian Local World Model
 * Compact, floor-scoped operational view and state projection.
 */

import type {
  FloorCondition,
  GuardianLocalCase,
  GuardianLocalTask,
  GuardianWorkerMetrics,
  FloorExperienceRecord,
} from "../contracts/FloorGuardianContracts";

export class GuardianLocalWorldModel {
  public readonly floorId: string;
  private workers: Map<string, GuardianWorkerMetrics> = new Map();
  private tasks: Map<string, GuardianLocalTask> = new Map();
  private cases: Map<string, GuardianLocalCase> = new Map();
  private experienceMemory: FloorExperienceRecord[] = [];
  private recentAnomalies: string[] = [];
  private currentHealth: string = "HEALTHY";

  constructor(floorId: string) {
    this.floorId = floorId;
  }

  // Worker Tracking
  registerWorker(workerId: string): void {
    if (!this.workers.has(workerId)) {
      this.workers.set(workerId, {
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        utilizationPercent: 0,
        lastHeartbeat: new Date().toISOString(),
        isStale: false,
        isQuarantined: false,
      });
    }
  }

  updateWorkerHeartbeat(workerId: string, isHealthy: boolean = true, utilization: number = 0): void {
    const existing = this.workers.get(workerId);
    if (existing) {
      this.workers.set(workerId, {
        ...existing,
        lastHeartbeat: new Date().toISOString(),
        isStale: !isHealthy,
        utilizationPercent: utilization,
      });
    } else {
      this.workers.set(workerId, {
        tasksAssigned: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        utilizationPercent: utilization,
        lastHeartbeat: new Date().toISOString(),
        isStale: !isHealthy,
        isQuarantined: false,
      });
    }
  }

  quarantineWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.set(workerId, {
        ...worker,
        isQuarantined: true,
        utilizationPercent: 0,
      });
    }
  }

  restoreWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (worker) {
      this.workers.set(workerId, {
        ...worker,
        isQuarantined: false,
        isStale: false,
      });
    }
  }

  getWorkers(): Map<string, GuardianWorkerMetrics> {
    return new Map(this.workers);
  }

  getUnhealthyWorkers(): string[] {
    const unhealthy: string[] = [];
    for (const [id, w] of this.workers.entries()) {
      if (w.isStale || w.isQuarantined || w.tasksFailed > 2) {
        unhealthy.push(id);
      }
    }
    return unhealthy;
  }

  // Task & Queue Tracking
  addTask(task: GuardianLocalTask): void {
    this.tasks.set(task.taskId, structuredClone(task));
    if (task.assignedWorkerId) {
      const w = this.workers.get(task.assignedWorkerId);
      if (w) {
        if (task.status === "FAILED") {
          this.workers.set(task.assignedWorkerId, { ...w, tasksFailed: w.tasksFailed + 1 });
        } else if (task.status === "COMPLETED") {
          this.workers.set(task.assignedWorkerId, { ...w, tasksCompleted: w.tasksCompleted + 1 });
        }
      }
    }
  }

  updateTaskStatus(taskId: string, status: GuardianLocalTask["status"]): void {
    const task = this.tasks.get(taskId);
    if (task) {
      const updated = { ...task, status };
      if (status === "COMPLETED" && task.assignedWorkerId) {
        const w = this.workers.get(task.assignedWorkerId);
        if (w) this.workers.set(task.assignedWorkerId, { ...w, tasksCompleted: w.tasksCompleted + 1 });
      } else if (status === "FAILED" && task.assignedWorkerId) {
        const w = this.workers.get(task.assignedWorkerId);
        if (w) this.workers.set(task.assignedWorkerId, { ...w, tasksFailed: w.tasksFailed + 1 });
      }
      this.tasks.set(taskId, updated);
    }
  }

  getPendingTasks(): GuardianLocalTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === "PENDING");
  }

  getBlockedTasks(): GuardianLocalTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.status === "BLOCKED");
  }

  getAllTasks(): GuardianLocalTask[] {
    return Array.from(this.tasks.values());
  }

  // Case & Slayer Tracking
  addCase(caseItem: GuardianLocalCase): void {
    this.cases.set(caseItem.caseId, structuredClone(caseItem));
    if (!this.recentAnomalies.includes(caseItem.category)) {
      this.recentAnomalies.push(caseItem.category);
      if (this.recentAnomalies.length > 20) this.recentAnomalies.shift();
    }
  }

  updateCaseStatus(caseId: string, status: GuardianLocalCase["status"]): void {
    const existing = this.cases.get(caseId);
    if (existing) {
      this.cases.set(caseId, { ...existing, status });
    }
  }

  getActiveCases(): GuardianLocalCase[] {
    return Array.from(this.cases.values()).filter(
      (c) => c.status === "DETECTED" || c.status === "TRIAGED" || c.status === "RESOLVING"
    );
  }

  getResolvedCasesCount(): number {
    return Array.from(this.cases.values()).filter((c) => c.status === "RESOLVED").length;
  }

  // Experience Memory
  recordExperience(record: FloorExperienceRecord): void {
    this.experienceMemory.push(structuredClone(record));
    if (this.experienceMemory.length > 100) this.experienceMemory.shift();
  }

  getExperienceMemory(): FloorExperienceRecord[] {
    return structuredClone(this.experienceMemory);
  }

  // Operational Condition Evaluation
  getCondition(): FloorCondition {
    const unhealthy = this.getUnhealthyWorkers().length;
    const activeCases = this.getActiveCases();
    const criticalCases = activeCases.filter((c) => c.severity === "CRITICAL");
    const highCases = activeCases.filter((c) => c.severity === "HIGH");

    if (criticalCases.length > 0) return "CRITICAL";
    if (highCases.length > 0 || unhealthy >= 2) return "DEGRADED";
    if (activeCases.length > 0 || unhealthy > 0 || this.getBlockedTasks().length > 0) return "ATTENTION";
    return "HEALTHY";
  }

  getHealthScore(): number {
    let score = 1.0;
    const totalWorkers = this.workers.size;
    const unhealthyWorkers = this.getUnhealthyWorkers().length;
    if (totalWorkers > 0) {
      score -= (unhealthyWorkers / totalWorkers) * 0.4;
    }

    const activeCases = this.getActiveCases();
    for (const c of activeCases) {
      if (c.severity === "CRITICAL") score -= 0.4;
      else if (c.severity === "HIGH") score -= 0.2;
      else score -= 0.05;
    }

    return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  }

  getHealth(): string {
    return this.currentHealth || this.getCondition();
  }

  updateHealth(health: string): void {
    this.currentHealth = health;
  }
}
