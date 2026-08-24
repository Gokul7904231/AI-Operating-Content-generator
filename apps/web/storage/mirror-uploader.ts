/**
 * Mirror Uploader — Multi-Storage Mode
 *
 * Uploads a single file to multiple storage providers simultaneously.
 * One render → multiple destinations (Drive + Cloudinary + future S3).
 *
 * Usage:
 *   const results = await MirrorUploader.upload(videoPath, {
 *     providerIds: ["google-drive", "cloudinary"],
 *     options: { engine: "quiz", deleteAfterHours: 72 },
 *   });
 *
 * Results are keyed by provider ID. Partial failures are logged but
 * do not block successful providers.
 */

import { StorageRegistry } from "./storage-registry";
import type { UploadOptions, UploadResult } from "./types";
import { EventBus } from "../ai/event-bus";

export interface MirrorUploadOptions {
  /** Which provider IDs to upload to. Defaults to all registered providers. */
  providerIds?: string[];
  /** Upload options forwarded to every provider. */
  options?: UploadOptions;
  /** If true, abort all remaining uploads if any single one fails. */
  failFast?: boolean;
}

export interface MirrorUploadResult {
  succeeded: Record<string, UploadResult>;
  failed: Record<string, string>;  // providerId → error message
  allSucceeded: boolean;
  totalCount: number;
  successCount: number;
}

class MirrorUploaderClass {
  /**
   * Upload a file to multiple storage providers concurrently.
   */
  async upload(
    sourcePath: string,
    mirrorOptions: MirrorUploadOptions = {}
  ): Promise<MirrorUploadResult> {
    const {
      providerIds,
      options = {},
      failFast = false,
    } = mirrorOptions;

    const providers = providerIds
      ? providerIds.map((id) => StorageRegistry.getProvider(id))
      : StorageRegistry.getAllProviders();

    const traceId = `mirror_${Date.now()}`;

    EventBus.publish(
      "storage.mirror.started",
      { providerIds: providers.map((p) => p.id), sourcePath },
      traceId
    );

    const result: MirrorUploadResult = {
      succeeded: {},
      failed: {},
      allSucceeded: false,
      totalCount: providers.length,
      successCount: 0,
    };

    if (failFast) {
      // Sequential — stop on first failure
      for (const provider of providers) {
        try {
          result.succeeded[provider.id] = await provider.upload(sourcePath, options);
          result.successCount++;
        } catch (err: any) {
          result.failed[provider.id] = err.message;
          break;
        }
      }
    } else {
      // Concurrent — attempt all, collect results
      const outcomes = await Promise.allSettled(
        providers.map((p) => p.upload(sourcePath, options).then((r) => ({ id: p.id, result: r })))
      );

      for (const outcome of outcomes) {
        if (outcome.status === "fulfilled") {
          result.succeeded[outcome.value.id] = outcome.value.result;
          result.successCount++;
        } else {
          // Extract provider id from the rejection if possible
          const msg = outcome.reason?.message ?? String(outcome.reason);
          // Best-effort: find which provider failed
          const failedId = providers.find(
            (p) => !result.succeeded[p.id]
          )?.id ?? "unknown";
          result.failed[failedId] = msg;
        }
      }
    }

    result.allSucceeded = result.successCount === result.totalCount;

    EventBus.publish(
      result.allSucceeded ? "storage.mirror.completed" : "storage.mirror.partial",
      {
        succeeded: Object.keys(result.succeeded),
        failed: result.failed,
        successCount: result.successCount,
        totalCount: result.totalCount,
      },
      traceId
    );

    return result;
  }

  /**
   * Upload to a specific set of providers by ID.
   * Shorthand for upload() with explicit providerIds.
   */
  async uploadTo(
    sourcePath: string,
    providerIds: string[],
    options: UploadOptions = {}
  ): Promise<MirrorUploadResult> {
    return this.upload(sourcePath, { providerIds, options });
  }
}

export const MirrorUploader = new MirrorUploaderClass();
