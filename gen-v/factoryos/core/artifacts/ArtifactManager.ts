/**
 * FactoryOS Frontier v3 — Artifact Manager & Lineage Engine
 * Tracks artifact versions, parent/child relationships, and calculates selective regeneration plans.
 */

import { Artifact, ArtifactType, ArtifactRegenerationPlan } from "../contracts/ArtifactContracts";

export class ArtifactManager {
  private static artifacts: Map<string, Artifact> = new Map();

  static registerArtifact(artifact: Artifact): void {
    this.artifacts.set(artifact.artifactId, { ...artifact });
  }

  static getArtifact(artifactId: string): Artifact | undefined {
    return this.artifacts.get(artifactId);
  }

  static getArtifactsByMission(missionId: string): Artifact[] {
    return Array.from(this.artifacts.values()).filter((a) => a.missionId === missionId);
  }

  /**
   * Plan Selective Regeneration:
   * When user requests "Regenerate Scene 3", we keep Script, CreativeBible, Scene 1, Scene 2,
   * and only regenerate Scene 3 Visual, Scene 3 Audio, affected Timeline, and the Final Composite.
   */
  static planSelectiveRegeneration(
    missionId: string,
    targetType: ArtifactType,
    sceneIndex?: number
  ): ArtifactRegenerationPlan {
    const missionArtifacts = this.getArtifactsByMission(missionId);
    const target = missionArtifacts.find(
      (a) => a.type === targetType && (sceneIndex === undefined || a.sceneIndex === sceneIndex)
    );

    if (!target) {
      throw new Error(`Target artifact not found for type ${targetType} (scene ${sceneIndex}) in mission ${missionId}`);
    }

    const affectedTypes: ArtifactType[] = [];
    const downstreamTasks: string[] = [];
    const preservedIds: string[] = [];

    if (targetType === "SCENE_IMAGE" || targetType === "VOICE_AUDIO") {
      affectedTypes.push(targetType, "TIMELINE", "RENDERED_VIDEO");
      downstreamTasks.push(`regenerate_scene_${sceneIndex}`, "rebuild_timeline", "render_composite");
    } else if (targetType === "SCRIPT") {
      affectedTypes.push("SCRIPT", "STORYBOARD", "SCENE_IMAGE", "VOICE_AUDIO", "TIMELINE", "RENDERED_VIDEO");
      downstreamTasks.push("generate_script", "create_storyboard", "render_composite");
    }

    for (const art of missionArtifacts) {
      if (!affectedTypes.includes(art.type) || (sceneIndex !== undefined && art.sceneIndex !== undefined && art.sceneIndex !== sceneIndex)) {
        preservedIds.push(art.artifactId);
      }
    }

    return {
      targetArtifactId: target.artifactId,
      targetSceneIndex: sceneIndex,
      affectedChildArtifactTypes: affectedTypes,
      downstreamTasksRequired: downstreamTasks,
      preservedArtifactIds: preservedIds,
    };
  }
}
