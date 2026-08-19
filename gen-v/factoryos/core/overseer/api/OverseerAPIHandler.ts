import type { OverseerControlPlane } from "../OverseerControlPlane";
import type { WorldStateEngine } from "../../worldstate/WorldStateEngine";
import type { CaseManager } from "../../cases/CaseManager";
import type { DurableEventBus } from "../../events/DurableEventBus";
import type { SlayerEngine } from "../../slayers/SlayerEngine";
import type { HealerEngine } from "../../healers/HealerEngine";
import type { MissionManager } from "../../missions/MissionManager";

export class OverseerAPIHandler {
  constructor(
    private overseer: OverseerControlPlane,
    private worldState: WorldStateEngine,
    private caseManager: CaseManager,
    private eventBus: DurableEventBus,
    private slayers: SlayerEngine,
    private healers: HealerEngine,
    private missions?: MissionManager
  ) {}

  /**
   * POST /api/overseer/command
   * Ingests natural language commands (text or transcribed voice).
   * Returns immediately with run_id, mission_id, and 202 Accepted.
   */
  async handleCommand(body: { command: string; mode?: "reflex" | "deliberate" | "deep" | "autonomous" }) {
    if (!body || !body.command) {
      return { status: 400, data: { error: "Missing required 'command' in request body." } };
    }
    const result = await this.overseer.submitCommand(body.command, body.mode || "autonomous");
    return {
      status: 202,
      data: {
        runId: result.runId,
        run_id: result.runId,
        missionId: result.missionId,
        mission_id: result.missionId,
        status: "accepted",
        command: body.command,
        mode: body.mode || "autonomous",
      },
    };
  }

  /**
   * GET /api/overseer/runs/:runId
   */
  async handleGetRun(runId: string) {
    const run = this.overseer.getRun(runId);
    if (!run) {
      return { status: 404, data: { error: `Run ${runId} not found.` } };
    }
    return { status: 200, data: run };
  }

  /**
   * GET /api/overseer/runs/:runId/events
   */
  async handleGetRunEvents(runId: string) {
    const events = await this.eventBus.replay();
    const runEvents = events.filter((e) => e.correlationId === runId || (e.payload as any)?.runId === runId);
    return { status: 200, data: { runId, events: runEvents } };
  }

  /**
   * GET /api/overseer/state
   */
  async handleGetWorldState() {
    return { status: 200, data: this.worldState.getState() };
  }

  /**
   * GET /api/overseer/cases
   */
  async handleGetCases(query?: { status?: string }) {
    if (query?.status === "active") {
      const active = await this.caseManager.getActiveCases();
      return { status: 200, data: active };
    }
    const all = await this.caseManager.getActiveCases();
    return { status: 200, data: all };
  }

  /**
   * GET /api/overseer/cases/:caseId
   */
  async handleGetCase(caseId: string) {
    const caseItem = await this.caseManager.getCase(caseId);
    if (!caseItem) {
      return { status: 404, data: { error: `Case ${caseId} not found.` } };
    }
    return { status: 200, data: caseItem };
  }

  /**
   * POST /api/overseer/cases/:caseId/actions
   */
  async handleCaseAction(caseId: string, body: { action: "escalate" | "resolve" | "retry"; notes?: string }) {
    const caseItem = await this.caseManager.getCase(caseId);
    if (!caseItem) {
      return { status: 404, data: { error: `Case ${caseId} not found.` } };
    }

    if (body.action === "escalate") {
      await this.caseManager.transitionStatus(caseId, "ESCALATED", "Operator", body.notes);
    } else if (body.action === "retry") {
      await this.caseManager.transitionStatus(caseId, "TRIAGED", "Operator", body.notes);
    }

    const updated = await this.caseManager.getCase(caseId);
    return { status: 200, data: updated };
  }

  /**
   * GET /api/overseer/agents
   */
  async handleGetAgents() {
    const slayerList = this.slayers.getAllSlayers().map((s) => ({
      agentId: s.config.agentId,
      name: s.config.name,
      role: "SLAYER",
      specialization: s.config.specialization,
      reputation: s.getReputation(),
    }));

    const healerList = this.healers.getAllHealers().map((h) => ({
      agentId: h.config.healerId,
      name: h.config.name,
      role: "HEALER",
      specialization: h.config.specialization,
      reputation: h.getReputation(),
    }));

    return { status: 200, data: { agents: [...slayerList, ...healerList] } };
  }

  /**
   * GET /api/overseer/missions
   */
  async handleGetMissions() {
    if (!this.missions) return { status: 200, data: { missions: [] } };
    const list = await this.missions.getAllMissions();
    return { status: 200, data: { missions: list } };
  }

  /**
   * POST /api/overseer/missions
   */
  async handleCreateMission(body: { goal: string; objective?: string; priority?: number }) {
    if (!body || !body.goal) {
      return { status: 400, data: { error: "Missing required 'goal' in mission body." } };
    }
    if (!this.missions) {
      return { status: 500, data: { error: "MissionManager is not available." } };
    }
    const mission = await this.missions.createMission({
      goal: body.goal,
      objective: body.objective,
      priority: body.priority,
    });
    return { status: 201, data: mission };
  }

  /**
   * GET /api/overseer/missions/:missionId
   */
  async handleGetMission(missionId: string) {
    if (!this.missions) return { status: 404, data: { error: "Mission not found." } };
    const mission = await this.missions.getMission(missionId);
    if (!mission) return { status: 404, data: { error: `Mission ${missionId} not found.` } };
    return { status: 200, data: mission };
  }

  /**
   * POST /api/overseer/missions/:missionId/pause
   */
  async handlePauseMission(missionId: string, body?: { reason?: string }) {
    if (!this.missions) return { status: 404, data: { error: "Mission not found." } };
    const updated = await this.missions.pauseMission(missionId, body?.reason);
    return { status: 200, data: updated };
  }

  /**
   * POST /api/overseer/missions/:missionId/resume
   */
  async handleResumeMission(missionId: string) {
    if (!this.missions) return { status: 404, data: { error: "Mission not found." } };
    const updated = await this.missions.resumeMission(missionId);
    return { status: 200, data: updated };
  }

  /**
   * POST /api/overseer/missions/:missionId/stop
   */
  async handleStopMission(missionId: string, body?: { reason?: string }) {
    if (!this.missions) return { status: 404, data: { error: "Mission not found." } };
    const updated = await this.missions.cancelMission(missionId, body?.reason);
    return { status: 200, data: updated };
  }

  /**
   * POST /api/overseer/plan
   */
  async handleCreatePlan(body: { goal: string; context?: Record<string, unknown> }) {
    if (!body || !body.goal) {
      return { status: 400, data: { error: "Missing required 'goal' in plan request." } };
    }
    const dag = this.overseer.getTaskPlanner().createDAG(body.goal, [
      {
        taskId: "task_plan_init",
        name: "Mission Planning Phase",
        description: "Initial strategy planning node",
        requiredAgentType: "SPECIALIST",
        targetComponent: "floor01_strategy",
        payload: { goal: body.goal },
        dependencies: [],
        status: "PENDING",
        attemptCount: 0,
        maxAttempts: 3,
      },
    ]);
    return { status: 200, data: { plan: dag } };
  }
}

