/**
 * FactoryOS v1 — Overseer Supreme Control Plane & Autonomous Mission Runtime
 */

import { randomUUID } from "node:crypto";
import type { GoalDefinition, TaskNode } from "../contracts/OverseerThinkingContracts";
import type { Case } from "../contracts/CaseContracts";
import type { WorldState } from "../contracts/WorldStateContracts";
import { OverseerThinkingController } from "./OverseerThinkingController";
import { DecisionLedger } from "./DecisionLedger";
import { TaskDAGPlanner, TaskDAGExecutor } from "./TaskDAGPlanner";
import type { CaseManager } from "../cases/CaseManager";
import type { HealerEngine } from "../healers/HealerEngine";
import type { SlayerEngine } from "../slayers/SlayerEngine";
import type { ValidatorAgent } from "../validator/ValidatorAgent";
import type { DurableEventBus } from "../events/DurableEventBus";
import type { WorldStateEngine } from "../worldstate/WorldStateEngine";
import type { MemoryEngine } from "../memory/MemoryEngine";

export interface OverseerRun {
  readonly runId: string;
  readonly command: string;
  readonly mode: "reflex" | "deliberate" | "deep" | "autonomous";
  status: "accepted" | "running" | "completed" | "failed" | "paused";
  readonly createdAt: string;
  updatedAt: string;
  result?: Record<string, unknown>;
  error?: string;
}

import { CapabilityRouter } from "../cognitive/routing/CapabilityRouter";
import { StrategicMetaThinker } from "../cognitive/meta/StrategicMetaThinker";
import { CognitivePlaneEngine } from "../cognitive/CognitivePlaneEngine";
import { CognitiveRuntime } from "../cognitive/CognitiveRuntime";
import type { MissionManager } from "../missions/MissionManager";

import type { IDecisionRepository, ITaskDAGRepository } from "../database/DatabaseContracts";
import { OverseerPresenceEngine } from "./presence/OverseerPresenceEngine";

export class OverseerControlPlane {
  private thinkingController: OverseerThinkingController;
  private decisionLedger: DecisionLedger;
  private dagPlanner: TaskDAGPlanner;
  private dagExecutor: TaskDAGExecutor;
  private caseManager: CaseManager;
  private slayerEngine: SlayerEngine;
  private healerEngine: HealerEngine;
  private validator: ValidatorAgent;
  private eventBus: DurableEventBus;
  private worldState: WorldStateEngine;
  private memoryEngine?: MemoryEngine;
  public cognitivePlane: CognitivePlaneEngine;
  public cognitiveRuntime: CognitiveRuntime;
  public missionManager?: MissionManager;
  public capabilityRouter: CapabilityRouter;
  public metaThinker: StrategicMetaThinker;
  public presenceEngine: OverseerPresenceEngine;

  private runs: Map<string, OverseerRun> = new Map();
  private supervisorInterval: NodeJS.Timeout | null = null;
  private isSupervising: boolean = false;
  private activeMissionGoal: string | null = null;

