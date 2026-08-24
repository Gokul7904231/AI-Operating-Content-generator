/**
 * GET /api/storage/analytics
 *
 * Returns a full analytics snapshot:
 * - Per-provider health summaries (Drive, Cloudinary)
 * - Today's upload/failure/deletion counts
 * - All-time totals from Firestore
 * - Current upload queue status
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import "../../../../publishing/index";
import { StorageAnalytics } from "../../../../storage/analytics";

export async function GET() {
  try {
    const snapshot = await StorageAnalytics.getSnapshot();
    return NextResponse.json({ success: true, ...snapshot });
  } catch (err: any) {
    console.error("[/api/storage/analytics]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
