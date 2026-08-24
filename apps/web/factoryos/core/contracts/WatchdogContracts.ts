/**
 * FactoryOS Frontier v2 — Phase 7: Watchdog Supervision 2.0 Contracts
 * Defines whole-agent heartbeat monitoring, health states, auto-recovery policies,
 * quarantine schemas, and lease reclamation contracts.
 */

export type SubsystemType =
  | "GUARDIAN"
  | "SLAYER"
  | "HEALER"
  | "WORKER"
  | "OVERSEER"
  | "VALIDATOR"
  | "WATCHDOG"
  | "EVENT_CONSUMER";

export type AgentHealthState =
  | "HEALTHY"
  | "SUSPECT"
  | "DEGRADED"
  | "FAILED"
  | "RECOVERING"
  | "QUARANTINED";

export interface AgentHeartbeatRecord {
  readonly componentId: string;
  readonly componentType: SubsystemType;
  lastHeartbeat: string;
  expectedIntervalMs: number;
  status: AgentHealthState;
  consecutiveMisses: number;
  lastRecoveryAt?: string;
  recoveryAttempts: number;
  metadata?: Record<string, unknown>;
}

export interface WatchdogSupervisionPolicy {
  readonly suspectThresholdMisses: number;     // e.g. 1 miss -> SUSPECT
  readonly failureThresholdMisses: number;     // e.g. 3 misses -> FAILED
  readonly maxRecoveryAttempts: number;        // e.g. 3 attempts before QUARANTINE
  readonly recoveryCooldownMs: number;         // e.g. 5000ms before re-attempting
  readonly staleThresholdMs: number;           // e.g. 15000ms
  readonly heartbeatIntervalMs: number;        // e.g. 2000ms
}

export interface AutoRecoveryResult {
  readonly componentId: string;
  readonly componentType: SubsystemType;
  readonly success: boolean;
  readonly attemptNumber: number;
  readonly quarantined: boolean;
  readonly reason: string;
  readonly timestamp: string;
}

export interface WatchdogHealthSweepReport {
  readonly healthyComponents: string[];
  readonly suspectComponents: string[];
  readonly degradedComponents: string[];
  readonly failedComponents: string[];
  readonly recoveringComponents: string[];
  readonly quarantinedComponents: string[];
  readonly reclaimedLeases: string[];
  readonly monitoredAgents: {
    readonly overseerOnline: boolean;
    readonly activeGuardiansCount: number;
    readonly activeSlayersCount: number;
    readonly activeHealersCount: number;
    readonly activeWorkersCount: number;
  };
  readonly missionBreaches?: { missionId: string; breachReason: string }[];
  readonly sweepDurationMs: number;
  readonly timestamp: string;
}
