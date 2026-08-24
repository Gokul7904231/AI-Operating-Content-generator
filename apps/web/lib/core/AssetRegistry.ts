import { CheckpointDB, AssetRecord } from "./CheckpointDB";
import crypto from "crypto";

export const AssetRegistry = {
  /**
   * Register a new asset in the system.
   */
  register(asset: Omit<AssetRecord, "id"> & { id?: string }): string {
    const id = asset.id || `asset_${asset.type}_${crypto.randomUUID().slice(0, 8)}`;
    const record: AssetRecord = {
      ...asset,
      id,
    };
    CheckpointDB.registerAsset(record);
    console.log(`[AssetRegistry] Registered asset: ${id} (${asset.type}) at ${asset.path}`);
    return id;
  },

  /**
   * Fetch an asset from the registry.
   */
  get(id: string): AssetRecord | null {
    return CheckpointDB.getAsset(id);
  },

  /**
   * Helper to register an image.
   */
  registerImage(params: {
    path: string;
    jobId: string;
    provider: string;
    model: string;
    promptHash: string;
    resolution?: string;
  }): string {
    return this.register({
      type: "image",
      path: params.path,
      job_id: params.jobId,
      provider: params.provider,
      model: params.model,
      prompt_hash: params.promptHash,
      resolution: params.resolution ?? "1080x1920",
      mime_type: "image/jpeg",
      cache_status: "cached",
      sha256: crypto.createHash("sha256").update(params.path).digest("hex"),
    });
  },

  /**
   * Helper to register a voice track.
   */
  registerVoice(params: {
    path: string;
    jobId: string;
    provider: string;
    model: string;
    promptHash: string;
    duration?: number;
  }): string {
    return this.register({
      type: "audio",
      path: params.path,
      job_id: params.jobId,
      provider: params.provider,
      model: params.model,
      prompt_hash: params.promptHash,
      resolution: "none",
      mime_type: "audio/mpeg",
      duration: params.duration ?? 0,
      cache_status: "cached",
      sha256: crypto.createHash("sha256").update(params.path).digest("hex"),
    });
  },

  /**
   * Helper to register a scene video clip.
   */
  registerClip(params: {
    path: string;
    jobId: string;
    promptHash: string;
    duration: number;
    resolution?: string;
  }): string {
    return this.register({
      type: "video",
      path: params.path,
      job_id: params.jobId,
      provider: "ffmpeg",
      model: "scene_renderer",
      prompt_hash: params.promptHash,
      resolution: params.resolution ?? "1080x1920",
      mime_type: "video/mp4",
      duration: params.duration,
      cache_status: "cached",
      sha256: crypto.createHash("sha256").update(params.path).digest("hex"),
    });
  },
};
export default AssetRegistry;
