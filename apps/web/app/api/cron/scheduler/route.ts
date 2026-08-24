import { NextRequest, NextResponse } from "next/server";
import { SchedulerService } from "@/lib/scheduler/SchedulerService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Fail-closed auth gate: scheduler must not be triggerable without a valid secret.
  const expectedKey = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET_KEY;
  if (!expectedKey) {
    return NextResponse.json({ error: "Server misconfiguration: CRON_SECRET not set" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization");
  const keyParam = req.nextUrl.searchParams.get("key");
  const bearerOk = authHeader === `Bearer ${expectedKey}`;
  const keyOk = keyParam === expectedKey;
  // x-vercel-cron alone is never sufficient — require Bearer or key= even on Vercel.
  // Vercel Cron should be configured to send Authorization: Bearer <CRON_SECRET>.
  if (!bearerOk && !keyOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Do not trust Host-derived req.nextUrl.origin (SSRF via Host header).
    const canonicalOrigin =
      process.env.APP_ORIGIN ||
      process.env.CONTROL_PLANE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    const origin = canonicalOrigin.replace(/\/$/, "");
    
    // Atomically claim up to 5 due schedules
    const dueSchedules = await SchedulerService.claimDueSchedules(5);

    if (dueSchedules.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No due schedules found at this time.",
        claimedCount: 0,
      });
    }

    console.log(`[Scheduler Cron] Claimed ${dueSchedules.length} due schedule(s). Executing pipeline...`);

    // Execute in background
    for (const schedule of dueSchedules) {
      SchedulerService.executeSchedule(schedule, origin).catch((err) => {
        console.error(`[Scheduler Cron Execution Error for ${schedule.scheduleId}]:`, err.message);
      });
    }

    return NextResponse.json({
      success: true,
      message: `Triggered ${dueSchedules.length} due schedule(s).`,
      claimedCount: dueSchedules.length,
      scheduleIds: dueSchedules.map((s) => s.scheduleId),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Scheduler cron failed." }, { status: 500 });
  }
}
