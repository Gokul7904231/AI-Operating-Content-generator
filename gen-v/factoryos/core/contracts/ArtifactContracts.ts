/**
 * FactoryOS Frontier v3 — Artifact Contracts
 * Defines first-class versioned output entities with explicit lineage for granular scene-level regeneration.
 */

export type ArtifactType =
  | "SCRIPT"
  | "STORYBOARD"
  | "CREATIVE_BIBLE"
  | "SCENE_IMAGE"
  | "VOICE_AUDIO"
  | "MUSIC_AUDIO"
  | "TIMELINE"
  | "CAPTIONS"
  | "RENDERED_VIDEO"
  | "THUMBNAIL"
  | "METADATA_PACKAGE"
  | "EVALUATION_REPORT";

export interface ArtifactLineage {
  readonly parentArtifactIds: string[];
  readonly rootMissionId: string;
  readonly taskId: string;
  readonly producerAgent: string;
  readonly skillId?: string;
  readonly skillVersion?: string;
  readonly inputHashes: Record<string, string>;
  readonly generationParams?: Record<string, unknown>;
}

export interface Artifact {
  readonly artifactId: string;
  readonly type: ArtifactType;
  readonly version: number;
  readonly name: string;
  readonly missionId: string;
  readonly taskId: string;
  readonly sceneIndex?: number;
  readonly lineage: ArtifactLineage;
  readonly outputHash: string;
  readonly storageLocation: {
    readonly uri: string;
    readonly mimeType: string;
    readonly sizeBytes: number;
    readonly provider: "LOCAL_FS" | "CLOUDINARY" | "GOOGLE_DRIVE" | "FIREBASE_STORAGE";
    readonly driveFileId?: string;
  };
  readonly validationStatus: "PENDING" | "VALID" | "INVALID" | "REJECTED";
  readonly validationErrors?: string[];
  readonly payload?: Record<string, unknown>; // For JSON artifacts like script, timeline, creative-bible
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ArtifactRegenerationPlan {
  readonly targetArtifactId: string;
  readonly targetSceneIndex?: number;
  readonly affectedChildArtifactTypes: ArtifactType[];
  readonly downstreamTasksRequired: string[];
  readonly preservedArtifactIds: string[];
}
