/**
 * FactoryOS Frontier v2 — Specialized Slayer Detective Agents
 * Implements 6 specialized anomaly detectors for general patrol, compute, pipeline, rendering, quality, and security.
 */

import { randomUUID } from "node:crypto";
import { BaseSlayer } from "./SlayerBase";
import type { AnomalyObservation } from "../contracts/SlayerContracts";
import type { WorldState } from "../contracts/WorldStateContracts";
import type { CaseManager } from "../cases/CaseManager";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { LeaseManager } from "../leases/LeaseManager";

/**
 * 1. General Patrol Slayer: Floor availability, worker staleness, and overall health.
 */
export class GeneralPatrolSlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_general_patrol",
        name: "General Patrol Slayer",
        specialization: "GENERAL_PATROL",
        zoneId: "zone_general_patrol",
        patrolIntervalMs: 2000,
        targetFloors: ["floor01_strategy", "floor02_scripting", "floor03_asset_realization", "floor07_compliance"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    for (const [floorId, floor] of Object.entries(worldState.floors)) {
      if (floor.status === "DEGRADED" || floor.status === "ERROR" || floor.status === "OFFLINE") {
        return {
          observationId: `obs_${randomUUID().substring(0, 8)}`,
          floorId,
          target: floorId,
          category: "WORKER_STALL",
          severity: floor.status === "ERROR" ? "HIGH" : "MEDIUM",
          description: `Floor ${floor.name} degraded with status ${floor.status}. Active workers: ${floor.activeWorkers}.`,
          rawMetrics: { floorStatus: floor.status, activeWorkers: floor.activeWorkers, queueDepth: floor.queueDepth },
          observedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  }
}

/**
 * 2. Compute Slayer: CPU saturation, memory pressure, and GPU availability.
 */
export class ComputeSlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_compute",
        name: "Compute Infrastructure Slayer",
        specialization: "GPU_COMPUTE",
        zoneId: "zone_compute",
        patrolIntervalMs: 2500,
        targetFloors: ["floor02_scripting", "floor03_asset_realization"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    const res = worldState.resources;
    if (res.cpuPercent >= 90) {
      return {
        observationId: `obs_${randomUUID().substring(0, 8)}`,
        floorId: "system_kernel",
        target: "host_cpu",
        category: "RESOURCE_STARVATION",
        severity: "HIGH",
        description: `Host CPU saturation critical at ${res.cpuPercent}%.`,
        rawMetrics: { cpuPercent: res.cpuPercent, memoryMb: res.memoryUsedMb },
        observedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}

/**
 * 3. Pipeline Slayer: Queue backpressure, inter-floor handoffs, and pipeline stalls.
 */
export class PipelineSlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_pipeline",
        name: "Pipeline & Queue Slayer",
        specialization: "PIPELINE",
        zoneId: "zone_pipeline",
        patrolIntervalMs: 2500,
        targetFloors: ["floor01_strategy", "floor02_scripting", "floor03_asset_realization"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    for (const [floorId, floor] of Object.entries(worldState.floors)) {
      if (floor.queueDepth > 20) {
        return {
          observationId: `obs_${randomUUID().substring(0, 8)}`,
          floorId,
          target: `${floorId}_queue`,
          category: "PIPELINE_STALL",
          severity: "MEDIUM",
          description: `Queue congestion on ${floor.name}: ${floor.queueDepth} tasks pending.`,
          rawMetrics: { queueDepth: floor.queueDepth, activeWorkers: floor.activeWorkers },
          observedAt: new Date().toISOString(),
        };
      }
    }
    return null;
  }
}

/**
 * 4. Rendering Slayer: GPU render stalls, frame drops, and asset realization errors.
 */
export class RenderingSlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_rendering",
        name: "Rendering Subsystem Slayer",
        specialization: "RENDERING",
        zoneId: "zone_rendering",
        patrolIntervalMs: 2000,
        targetFloors: ["floor03_asset_realization"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    const f03 = worldState.floors["floor03_asset_realization"];
    if (f03 && (f03.status === "ERROR" || f03.status === "DEGRADED")) {
      return {
        observationId: `obs_${randomUUID().substring(0, 8)}`,
        floorId: "floor03_asset_realization",
        target: "render_farm_pool",
        category: "RENDER_ARTIFACT",
        severity: "HIGH",
        description: `Rendering farm degradation: ${f03.status} on Floor 03.`,
        rawMetrics: { floorStatus: f03.status, activeJobs: f03.activeJobs?.length || 0 },
        observedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}

/**
 * 5. Quality Slayer: Confidence anomalies, grounding failures, and quality drift.
 */
export class QualitySlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_quality",
        name: "Output Quality Slayer",
        specialization: "CONTENT_QUALITY",
        zoneId: "zone_quality",
        patrolIntervalMs: 3000,
        targetFloors: ["floor01_strategy", "floor07_compliance"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    if (worldState.systemConfidence < 0.65) {
      return {
        observationId: `obs_${randomUUID().substring(0, 8)}`,
        floorId: "floor07_compliance",
        target: "quality_evaluator",
        category: "RAG_GROUNDING_FAILURE",
        severity: "MEDIUM",
        description: `System confidence degraded below threshold: ${worldState.systemConfidence.toFixed(2)}.`,
        rawMetrics: { systemConfidence: worldState.systemConfidence },
        observedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}

/**
 * 6. Security Slayer: Access anomalies, safety violations, and kernel HALTED status.
 */
export class SecuritySlayer extends BaseSlayer {
  constructor(caseManager: CaseManager, eventBus: DurableEventBus, leaseManager?: LeaseManager) {
    super(
      {
        agentId: "slayer_security",
        name: "Security & Guardrails Slayer",
        specialization: "SECURITY_PERMISSION",
        zoneId: "zone_security",
        patrolIntervalMs: 2000,
        targetFloors: ["system_kernel", "floor07_compliance"],
      },
      caseManager,
      eventBus,
      leaseManager
    );
  }

  async inspect(worldState: WorldState): Promise<AnomalyObservation | null> {
    if (worldState.factoryStatus === "HALTED") {
      return {
        observationId: `obs_${randomUUID().substring(0, 8)}`,
        floorId: "system_kernel",
        target: "factory_kernel",
        category: "PERMISSION_VIOLATION",
        severity: "CRITICAL",
        description: "Emergency HALTED status detected on FactoryOS kernel.",
        rawMetrics: { factoryStatus: worldState.factoryStatus },
        observedAt: new Date().toISOString(),
      };
    }
    return null;
  }
}