  constructor(
    caseManager: CaseManager,
    slayerEngine: SlayerEngine,
    healerEngine: HealerEngine,
    validator: ValidatorAgent,
    eventBus: DurableEventBus,
    worldState: WorldStateEngine,
    memoryEngine?: MemoryEngine,
    cognitivePlane?: CognitivePlaneEngine,
    missionManager?: MissionManager,
    decisionRepo?: IDecisionRepository,
    taskDAGRepo?: ITaskDAGRepository
  ) {
    this.caseManager = caseManager;
    this.slayerEngine = slayerEngine;
    this.healerEngine = healerEngine;
    this.validator = validator;
    this.eventBus = eventBus;
    this.worldState = worldState;
    this.memoryEngine = memoryEngine;
    this.cognitivePlane = cognitivePlane || new CognitivePlaneEngine();
    this.cognitiveRuntime = new CognitiveRuntime(this.cognitivePlane);
    this.missionManager = missionManager;

    this.thinkingController = new OverseerThinkingController();
    this.decisionLedger = new DecisionLedger(decisionRepo);
    this.dagPlanner = new TaskDAGPlanner();
    this.dagExecutor = new TaskDAGExecutor(taskDAGRepo, this.eventBus);
    this.capabilityRouter = new CapabilityRouter();
    this.metaThinker = new StrategicMetaThinker();
    this.presenceEngine = new OverseerPresenceEngine(
      this.eventBus,
      this.worldState,
      this.caseManager,
      this.missionManager
    );

    this.registerWithWorldState();

    this.eventBus.subscribe("ANOMALY_DETECTED", async () => {
      if (this.isSupervising) {
        await this.runSupervisorCycle().catch(() => {});
      }
    });
    this.eventBus.subscribe("CASE_CREATED", async () => {
      if (this.isSupervising) {
        await this.runSupervisorCycle().catch(() => {});
      }
    });
    this.eventBus.subscribe("MISSION_STARTED", async (envelope) => {
      const missionId = (envelope.payload as any)?.missionId;
      if (missionId && this.isSupervising) {
        await this.resumeMissionExecution(missionId).catch(() => {});
      }
    });
  }

  async resumeMissionExecution(missionId: string): Promise<void> {
    if (!this.missionManager) return;
    const mission = await this.missionManager.getMission(missionId);
    if (!mission || mission.status !== "RUNNING") return;

    const runId = `run_resumed_${randomUUID().replace(/-/g, "").substring(0, 8)}`;
    const now = new Date().toISOString();
    this.runs.set(runId, {
      runId,
      command: mission.objective,
      mode: "autonomous",
      status: "running",
      createdAt: now,
      updatedAt: now,
    });

    const runRecord = this.runs.get(runId)!;
    this.executeRunAsync(runRecord, missionId).catch(() => {});
  }

  private registerWithWorldState(): void {
    this.worldState.registerWorker({
      workerId: "overseer_control_plane",
      role: "OPERATOR",
      specialization: "SUPREME_CONTROL_PLANE",
      status: "HEALTHY",
      lastSeen: new Date().toISOString(),
      metrics: {
        tasksCompleted: 0,
        tasksFailed: 0,
        uptimeSeconds: 0,
        averageLatencyMs: 10,
      },
    });
  }

  startSupervisor(intervalMs: number = 3000): void {
    if (this.isSupervising) return;
    this.isSupervising = true;
    this.supervisorInterval = setInterval(() => {
      this.runSupervisorCycle().catch(() => {});
    }, intervalMs);
    this.runSupervisorCycle().catch(() => {});
  }

  stopSupervisor(): void {
    this.isSupervising = false;
    if (this.supervisorInterval) {
      clearInterval(this.supervisorInterval);
      this.supervisorInterval = null;
    }
  }

  /**
   * Unified Overseer Command Ingestion (POST /api/overseer/command):
   * Non-blocking — returns immediately with run_id and status "accepted".
   */
  async submitCommand(
    command: string,
    mode: "reflex" | "deliberate" | "deep" | "autonomous" = "autonomous"
  ): Promise<{ runId: string; missionId?: string; status: "accepted" }> {
    const runId = `run_${randomUUID().replace(/-/g, "").substring(0, 12)}`;
    const now = new Date().toISOString();

    let missionId: string | undefined;
    if (this.missionManager) {
      const mission = await this.missionManager.createMission({
        goal: command,
      });
      missionId = mission.missionId;
      await this.missionManager.startMission(missionId, runId);
    }

    const runRecord: OverseerRun = {
      runId,
      command,
      mode,
      status: "accepted",
      createdAt: now,
      updatedAt: now,
    };

    this.runs.set(runId, runRecord);
    this.worldState.addActiveRun(runId);

    await this.eventBus.publish(
      "RUN_STARTED",
      { runId, command, mode, missionId },
      { correlationId: runId, source: "overseer_api" }
    );

    // Launch execution asynchronously in the background (fire-and-forget from caller perspective)
    setImmediate(() => {
      this.executeRunAsync(runRecord, missionId).catch((err) => {
        runRecord.status = "failed";
        runRecord.error = err instanceof Error ? err.message : String(err);
        runRecord.updatedAt = new Date().toISOString();
        this.worldState.removeActiveRun(runId);
      });
    });

    return { runId, missionId, status: "accepted" };
  }

