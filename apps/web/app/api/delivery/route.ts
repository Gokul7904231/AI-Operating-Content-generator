import { NextResponse } from "next/server";
import { verifySession } from "../../../lib/auth/auth";
import { DeliveryManager, DeliveryType } from "../../../lib/delivery/delivery-manager";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery
 * Returns delivery options and active delivery records for authenticated tenant.
 */
export async function GET(req: Request) {
  try {
    const { user } = await verifySession(req);

    return NextResponse.json({
      success: true,
      tenantId: user.uid,
      supportedDeliveryTypes: ["BROWSER_DOWNLOAD", "GOOGLE_DRIVE"],
      provenance: {
        source: "/api/delivery",
        measuredAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 401 });
  }
}

/**
 * POST /api/delivery
 * Initiates delivery (browser download or Google Drive export) with verification.
 */
export async function POST(req: Request) {
  try {
    const { user } = await verifySession(req);
    const body = await req.json();
    const { jobId, deliveryType = "BROWSER_DOWNLOAD", b2ObjectKey, simulateFailure = false } = body;

    if (!jobId || !b2ObjectKey) {
      return NextResponse.json({ error: "Missing jobId or b2ObjectKey" }, { status: 400 });
    }

    const record = DeliveryManager.createDeliveryRecord(
      jobId,
      user.uid,
      user.uid,
      deliveryType as DeliveryType,
      b2ObjectKey
    );

    if (deliveryType === "BROWSER_DOWNLOAD") {
      const downloadUrl = DeliveryManager.getSignedDownloadUrl(record.id, user.uid);
      return NextResponse.json({
        success: true,
        record: DeliveryManager.getRecord(record.id, user.uid),
        downloadUrl,
      });
    } else if (deliveryType === "GOOGLE_DRIVE") {
      const resultRecord = await DeliveryManager.exportToGoogleDrive(record.id, user.uid, simulateFailure);
      return NextResponse.json({
        success: resultRecord.status !== "DRIVE_UPLOAD_FAILED",
        record: resultRecord,
      });
    }

    return NextResponse.json({ error: "Unsupported delivery type" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
