/**
 * GET /api/sre/report — Returns the latest SRE audit report
 * GET /api/sre/history?provider=gemini&hours=24 — Returns historical health snapshots
 */
import { NextRequest, NextResponse } from "next/server";
import { SREAuditEngine } from "@/lib/sre/SREAuditEngine";
import { HistoricalStore } from "@/lib/sre/HistoricalStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "report";
  const provider = searchParams.get("provider");
  const hours = parseInt(searchParams.get("hours") || "24", 10);

  if (type === "history") {
    if (provider) {
      return NextResponse.json({
        success: true,
        providerId: provider,
        sparkline: HistoricalStore.latencySparkline(provider),
        lastHour: HistoricalStore.getLastHour(provider),
        avgLatency1h: HistoricalStore.avgLatency(provider, 1),
        avgLatency24h: HistoricalStore.avgLatency(provider, 24),
        uptime24h: HistoricalStore.uptimePct(provider, 24),
        anomalies: HistoricalStore.detectAnomalies(provider),
        snapshots: HistoricalStore.getForProvider(provider, Date.now() - hours * 3600_000),
      });
    }
    return NextResponse.json({ success: true, all: HistoricalStore.getAll().slice(-200) });
  }

  const report = await SREAuditEngine.getLatestReport();
  if (!report) {
    return NextResponse.json(
      { success: false, error: "No report available. POST /api/sre/audit to run an audit." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    isRunning: SREAuditEngine.isAuditRunning,
    report,
  });
}