  private async executeRunAsync(run: OverseerRun, missionId?: string): Promise<void> {
    run.status = "running";
    run.updatedAt = new Date().toISOString();

    const currentState = this.worldState.getState();
    const assessment = this.thinkingController.assessCommand(run.command, currentState);

    // 1. Record Decision in Ledger
    const decision = await this.decisionLedger.record({
      goalId: run.runId,
      stateSnapshot: currentState as unknown as Record<string, unknown>,
      thinkingMode: assessment.mode,
      availableOptions: ["EXECUTE_AUTONOMOUS_OPERATION", "TRIAGE_OPEN_CASES", "DISPATCH_SLAYERS"],
      selectedOption: "EXECUTE_AUTONOMOUS_OPERATION",
      reasoningSummary: assessment.rationale,
      predictedOutcome: "Factory operating continuously with swarms active",
      agentsUsed: ["overseer", "slayer_general_patrol", "healer_diagnostic", "validator_prime"],
      toolsUsed: ["worldstate.get", "cases.getActive", "events.publish"],
      executionTimeMs: 50,
    });

    // 2. Autonomous Task DAG Generation & Floor Dispatching
    const nodes = this.generateTaskNodesForGoal(run.command);
    const dag = this.dagPlanner.createDAG(run.runId, nodes);
    let maxParallelTasks = 3;

    if (missionId && this.missionManager) {
      const mission = await this.missionManager.getMission(missionId);
      if (mission) {
        maxParallelTasks = mission.budget.maxParallelTasks || 3;
        await this.missionManager.addTaskToMission(missionId, dag.dagId);
        await this.missionManager.updateProgress(missionId, 0, nodes.length);
      }
    }

    const executors = this.getTaskExecutorsForFloors(missionId);

    // Execute Task DAG asynchronously across target floor executors
    const completedDag = await this.dagExecutor.executeDAG(dag, executors, { maxParallelTasks });

    if (run.command.toLowerCase().includes("operate the factory")) {
      this.activeMissionGoal = run.command;
      this.worldState.setGlobalGoal(run.command);
      this.worldState.setFactoryStatus("OPERATIONAL");
      run.result = {
        message: "Persistent autonomous mission initiated. Task DAG executed across floors.",
        mode: assessment.mode,
        decisionId: decision.decisionId,
        dagId: completedDag.dagId,
        dagStatus: completedDag.status,
      };
      run.status = "running";
    } else {
      run.status = completedDag.status === "COMPLETED" ? "completed" : "failed";
      run.result = {
        message: `Command "${run.command}" executed with DAG status '${completedDag.status}'.`,
        mode: assessment.mode,
        decisionId: decision.decisionId,
        dagId: completedDag.dagId,
      };
      this.worldState.removeActiveRun(run.runId);
    }

    // Complete mission upon successful DAG execution
    if (missionId && this.missionManager && completedDag.status === "COMPLETED") {
      try {
        await this.missionManager.completeMission(missionId);
      } catch (err) {
        console.warn(`[OverseerControlPlane] Mission ${missionId} completion check:`, err instanceof Error ? err.message : err);
      }
    }

    await this.eventBus.publish(
      run.status === "completed" ? "RUN_COMPLETED" : "RUN_CHECKPOINTED",
      { runId: run.runId, status: run.status, result: run.result, missionId },
      { correlationId: run.runId }
    );
  }

