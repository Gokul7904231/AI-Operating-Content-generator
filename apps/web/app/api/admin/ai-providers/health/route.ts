import { NextResponse } from "next/server";
import { providerRouter } from "@/lib/ai-provider";
import { verifySession } from "@/lib/auth/auth";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const adminSecret =
      process.env.INTERNAL_API_SECRET_KEY ||
      process.env.RENDER_WORKER_SECRET ||
      "";

    const authHeader = req.headers.get("Authorization") || "";
    const customHeader = req.headers.get("x-admin-secret") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    let isAuthorized = (bearer === adminSecret || customHeader === adminSecret) && Boolean(adminSecret);

    if (!isAuthorized) {
      try {
        const { user } = await verifySession(req);
        if (user && (user.role === "ADMIN" || user.role === "OWNER")) {
          isAuthorized = true;
        }
      } catch {}
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized. Admin credentials required." },
        { status: 403 }
      );
    }

    const healthReport = providerRouter.getHealthReport();
    const configuredOrder = providerRouter.getProviderOrder();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      order: configuredOrder,
      providers: healthReport,
    });
  } catch (err: any) {
    console.error("[API /api/admin/ai-providers/health] Error:", err);
    return NextResponse.json(
      { error: "Failed to retrieve provider health metrics." },
      { status: 500 }
    );
  }
}
