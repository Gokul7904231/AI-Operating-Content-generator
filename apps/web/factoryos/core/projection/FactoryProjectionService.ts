/**
 * FactoryOS v1 — Factory State Projection Service
 * Builds authoritative read models from WorldStateEngine, DurableEventBus, and MissionManager
 * for UI, Dashboard, and SSE streaming without exposing internal bus mechanics or using mock arrays.
 */

import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { MissionManager } from "../missions/MissionManager";
import type { CaseManager } from "../cases/CaseManager";

export interface FactoryStateProjection {
  readonly timestamp: string;
  readonly factoryStatus: string;
  readonly globalGoal?: string;
  readonly activeMissionsCount: number;
  readonly activeCasesCount: number;
  readonly healthyWorkersCount: number;
  readonly floors: Record<string, {
    readonly status: string;
    readonly description?: string;
    readonly lastExecutionTimeMs?: number;
    readonly lastComplianceScore?: number;
  }>;
  readonly recentEvents: Array<{
    readonly eventId: string;
    readonly topic: string;
    readonly timestamp: string;
    readonly correlationId: string;
    readonly source: string;
    readonly summary: string;
  }>;
}

export class FactoryProjectionService {
  constructor(
    private worldState: WorldStateEngine,
    private eventBus: DurableEventBus,
    private missionManager?: MissionManager,
    private caseManager?: CaseManager
  ) {}

  public async getProjection(): Promise<FactoryStateProjection> {
    const world = this.worldState.getState();
    const activeMissions = this.missionManager ? await this.missionManager.getActiveMissions() : [];
    const activeCases = this.caseManager ? await this.caseManager.getActiveCases() : [];
    const events = this.eventBus.getEvents().slice(-30).reverse();

    const healthyWorkers = Object.values(world.workers || {}).filter(
      (w) => w.status === "HEALTHY"
    ).length;

    const floors: Record<string, any> = {};
    for (const [fId, fState] of Object.entries(world.floors || {})) {
      floors[fId] = {
        status: fState.status,
        description: (fState as any).description,
        lastExecutionTimeMs: (fState as any).lastExecutionTimeMs,
        lastComplianceScore: (fState as any).lastComplianceScore,
      };
    }

    const recentEvents = events.map((e) => ({
      eventId: e.eventId,
      topic: e.topic,
      timestamp: e.timestamp,
      correlationId: e.correlationId,
      source: e.source,
      summary: `${e.topic} from ${e.source}`,
    }));

    return {
      timestamp: new Date().toISOString(),
      factoryStatus: world.factoryStatus || "OPERATIONAL",
      globalGoal: world.globalGoal,
      activeMissionsCount: activeMissions.length,
      activeCasesCount: activeCases.length,
      healthyWorkersCount: healthyWorkers,
      floors,
      recentEvents,
    };
  }
}