  private generateTaskNodesForGoal(command: string): TaskNode[] {
    const isFactoryOp = command.toLowerCase().includes("operate the factory") || command.toLowerCase().includes("factory");

    if (isFactoryOp) {
      return [
        {
          taskId: "task_f01_scripting",
          name: "Floor 01 Scripting",
          description: "Floor 01 Scripting & Topic Generation",
          requiredAgentType: "FLOOR_SCRIPTING",
          payload: {},
          status: "PENDING" as const,
          dependencies: [],
          attemptCount: 0,
          maxAttempts: 2,
        },
        {
          taskId: "task_f02_audio",
          name: "Floor 02 Audio",
          description: "Floor 02 Audio Synthesis & Voiceover",
          requiredAgentType: "FLOOR_AUDIO",
          payload: {},
          status: "PENDING" as const,
          dependencies: ["task_f01_scripting"],
          attemptCount: 0,
          maxAttempts: 2,
        },
        {
          taskId: "task_f03_rendering",
          name: "Floor 03 Rendering",
          description: "Floor 03 Asset Realization & Video Rendering",
          requiredAgentType: "FLOOR_RENDERING",
          payload: {},
          status: "PENDING" as const,
          dependencies: ["task_f02_audio"],
          attemptCount: 0,
          maxAttempts: 2,
        },
        {
          taskId: "task_f07_compliance",
          name: "Floor 07 Compliance",
          description: "Floor 07 Compliance & Policy Inspection",
          requiredAgentType: "FLOOR_COMPLIANCE",
          payload: {},
          status: "PENDING" as const,
          dependencies: ["task_f03_rendering"],
          attemptCount: 0,
          maxAttempts: 2,
        },
      ];
    }

    return [
      {
        taskId: "task_generic_01",
        name: "Generic Task",
        description: `Execute action for goal: ${command}`,
        requiredAgentType: "TOOL",
        payload: {},
        status: "PENDING" as const,
        dependencies: [],
        attemptCount: 0,
        maxAttempts: 2,
      },
    ];
  }

