/**
 * Drive Store
 *
 * Firestore helpers for Google Drive metadata.
 * All Drive-related fields are written to the existing "videos" collection
 * using set({merge:true}) to avoid breaking existing documents.
 */

import { db } from "./firebase-admin";

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

export interface DriveMetadata {
  driveFileId: string;
  driveUrl: string;
  downloadLink: string;
  driveFolderId?: string | null;
  driveUploadedAt: string;
  storageProvider: string;
  cleanupStatus: "pending" | "cleaned" | "never";
  deleteAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Persist Google Drive upload metadata for a job.
 */
export async function setDriveMetadata(
  jobId: string,
  data: Partial<DriveMetadata>
): Promise<void> {
  await db
    .collection("videos")
    .doc(jobId)
    .set(data, { merge: true });
}

/**
 * Mark a job's drive file as cleaned (trashed/deleted).
 */
export async function markCleaned(jobId: string): Promise<void> {
  await db
    .collection("videos")
    .doc(jobId)
    .set({ cleanupStatus: "cleaned", cleanedAt: new Date().toISOString() }, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Read
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get Drive metadata for a specific job.
 */
export async function getDriveMetadata(
  jobId: string
): Promise<DriveMetadata | null> {
  const snap = await db.collection("videos").doc(jobId).get();
  if (!snap.exists) return null;
  const d = snap.data() as any;
  return {
    driveFileId: d?.driveFileId ?? "",
    driveUrl: d?.driveUrl ?? "",
    downloadLink: d?.downloadLink ?? "",
    driveFolderId: d?.driveFolderId ?? null,
    driveUploadedAt: d?.driveUploadedAt ?? "",
    storageProvider: d?.storageProvider ?? "",
    cleanupStatus: d?.cleanupStatus ?? "never",
    deleteAt: d?.deleteAt ?? null,
  };
}

/**
 * Get all jobs with pending cleanup (deleteAt <= now, status = "pending").
 */
export async function getPendingCleanup(): Promise<
  Array<{ jobId: string } & DriveMetadata>
> {
  const now = new Date().toISOString();

  try {
    const snap = await db
      .collection("videos")
      .where("cleanupStatus", "==", "pending")
      .where("deleteAt", "<=", now)
      .get();

    if (snap.empty) return [];

    return snap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        jobId: doc.id,
        driveFileId: d?.driveFileId ?? "",
        driveUrl: d?.driveUrl ?? "",
        downloadLink: d?.downloadLink ?? "",
        driveFolderId: d?.driveFolderId ?? null,
        driveUploadedAt: d?.driveUploadedAt ?? "",
        storageProvider: d?.storageProvider ?? "",
        cleanupStatus: "pending" as const,
        deleteAt: d?.deleteAt ?? null,
      };
    });
  } catch (err: any) {
    console.error("[DriveStore] getPendingCleanup failed:", err.message);
    return [];
  }
}

/**
 * List all videos that have Drive metadata (paginated).
 */
export async function listDriveVideos(limit = 50): Promise<
  Array<{ jobId: string } & Record<string, any>>
> {
  try {
    const snap = await db
      .collection("videos")
      .where("driveFileId", "!=", "")
      .orderBy("driveFileId")
      .orderBy("driveUploadedAt", "desc")
      .limit(limit)
      .get();

    if (snap.empty) return [];
    return snap.docs.map((doc) => ({ jobId: doc.id, ...doc.data() }));
  } catch (err: any) {
    // Firestore compound query may require index — fall back to simple list
    try {
      const snap = await db
        .collection("videos")
        .orderBy("driveUploadedAt", "desc")
        .limit(limit)
        .get();
      return snap.docs
        .map((doc) => ({ jobId: doc.id, ...doc.data() }))
        .filter((d: any) => !!d.driveFileId);
    } catch {
      return [];
    }
  }
}
