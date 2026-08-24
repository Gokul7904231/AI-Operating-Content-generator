import { NextResponse } from "next/server";
import { B2StorageManager } from "../../../../lib/storage/b2-storage-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/storage/health
 * Returns Backblaze B2 storage fabric telemetry, permanent vs temp usage, 30-min expiration status, and storage pressure.
 */
export async function GET() {
  try {
    const telemetry = B2StorageManager.getTelemetry();

    return NextResponse.json({
      success: true,
      service: "Backblaze B2 Storage Fabric",
      telemetry,
      provenance: {
        source: "/api/storage/health",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/storage/health
 * Triggers manual or automated purge of expired 30-minute temporary renders.
 */
export async function POST() {
  try {
    const purgedCount = B2StorageManager.purgeExpiredTempRenders();
    const updatedTelemetry = B2StorageManager.getTelemetry();

    return NextResponse.json({
      success: true,
      purgedCount,
      telemetry: updatedTelemetry,
      provenance: {
        source: "/api/storage/health",
        action: "PURGE_EXPIRED_TEMP_RENDERS",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
