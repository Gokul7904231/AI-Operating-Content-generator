/**
 * FactoryOS Frontier v2 — Simulation Decision Engine & Bounded State Transition Simulator
 * Evaluates simulation value, computes state transition deltas, and tracks prediction error.
 */

import { randomUUID } from "node:crypto";
import type { WorldState } from "../../contracts/WorldStateContracts";

export interface CandidateAction {
  readonly actionId: string;
  readonly name: string;
  readonly description: string;
  readonly targetFloorId?: string;
  readonly estimatedRisk: number; // 0.0 to 1.0
  readonly isIrreversible: boolean;
  readonly parameters: Record<string, unknown>;
}

export interface SimulationResult {
  readonly actionId: string;
  readonly predictedStateSnapshot: Partial<WorldState>;
  readonly predictedGpuPercent: number;
  readonly predictedCpuPercent: number;
  readonly predictedQueueTimeMs: number;
  readonly predictedFailureProbability: number;
  readonly predictedRecoveryRisk: number;
  readonly score: number; // Higher is better
  readonly rationale: string;
}

export class SimulationDecisionEngine {
  /**
   * Decides whether simulation should be performed based on uncertainty, risk, and blast radius.
   */
  evaluateSimulationValue(context: {
    uncertainty: number; // 0.0 to 1.0
    risk: number; // 0.0 to 1.0
    irreversibility: boolean;
    blastRadiusFloors: number;
    expectedInformationGain: number;
  }): { shouldSimulate: boolean; simulationValue: number; rationale: string } {
    const irrevScore = context.irreversibility ? 0.3 : 0.0;
    const blastScore = Math.min(0.3, context.blastRadiusFloors * 0.1);

    const simulationValue =
      0.3 * context.uncertainty +
      0.2 * context.risk +
      irrevScore +
      blastScore +
      0.2 * context.expectedInformationGain;

    if (simulationValue >= 0.5) {
      return {
        shouldSimulate: true,
        simulationValue,
        rationale: `Simulation recommended (value: ${simulationValue.toFixed(2)}): high uncertainty/risk with multi-floor impact.`,
      };
    }

    return {
      shouldSimulate: false,
      simulationValue,
      rationale: `Simulation bypassed (value: ${simulationValue.toFixed(2)}): low-risk known action. Proceed directly to ACT.`,
    };
  }

  /**
   * Simulates candidate actions by executing bounded state transitions on the current World State snapshot.
   */
  simulateCandidates(
    candidates: CandidateAction[],
    worldState: WorldState
  ): {
    simulations: SimulationResult[];
    selectedCandidate: CandidateAction;
    rationale: string;
  } {
    const currentCpu = worldState.resources.cpuPercent;
    const currentQueue = Object.values(worldState.floors).reduce((sum, f) => sum + f.queueDepth, 0);

    const simulations: SimulationResult[] = candidates.map((cand) => {
      // 1. Clone state for simulated transition rollout
      const simulatedState = structuredClone(worldState);

      let predictedCpu = currentCpu;
      let predictedGpu = 40;
      let predictedQueueTime = 2000;
      let predictedFailure = 0.05;
      let predictedRecoveryRisk = cand.estimatedRisk;

      // Apply transition delta based on action semantics
      if (cand.targetFloorId && simulatedState.floors[cand.targetFloorId]) {
        (simulatedState.floors[cand.targetFloorId] as any).status = "ONLINE";
        (simulatedState.floors[cand.targetFloorId] as any).queueDepth = Math.max(0, simulatedState.floors[cand.targetFloorId].queueDepth - 1);
      }

      if (cand.name.toLowerCase().includes("restart") || cand.name.toLowerCase().includes("recycle") || cand.name.toLowerCase().includes("reconnect")) {
        predictedCpu = Math.max(10, currentCpu - 15);
        predictedGpu = 25;
        predictedQueueTime = 3000;
        predictedFailure = 0.02;
      } else if (cand.name.toLowerCase().includes("throttle") || cand.name.toLowerCase().includes("wait")) {
        predictedCpu = Math.max(10, currentCpu - 5);
        predictedGpu = 30;
        predictedQueueTime = 7000;
        predictedFailure = 0.01;
      } else if (cand.name.toLowerCase().includes("force") || cand.name.toLowerCase().includes("purge") || cand.name.toLowerCase().includes("reboot")) {
        predictedCpu = 85;
        predictedGpu = 60;
        predictedQueueTime = 1000;
        predictedFailure = 0.18;
      }

      (simulatedState.resources as any).cpuPercent = predictedCpu;

      // Composite score: lower failure + lower recovery risk + lower queue time = higher score
      const score = 1.0 - (predictedFailure * 0.5 + predictedRecoveryRisk * 0.3 + (predictedQueueTime / 20000) * 0.2);

      return {
        actionId: cand.actionId,
        predictedStateSnapshot: simulatedState,
        predictedCpuPercent: predictedCpu,
        predictedGpuPercent: predictedGpu,
        predictedQueueTimeMs: predictedQueueTime,
        predictedFailureProbability: predictedFailure,
        predictedRecoveryRisk,
        score,
        rationale: `Bounded simulation delta: projected CPU ${predictedCpu}%, failure rate ${(predictedFailure * 100).toFixed(1)}%, recovery risk ${predictedRecoveryRisk}.`,
      };
    });

    simulations.sort((a, b) => b.score - a.score);
    const bestSimulation = simulations[0];
    const selectedCandidate = candidates.find((c) => c.actionId === bestSimulation.actionId)!;

    return {
      simulations,
      selectedCandidate,
      rationale: `Candidate "${selectedCandidate.name}" scored highest (${bestSimulation.score.toFixed(2)}) with lowest projected failure risk.`,
    };
  }

  /**
   * Computes prediction calibration error between simulated snapshot and ground truth.
   */
  calculatePredictionError(predicted: Partial<WorldState>, actual: WorldState): {
    cpuErrorDelta: number;
    floorStatusMatch: boolean;
    overallAccuracy: number;
  } {
    const predCpu = predicted.resources?.cpuPercent ?? 50;
    const actCpu = actual.resources.cpuPercent;
    const cpuErrorDelta = Math.abs(predCpu - actCpu);

    let floorMatches = 0;
    let totalFloors = 0;
    if (predicted.floors) {
      for (const [floorId, floor] of Object.entries(predicted.floors)) {
        totalFloors += 1;
        if (actual.floors[floorId] && actual.floors[floorId].status === floor.status) {
          floorMatches += 1;
        }
      }
    }

    const floorStatusMatch = totalFloors === 0 || floorMatches === totalFloors;
    const cpuAccuracy = Math.max(0, 1 - cpuErrorDelta / 100);
    const overallAccuracy = (cpuAccuracy + (floorStatusMatch ? 1 : 0)) / 2;

    return {
      cpuErrorDelta,
      floorStatusMatch,
      overallAccuracy,
    };
  }
}
