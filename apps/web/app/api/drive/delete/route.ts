/**
 * DELETE /api/drive/delete
 * Body: { fileId: string, jobId?: string }
 *
 * Moves a Drive file to trash (never permanent delete).
 * Optionally updates Firestore cleanupStatus if jobId is provided.
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { StorageRegistry } from "../../../../storage/storage-registry";
import { markCleaned } from "../../../../lib/drive-store";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { fileId, jobId } = body ?? {};

    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const provider = StorageRegistry.getProvider("google-drive");
    await provider.delete(String(fileId));

    // Update Firestore if jobId provided
    if (jobId) {
      try {
        await markCleaned(String(jobId));
      } catch (fsErr: any) {
        console.warn("[/api/drive/delete] Firestore update failed:", fsErr.message);
      }
    }

    return NextResponse.json({ success: true, fileId, trashed: true });
  } catch (err: any) {
    console.error("[/api/drive/delete]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
