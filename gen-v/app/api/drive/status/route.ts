/**
 * GET /api/drive/status
 *
 * Returns Drive storage usage, provider health, and Firestore drive stats.
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { GoogleDriveProvider } from "../../../../storage/providers/google-drive";
import { db } from "../../../../lib/firebase-admin";

export async function GET() {
  try {
    const healthReport = await GoogleDriveProvider.healthCheck();

    // Count jobs with Drive metadata from Firestore
    let totalUploaded = 0;
    let pendingCleanup = 0;

    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const allDriveSnap = await db
        .collection("videos")
        .where("driveFileId", "!=", "")
        .limit(500)
        .get();
      totalUploaded = allDriveSnap.size;

      const pendingSnap = await db
        .collection("videos")
        .where("cleanupStatus", "==", "pending")
        .limit(500)
        .get();
      pendingCleanup = pendingSnap.size;
    } catch {
      // Firestore may require index — fail gracefully
    }

    // Format storage numbers
    const usedGB =
      healthReport.usedBytes > 0
        ? (healthReport.usedBytes / 1_073_741_824).toFixed(2)
        : null;
    const quotaGB =
      healthReport.quotaBytes > 0
        ? (healthReport.quotaBytes / 1_073_741_824).toFixed(2)
        : null;

    return NextResponse.json({
      success: true,
      provider: "google-drive",
      health: healthReport,
      stats: {
        totalUploaded,
        pendingCleanup,
        storageUsedGB: usedGB,
        storageQuotaGB: quotaGB,
      },
      telemetry: GoogleDriveProvider.getTelemetry(20),
    });
  } catch (err: any) {
    console.error("[/api/drive/status]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
