/**
 * FactoryOS Frontier v2 — Mission Completion Evaluator
 * Policy and evidence evaluation engine determining whether a Mission satisfies all criteria for completion.
 */

import type { Mission, MissionCompletionResult } from "../contracts/MissionContracts";
import type { ICaseRepository, ITaskDAGRepository } from "../database/DatabaseContracts";
import type { WorldStateEngine } from "../worldstate/WorldStateEngine";

export interface MissionEvaluationContext {
  readonly worldState?: WorldStateEngine;
  readonly caseRepository?: ICaseRepository;
  readonly taskDAGRepository?: ITaskDAGRepository;
  readonly validators?: { validatorId: string; status: "PASSED" | "FAILED" | "PENDING"; reason?: string }[];
  readonly customObjectiveEvaluator?: (mission: Mission) => Promise<{ met: boolean; summary: string }>;
}

export class MissionCompletionEvaluator {
  static async evaluate(
    mission: Mission,
    context: MissionEvaluationContext = {}
  ): Promise<MissionCompletionResult> {
    const evidence: Record<string, unknown>[] = [];
    const failedConditions: string[] = [];
    const successConditionResults: { condition: string; passed: boolean; reason?: string }[] = [];

    // 1. Task Completion Check
    const outstandingTasks: string[] = [];
    if (context.taskDAGRepository && mission.taskIds.length > 0) {
      for (const dagId of mission.taskIds) {
        const dag = await context.taskDAGRepository.getDAG(dagId);
        if (dag && dag.status !== "COMPLETED") {
          outstandingTasks.push(`DAG ${dagId} status is '${dag.status}'`);
        }
      }
    }
    evidence.push({ type: "TASK_CHECK", outstandingTasks });

    // 2. Unresolved Case Check (filtering by scope if present)
    const unresolvedCases: string[] = [];
    if (context.caseRepository) {
      const activeCases = await context.caseRepository.getActiveCases();
      for (const c of activeCases) {
        // High severity or critical cases, or cases matching mission scope
        const isHighSeverity = c.severity === "HIGH" || c.severity === "CRITICAL";
        const matchesFloorScope =
          !mission.scope?.floorIds ||
          mission.scope.floorIds.length === 0 ||
          (c.floorId && mission.scope.floorIds.includes(c.floorId));

        if (c.status !== "RESOLVED" && matchesFloorScope && (isHighSeverity || (c as any).isBlocking === true)) {
          unresolvedCases.push(`Case ${c.caseId} [${c.severity}]: ${c.title} (${c.status})`);
        }
      }
    }
    evidence.push({ type: "CASE_CHECK", unresolvedCases });

    // 3. Scope & World State Health Check
    const scopeIssues: string[] = [];
    if (context.worldState) {
      const state = context.worldState.getState();
      const targetFloors = mission.scope?.floorIds && mission.scope.floorIds.length > 0
        ? mission.scope.floorIds
        : Object.keys(state.floors || {});

      for (const fId of targetFloors) {
        const floor = state.floors[fId];
        if (floor && (floor.status === "DEGRADED" || floor.status === "ERROR")) {
          scopeIssues.push(`Floor ${fId} status is '${floor.status}'`);
        }
      }
    }
    const scopeHealth = {
      healthy: scopeIssues.length === 0,
      issues: scopeIssues,
    };
    evidence.push({ type: "SCOPE_HEALTH_CHECK", scopeHealth });

    // 4. Validator Check
    const validatorResults = context.validators || [];
    const failedValidators = validatorResults.filter((v) => v.status !== "PASSED");
    if (failedValidators.length > 0) {
      failedValidators.forEach((v) => {
        failedConditions.push(`Validator '${v.validatorId}' failed: ${v.reason || "Validation error"}`);
      });
    }
    evidence.push({ type: "VALIDATOR_CHECK", validatorResults });

    // 5. Objective Evaluation
    let objectiveResult = { met: true, summary: "Objective conditions satisfied" };
    if (context.customObjectiveEvaluator) {
      objectiveResult = await context.customObjectiveEvaluator(mission);
    } else if (outstandingTasks.length > 0) {
      objectiveResult = {
        met: false,
        summary: `Outstanding tasks remaining: ${outstandingTasks.join("; ")}`,
      };
    }
    evidence.push({ type: "OBJECTIVE_CHECK", objectiveResult });

    // 6. Mission Success Conditions Evaluation
    for (const cond of mission.successConditions) {
      let passed = true;
      let reason: string | undefined;

      if (cond.includes("floors ONLINE") || cond.includes("floor ONLINE")) {
        if (!scopeHealth.healthy) {
          passed = false;
          reason = `Floors unhealthy: ${scopeIssues.join("; ")}`;
        }
      } else if (cond.includes("unresolved high-severity cases") || cond.includes("unresolved cases")) {
        if (unresolvedCases.length > 0) {
          passed = false;
          reason = `Unresolved cases remaining: ${unresolvedCases.join("; ")}`;
        }
      }

      if (!passed) {
        failedConditions.push(reason || `Condition failed: ${cond}`);
      }
      successConditionResults.push({ condition: cond, passed, reason });
    }

    if (outstandingTasks.length > 0) {
      failedConditions.push(`Outstanding tasks: ${outstandingTasks.join("; ")}`);
    }
    if (unresolvedCases.length > 0) {
      failedConditions.push(`Unresolved cases: ${unresolvedCases.join("; ")}`);
    }
    if (!scopeHealth.healthy) {
      failedConditions.push(`Scope unhealthy: ${scopeIssues.join("; ")}`);
    }
    if (!objectiveResult.met) {
      failedConditions.push(`Objective not met: ${objectiveResult.summary}`);
    }

    // Comprehensive Eligibility Determination
    const isEligible =
      outstandingTasks.length === 0 &&
      unresolvedCases.length === 0 &&
      scopeHealth.healthy &&
      failedValidators.length === 0 &&
      objectiveResult.met &&
      failedConditions.length === 0;

    return {
      eligible: isEligible,
      passed: isEligible,
      successConditions: successConditionResults,
      failedConditions,
      outstandingTasks,
      unresolvedCases,
      validatorResults,
      scopeHealth,
      objectiveResult,
      evidence,
    };
  }
}
