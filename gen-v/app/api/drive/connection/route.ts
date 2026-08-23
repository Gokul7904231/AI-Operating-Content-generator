import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { DriveConnectionManager } from "@/lib/drive/DriveConnectionManager";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await DriveConnectionManager.getUserDriveStatus(user.uid, user.role);
    return NextResponse.json({ success: true, connection: status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch Drive status." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await DriveConnectionManager.disconnectUserDrive(user.uid);
    return NextResponse.json({ success: true, message: "Disconnected successfully." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to disconnect Drive." }, { status: 500 });
  }
}
