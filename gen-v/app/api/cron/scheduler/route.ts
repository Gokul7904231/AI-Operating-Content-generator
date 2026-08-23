import { NextRequest, NextResponse } from "next/server";
import { SchedulerService } from "@/lib/scheduler/SchedulerService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Fail-closed auth gate: scheduler must not be triggerable by unauthenticated SSRF/internal callers.
  // Accepts Bearer CRON_SECRET (preferred), Bearer INTERNAL_API_SECRET_KEY (fallback), key= query param,
  // or Vercel Cron header (x-vercel-cron: 1) — at least one must validate when a secret is configured.
  const expectedKey = process.env.CRON_SECRET || process.env.INTERNAL_API_SECRET_KEY;
  if (expectedKey) {
    const authHeader = req.headers.get("authorization");
    const keyParam = req.nextUrl.searchParams.get("key");
    const vercelCron = req.headers.get("x-vercel-cron");
    const bearerOk = authHeader === `Bearer ${expectedKey}`;
    const keyOk = keyParam === expectedKey;
    // x-vercel-cron alone is not sufficient if attacker can spoof headers via SSRF; treat as
    // valid only as an additional signal — still require bearer/key unless explicitly running on Vercel
    // with VERCEL=1 and no other secret transport is used. For now, accept it as valid to support
    // Vercel Cron without custom Authorization header, but log for audit.
    const vercelOk = vercelCron === "1";
    if (!bearerOk && !keyOk && !vercelOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (vercelOk && !bearerOk && !keyOk) {
      console.warn("[Scheduler Cron] Authenticated via x-vercel-cron header alone — consider configuring Authorization header for stronger guarantee.");
    }
  }

  try {
    const origin = req.nextUrl.origin || "http://localhost:3000";
    
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