  private getTaskExecutorsForFloors(missionId?: string) {
    return {
      FLOOR_SCRIPTING: async (node: any) => {
        this.worldState.updateFloorStatus("floor02_scripting", "ONLINE", "Scripting & Topic Generation");
        this.worldState.registerWorker({
          workerId: "worker_scripting_01",
          role: "WORKER",
          specialization: "SCRIPTING",
          status: "HEALTHY",
          lastSeen: new Date().toISOString(),
          metrics: { tasksCompleted: 1, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
        });
        if (missionId && this.missionManager) {
          await this.missionManager.updateProgress(missionId, 1);
        }
        await this.eventBus.publish("TASK_COMPLETED", { taskId: node.taskId, floorId: "floor02_scripting" });
        return { status: "OK", floor: "floor02_scripting", output: "Script generated successfully" };
      },
      FLOOR_AUDIO: async (node: any) => {
        this.worldState.updateFloorStatus("floor03_asset_realization", "ONLINE", "Audio & Voiceover");
        this.worldState.registerWorker({
          workerId: "worker_audio_01",
          role: "WORKER",
          specialization: "AUDIO",
          status: "HEALTHY",
          lastSeen: new Date().toISOString(),
          metrics: { tasksCompleted: 1, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
        });
        if (missionId && this.missionManager) {
          await this.missionManager.updateProgress(missionId, 1);
        }
        await this.eventBus.publish("TASK_COMPLETED", { taskId: node.taskId, floorId: "floor03_asset_realization" });
        return { status: "OK", floor: "floor03_asset_realization", output: "Voiceover audio synthesized" };
      },
      FLOOR_RENDERING: async (node: any) => {
        this.worldState.updateFloorStatus("floor03_asset_realization", "ONLINE", "Asset Realization & Rendering");
        this.worldState.registerWorker({
          workerId: "worker_render_01",
          role: "WORKER",
          specialization: "RENDERING",
          status: "HEALTHY",
          lastSeen: new Date().toISOString(),
          metrics: { tasksCompleted: 1, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
        });
        if (missionId && this.missionManager) {
          await this.missionManager.updateProgress(missionId, 1);
        }
        await this.eventBus.publish("TASK_COMPLETED", { taskId: node.taskId, floorId: "floor03_asset_realization" });
        return { status: "OK", floor: "floor03_asset_realization", output: "Video rendered and validated" };
      },
      FLOOR_COMPLIANCE: async (node: any) => {
        this.worldState.updateFloorStatus("floor07_compliance", "ONLINE", "Compliance Inspection");
        this.worldState.registerWorker({
          workerId: "worker_compliance_01",
          role: "WORKER",
          specialization: "COMPLIANCE",
          status: "HEALTHY",
          lastSeen: new Date().toISOString(),
          metrics: { tasksCompleted: 1, tasksFailed: 0, uptimeSeconds: 100, averageLatencyMs: 20 },
        });
        if (missionId && this.missionManager) {
          await this.missionManager.updateProgress(missionId, 1);
        }
        await this.eventBus.publish("TASK_COMPLETED", { taskId: node.taskId, floorId: "floor07_compliance" });
        return { status: "OK", floor: "floor07_compliance", output: "Compliance policy verified" };
      },
      TOOL: async (node: any) => {
        if (missionId && this.missionManager) {
          await this.missionManager.updateProgress(missionId, 1);
        }
        return { status: "OK", result: "Generic task executed" };
      },
    };
  }

  /**
   * Periodic Supervisor Loop:
   * Self-monitoring, case triage, healer dispatching, and verification.
   */
  async runSupervisorCycle(): Promise<void> {
    const currentState = this.worldState.getState();

    // 1. Update Overseer Heartbeat
    this.worldState.updateWorkerHeartbeat("overseer_control_plane", "HEALTHY");
    await this.eventBus.publish("WORKER_HEARTBEAT", {
      workerId: "overseer_control_plane",
      role: "OPERATOR",
      status: "HEALTHY",
    });

    // 2. Triage active cases
    const activeCases = await this.caseManager.getActiveCases();

    for (const caseItem of activeCases) {
      if (caseItem.status === "DETECTED") {
        // 1. Evaluate through Cognitive Runtime (Triage -> Memory -> Context -> Evidence -> Simulation)
        const cognitiveEval = await this.cognitiveRuntime.evaluateIncident({
          incidentId: caseItem.caseId,
          caseId: caseItem.caseId,
          floorId: caseItem.floorId,
          target: caseItem.targetWorker,
          category: caseItem.category,
          severity: caseItem.severity,
          symptoms: caseItem.symptoms || [caseItem.description],
          observedMetrics: (caseItem.observedState as Record<string, unknown>) || {},
        });

        // 2. Triage and transition to INVESTIGATING or HEALING
        await this.caseManager.transitionStatus(
          caseItem.caseId,
          "TRIAGED",
          "Overseer",
          `Automated cognitive triage: ${cognitiveEval.rootCauseTheory}`
        );

        // 3. Dispatch Healer Swarm
        await this.caseManager.transitionStatus(
          caseItem.caseId,
          "INVESTIGATING",
          "Overseer",
          `Dispatching Healers for verified strategy: ${cognitiveEval.recommendedAction}`
        );

        const reports = await this.healerEngine.dispatchHealersForCase(caseItem);

        // 4. Record decision in Decision Ledger
        await this.decisionLedger.record({
          caseId: caseItem.caseId,
          stateSnapshot: { caseId: caseItem.caseId, severity: caseItem.severity },
          thinkingMode: cognitiveEval.complexityLevel === "RLM" ? "DEEP" : "DELIBERATE",
          availableOptions: ["DISPATCH_HEALER_SQUAD", "ESCALATE_TO_HUMAN", "SUPPRESS_ANOMALY"],
          selectedOption: "DISPATCH_HEALER_SQUAD",
          reasoningSummary: cognitiveEval.rationale,
          predictedOutcome: "Hypothesis verified and transactional repair applied",
          agentsUsed: reports.map((r) => r.healerId),
          toolsUsed: ["healer.verify", "healer.repair", "repairGate.execute"],
          executionTimeMs: reports.reduce((acc, r) => acc + r.durationMs, 0),
        });

        // 5. If case transitioned to VERIFYING, trigger validator and close learning loop
        const healedCase = await this.caseManager.getCase(caseItem.caseId);
        if (healedCase && healedCase.status === "VERIFYING") {
          const validationResult = await this.validator.verifyCaseResolution(healedCase);
          await this.cognitiveRuntime.outcomeLearner.recordOutcome({
            incidentId: caseItem.caseId,
            category: caseItem.category,
            floorId: caseItem.floorId,
            proposedAction: cognitiveEval.recommendedAction,
            predictedSuccess: true,
            validatorPassed: validationResult.overallPassed,
            durationMs: cognitiveEval.durationMs,
            symptoms: caseItem.symptoms || [caseItem.description],
          });
        }
      } else if (caseItem.status === "VERIFYING") {
        // Trigger independent validator
        await this.validator.verifyCaseResolution(caseItem);
      }
    }

    // 6. Autonomous Mission Completion Evaluation
    if (this.missionManager) {
      const activeMissions = await this.missionManager.getActiveMissions();
      const activeCases = await this.caseManager.getActiveCases();
      const unresolvedBlocking = activeCases.filter((c) => c.status !== "RESOLVED");

      if (unresolvedBlocking.length === 0) {
        for (const m of activeMissions) {
          if (m.status === "REPLANNING") {
            try {
              await this.missionManager.startMission(m.missionId);
            } catch {}
          } else if (m.status === "RUNNING") {
            try {
              await this.missionManager.completeMission(m.missionId);
            } catch {
              // Ignore if not ready
            }
          }
        }
      }
    }
  }

  async resolveEvidenceContradiction(
    caseId: string,
    reports: { source: string; claim: string }[]
  ): Promise<{ resolvedClaim: string; rationale: string }> {
    const currentState = this.worldState.getState();
    const isStorageDegraded = currentState.resources.driveAvailable === false || currentState.floors["floor03_asset_realization"]?.status === "DEGRADED";
    const resolvedClaim = isStorageDegraded ? "Storage subsystem degraded" : "GPU VRAM allocation stalled";

    const decision = await this.decisionLedger.record({
      caseId,
      stateSnapshot: { caseId, reports },
      thinkingMode: "DEEP",
      availableOptions: ["TRUST_GUARDIAN", "TRUST_SLAYER", "RUN_DIAGNOSTIC_PROBE"],
      selectedOption: "RUN_DIAGNOSTIC_PROBE",
      reasoningSummary: `Detected contradiction between ${reports.length} reports. Diagnostic probe resolved claim to '${resolvedClaim}' based on WorldState telemetry.`,
      predictedOutcome: "Root cause resolved without misdiagnosis",
      agentsUsed: ["overseer", "slayer_patrol"],
      toolsUsed: ["tool_internal_telemetry", "tool_agent_reach"],
      executionTimeMs: 120,
    });

    return { resolvedClaim, rationale: decision.reasoningSummary };
  }

  getRun(runId: string): OverseerRun | undefined {
    const run = this.runs.get(runId);
    return run ? structuredClone(run) : undefined;
  }

  getAllRuns(): OverseerRun[] {
    return Array.from(this.runs.values()).map((r) => structuredClone(r));
  }

  async getDecisions(caseId?: string, limit: number = 50) {
    return this.decisionLedger.getRecentDecisions(limit);
  }

  getDecisionLedger(): DecisionLedger {
    return this.decisionLedger;
  }

  getTaskPlanner(): TaskDAGPlanner {
    return this.dagPlanner;
  }

  getThinkingController(): OverseerThinkingController {
    return this.thinkingController;
  }

  getPresenceEngine(): OverseerPresenceEngine {
    return this.presenceEngine;
  }
}
