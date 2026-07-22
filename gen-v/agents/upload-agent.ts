/**
 * Upload Agent
 *
 * Replaces the previous stub. Orchestrates the full storage pipeline:
 *   1. Upload to Google Drive (primary)
 *   2. Write Drive metadata to Firestore
 *
 * Does NOT contain business logic — delegates to StorageRegistry.
 * Retries are handled by BaseProviderPlugin / caller.
 * Events are published inside each provider.
 */

import "../storage/index"; // ensure providers are registered
import { StorageRegistry } from "../storage/storage-registry";
import { db } from "../lib/firebase-admin";

export interface UploadAgentInput {
  /** Absolute path to the rendered video file. */
  videoPath: string;
  /** Job ID for Firestore linkage. */
  jobId: string;
  /** Engine that produced this video. Used for folder organisation. */
  engine?: string;
  /** How many hours before auto-delete. Default: env GOOGLE_DRIVE_DELETE_AFTER_HOURS or 72. */
  deleteAfterHours?: number;
}

export interface UploadAgentResult {
  status: "uploaded" | "failed" | "skipped";
  driveFileId?: string;
  driveUrl?: string;
  downloadLink?: string;
  driveFolderId?: string;
  uploadedAt?: string;
  provider?: string;
  error?: string;
}

export async function uploadAgent(
  input: UploadAgentInput
): Promise<UploadAgentResult> {
  const { videoPath, jobId, engine } = input;

  const deleteAfterHours =
    input.deleteAfterHours ??
    Number(process.env.GOOGLE_DRIVE_DELETE_AFTER_HOURS ?? 72);

  console.log(
    `[UploadAgent] Starting upload for job ${jobId} | engine: ${engine ?? "unknown"} | path: ${videoPath}`
  );

  let provider;
  try {
    provider = StorageRegistry.getPrimary();
  } catch (err: any) {
    console.error("[UploadAgent] No primary storage provider registered:", err.message);
    return { status: "failed", error: err.message };
  }

  try {
    const result = await provider.upload(videoPath, {
      engine,
      deleteAfterHours,
      metadata: { jobId },
    });

    // Compute deleteAt timestamp
    const deleteAt =
      deleteAfterHours > 0
        ? new Date(Date.now() + deleteAfterHours * 3_600_000).toISOString()
        : null;

    // Write Drive metadata to Firestore
    try {
      await db
        .collection("videos")
        .doc(jobId)
        .set(
          {
            driveFileId: result.fileId,
            driveUrl: result.viewLink ?? result.url,
            downloadLink: result.downloadLink ?? result.url,
            driveFolderId: result.folderId ?? null,
            driveUploadedAt: result.createdAt,
            storageProvider: result.provider,
            cleanupStatus: deleteAt ? "pending" : "never",
            deleteAt,
          },
          { merge: true }
        );
      console.log(
        `[UploadAgent] Firestore updated for job ${jobId} | fileId: ${result.fileId}`
      );
    } catch (fsErr: any) {
      // Non-fatal — Drive upload succeeded
      console.warn(
        `[UploadAgent] Firestore update failed (non-fatal): ${fsErr.message}`
      );
    }

    return {
      status: "uploaded",
      driveFileId: result.fileId,
      driveUrl: result.viewLink ?? result.url,
      downloadLink: result.downloadLink ?? result.url,
      driveFolderId: result.folderId,
      uploadedAt: result.createdAt,
      provider: result.provider,
    };
  } catch (err: any) {
    console.error(`[UploadAgent] Upload failed for job ${jobId}:`, err.message);
    return { status: "failed", error: err.message };
  }
}
