/**
 * FactoryOS Frontier v2 — Floor Guardian Experience Memory
 * Local operational memory tracking worker histories, audit trends, and recovery effectiveness.
 */

import type { GuardianAuditReport, GuardianEscalation, GuardianDecision } from "./GuardianContracts";

export interface WorkerIncidentRecord {
  workerId: string;
  failureCount: number;
  lastFailureTime: string;
  recoveryAttempts: number;
  isQuarantined: boolean;
}

export class GuardianMemory {
  private floorId: string;
  private workerIncidents: Map<string, WorkerIncidentRecord> = new Map();
  private auditHistory: GuardianAuditReport[] = [];
  private escalationHistory: GuardianEscalation[] = [];
  private executedDecisions: GuardianDecision[] = [];

  constructor(floorId: string) {
    this.floorId = floorId;
  }

  recordWorkerFailure(workerId: string): WorkerIncidentRecord {
    const existing = this.workerIncidents.get(workerId) || {
      workerId,
      failureCount: 0,
      lastFailureTime: new Date().toISOString(),
      recoveryAttempts: 0,
      isQuarantined: false,
    };

    existing.failureCount += 1;
    existing.lastFailureTime = new Date().toISOString();
    this.workerIncidents.set(workerId, existing);
    return structuredClone(existing);
  }

  recordWorkerRecoveryAttempt(workerId: string): void {
    const existing = this.workerIncidents.get(workerId);
    if (existing) {
      existing.recoveryAttempts += 1;
    }
  }

  recordWorkerRecovered(workerId: string): void {
    this.workerIncidents.delete(workerId);
  }

  quarantineWorker(workerId: string): void {
    const existing = this.workerIncidents.get(workerId) || {
      workerId,
      failureCount: 2,
      lastFailureTime: new Date().toISOString(),
      recoveryAttempts: 2,
      isQuarantined: true,
    };
    existing.isQuarantined = true;
    this.workerIncidents.set(workerId, existing);
  }

  getWorkerIncident(workerId: string): WorkerIncidentRecord | undefined {
    const rec = this.workerIncidents.get(workerId);
    return rec ? structuredClone(rec) : undefined;
  }

  getAllWorkerIncidents(): WorkerIncidentRecord[] {
    return Array.from(this.workerIncidents.values()).map((r) => structuredClone(r));
  }

  recordAudit(report: GuardianAuditReport): void {
    this.auditHistory.push(structuredClone(report));
    if (this.auditHistory.length > 50) {
      this.auditHistory.shift();
    }
  }

  getRecentAudits(limit: number = 10): GuardianAuditReport[] {
    return structuredClone(this.auditHistory.slice(-limit));
  }

  recordEscalation(escalation: GuardianEscalation): void {
    this.escalationHistory.push(structuredClone(escalation));
  }

  getEscalations(): GuardianEscalation[] {
    return structuredClone(this.escalationHistory);
  }

  recordDecision(decision: GuardianDecision): void {
    this.executedDecisions.push(structuredClone(decision));
  }

  getExecutedDecisions(): GuardianDecision[] {
    return structuredClone(this.executedDecisions);
  }

  clear(): void {
    this.workerIncidents.clear();
    this.auditHistory = [];
    this.escalationHistory = [];
    this.executedDecisions = [];
  }
}
