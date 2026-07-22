/**
 * POST /api/sre/audit
 * Starts a full SRE audit. Returns audit ID immediately.
 * Optionally includes stress test via ?stress=true
 */
import { NextRequest, NextResponse } from "next/server";
import { SREAuditEngine } from "@/lib/sre/SREAuditEngine";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min timeout

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const includeStress = searchParams.get("stress") === "true";

  if (SREAuditEngine.isAuditRunning) {
    return NextResponse.json({ success: false, error: "Audit already in progress" }, { status: 409 });
  }

  // Start audit in background — don't await
  SREAuditEngine.runFullAudit(includeStress).catch((err) => {
    console.error("[/api/sre/audit] Audit error:", err.message);
  });

  return NextResponse.json({
    success: true,
    message: "SRE Audit started",
    stressTest: includeStress,
    statusUrl: "/api/sre/status",
    reportUrl: "/api/sre/report",
  });
}

export async function GET() {
  const report = await SREAuditEngine.getLatestReport();
  if (!report) {
    return NextResponse.json({ success: false, error: "No audit report found. Run POST /api/sre/audit first." }, { status: 404 });
  }
  return NextResponse.json({ success: true, isRunning: SREAuditEngine.isAuditRunning, report });
}
