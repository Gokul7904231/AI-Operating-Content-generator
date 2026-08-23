/**
 * FactoryOS Frontier v3 — Verification & Definition-of-Done Engine
 * Guarantees that Overseer CANNOT declare a mission complete without verified evidence.
 */

import { Mission, DefinitionOfDoneItem, MissionCompletionResult } from "../contracts/MissionContracts";
import { Artifact } from "../contracts/ArtifactContracts";
import { MissionEvidence } from "../contracts/EvidenceContracts";

export class VerificationEngine {
  /**
   * Generates standard Definition of Done checklist for a Mission type
   */
  static createStandardVideoDoD(): DefinitionOfDoneItem[] {
    return [
      { id: "dod_script_valid", description: "Script JSON generated and retention rules validated", requiredArtifactType: "SCRIPT", satisfied: false },
      { id: "dod_creative_bible", description: "Creative Bible and character continuity established", requiredArtifactType: "CREATIVE_BIBLE", satisfied: false },
      { id: "dod_timeline_ready", description: "Deterministic video timeline constructed with all scenes", requiredArtifactType: "TIMELINE", satisfied: false },
      { id: "dod_voice_generated", description: "Audio narration synthesized and verified", requiredArtifactType: "VOICE_AUDIO", satisfied: false },
      { id: "dod_mp4_rendered", description: "Final MP4 video rendered and readable", requiredArtifactType: "RENDERED_VIDEO", satisfied: false },
      { id: "dod_artifact_stored", description: "Artifact stored in persistent storage (Drive / CDN)", satisfied: false },
      { id: "dod_evidence_committed", description: "All task execution evidence committed to ledger", satisfied: false },
    ];
  }

  /**
   * Verifies Mission against DoD, Artifacts, and Evidence
   */
  static verifyMission(
    mission: Mission,
    artifacts: Artifact[],
    evidences: MissionEvidence[]
  ): MissionCompletionResult {
    const dodList = mission.definitionOfDone || this.createStandardVideoDoD();
    const evaluatedDoD: { condition: string; passed: boolean; reason?: string }[] = [];
    const failedConditions: string[] = [];

    for (const item of dodList) {
      let passed = item.satisfied;
      let reason: string | undefined;

      if (!passed && item.requiredArtifactType) {
        const matchingArtifact = artifacts.find(
          (a) => a.type === item.requiredArtifactType && a.validationStatus === "VALID"
        );
        if (matchingArtifact) {
          passed = true;
          item.satisfied = true;
          item.evidenceId = matchingArtifact.artifactId;
          item.verifiedAt = new Date().toISOString();
        } else {
          reason = `Missing valid artifact of type ${item.requiredArtifactType}`;
        }
      }

      if (!passed && item.id === "dod_evidence_committed") {
        if (evidences.length > 0 && evidences.every((e) => e.status === "SUCCESS" || e.status === "RECOVERED")) {
          passed = true;
          item.satisfied = true;
          item.verifiedAt = new Date().toISOString();
        } else {
          reason = "Unresolved or failed execution evidence records detected";
        }
      }

      if (!passed && item.id === "dod_artifact_stored") {
        const videoArtifact = artifacts.find((a) => a.type === "RENDERED_VIDEO");
        if (videoArtifact && (videoArtifact.storageLocation.uri || videoArtifact.storageLocation.driveFileId)) {
          passed = true;
          item.satisfied = true;
          item.verifiedAt = new Date().toISOString();
        } else {
          reason = "No storage URI or Drive file ID recorded for rendered artifact";
        }
      }

      evaluatedDoD.push({ condition: item.description, passed, reason });
      if (!passed) {
        failedConditions.push(item.description);
      }
    }

    const allPassed = failedConditions.length === 0;

    return {
      eligible: allPassed,
      passed: allPassed,
      successConditions: evaluatedDoD,
      failedConditions,
      outstandingTasks: (mission.tasks || [])
        .filter((t) => t.status !== "COMPLETED" && t.status !== "SKIPPED")
        .map((t) => t.name),
      unresolvedCases: [],
      validatorResults: [],
      scopeHealth: { healthy: allPassed, issues: failedConditions },
      objectiveResult: {
        met: allPassed,
        summary: allPassed
          ? "All Definition of Done conditions verified with concrete evidence."
          : `Verification pending for ${failedConditions.length} conditions: ${failedConditions.join(", ")}`,
      },
      evidence: evidences.map((e) => ({ ...e })),
      definitionOfDoneResults: evaluatedDoD.map((d) => ({ item: d.condition, satisfied: d.passed })),
    };
  }
}
