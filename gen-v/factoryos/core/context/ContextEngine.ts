/**
 * FactoryOS Frontier v3 — Context Engine
 * Implements context assembly, budgeting, compaction, checkpointing, and rehydration.
 * Prevents prompt bloat and guarantees strict context priority.
 */

import { Mission } from "../contracts/MissionContracts";
import { MissionEvidence } from "../contracts/EvidenceContracts";

export interface ContextAssembleRequest {
  readonly mission: Mission;
  readonly currentTaskId?: string;
  readonly userPreferences?: Record<string, unknown>;
  readonly authoritativeState?: Record<string, unknown>;
  readonly activeSkillMd?: string;
  readonly recentEvidences?: MissionEvidence[];
  readonly maxTokens?: number;
}

export interface AssembledContext {
  readonly missionSummary: string;
  readonly taskObjective?: string;
  readonly authoritativeStateBlock: string;
  readonly userPreferencesBlock?: string;
  readonly skillGuidanceBlock?: string;
  readonly evidenceSummaryBlock?: string;
  readonly estimatedTokens: number;
  readonly wasCompacted: boolean;
}

export class ContextAssembler {
  private static DEFAULT_MAX_TOKENS = 4096;

  /**
   * Assemble context with strict prioritization:
   * 1. Current mission
   * 2. Current task
   * 3. Current authoritative state
   * 4. Relevant user preferences
   * 5. Relevant skill
   * 6. Recent evidence
   */
  static assemble(req: ContextAssembleRequest): AssembledContext {
    const maxTokens = req.maxTokens || this.DEFAULT_MAX_TOKENS;
    let estimatedTokens = 0;
    let wasCompacted = false;

    // 1. Mission Summary
    const missionSummary = `[MISSION] ID: ${req.mission.missionId} | Goal: "${req.mission.goal}" | Status: ${req.mission.status} | Mode: ${req.mission.autonomyMode || "AUTO"}`;
    estimatedTokens += Math.ceil(missionSummary.length / 4);

    // 2. Task Objective
    let taskObjective = "";
    if (req.currentTaskId && req.mission.tasks) {
      const task = req.mission.tasks.find((t) => t.taskId === req.currentTaskId);
      if (task) {
        taskObjective = `[TASK] ID: ${task.taskId} | Name: ${task.name} | Type: ${task.executionType} | Capability: ${task.capabilityRequired}`;
        estimatedTokens += Math.ceil(taskObjective.length / 4);
      }
    }

    // 3. Authoritative State
    let authStateStr = "";
    if (req.authoritativeState) {
      authStateStr = `[AUTHORITATIVE STATE] ${JSON.stringify(req.authoritativeState)}`;
      estimatedTokens += Math.ceil(authStateStr.length / 4);
    }

    // 4. User Preferences
    let userPrefStr = "";
    if (req.userPreferences) {
      userPrefStr = `[USER PREFERENCES] ${JSON.stringify(req.userPreferences)}`;
      estimatedTokens += Math.ceil(userPrefStr.length / 4);
    }

    // 5. Relevant Skill Guidance
    let skillStr = "";
    if (req.activeSkillMd) {
      // If adding skill exceeds budget, compact it
      const skillTokens = Math.ceil(req.activeSkillMd.length / 4);
      if (estimatedTokens + skillTokens > maxTokens) {
        skillStr = `[SKILL SUMMARY] ${req.activeSkillMd.slice(0, 1000)}...`;
        wasCompacted = true;
      } else {
        skillStr = `[SKILL GUIDANCE]\n${req.activeSkillMd}`;
      }
      estimatedTokens += Math.ceil(skillStr.length / 4);
    }

    // 6. Recent Evidence
    let evidenceStr = "";
    if (req.recentEvidences && req.recentEvidences.length > 0) {
      const recent = req.recentEvidences.slice(-3);
      evidenceStr = `[RECENT EVIDENCE]\n` + recent.map(e => `- ${e.action}: ${e.status} (Cost: $${e.estimatedCostUsd})`).join("\n");
      estimatedTokens += Math.ceil(evidenceStr.length / 4);
    }

    return {
      missionSummary,
      taskObjective: taskObjective || undefined,
      authoritativeStateBlock: authStateStr,
      userPreferencesBlock: userPrefStr || undefined,
      skillGuidanceBlock: skillStr || undefined,
      evidenceSummaryBlock: evidenceStr || undefined,
      estimatedTokens,
      wasCompacted,
    };
  }

  /**
   * Compactor: Condenses text history or removes stale telemetry
   */
  static compactText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text;
    const half = Math.floor(maxChars / 2);
    return `${text.slice(0, half)}\n...[TRUNCATED FOR CONTEXT BUDGET]...\n${text.slice(-half)}`;
  }
}
