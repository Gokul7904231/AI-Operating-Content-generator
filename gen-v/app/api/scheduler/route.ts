import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth/auth";
import { can } from "@/lib/auth/capability-policy";
import { SchedulerService } from "@/lib/scheduler/SchedulerService";
import { db } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user || !can(user, "SCHEDULING")) {
      return NextResponse.json(
        { error: "Automated scheduling is a Pro feature. Please upgrade your tier." },
        { status: 403 }
      );
    }

    const schedules = await SchedulerService.listSchedules(user.uid);
    return NextResponse.json({ success: true, schedules });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to list schedules." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user || !can(user, "SCHEDULING")) {
      return NextResponse.json(
        { error: "Automated scheduling is a Pro feature. Please upgrade your tier." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, engineId, quizMode, countryCode, topics, totalQuestions, time, timezone, frequency, deliveryTarget } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Schedule name is required." }, { status: 400 });
    }

    const created = await SchedulerService.createSchedule({
      ownerId: user.uid,
      userRole: user.role,
      name: name.trim(),
      engineId: engineId || "quiz",
      quizMode: quizMode || "geo",
      countryCode: countryCode || "IN",
      topics: topics || [],
      totalQuestions: totalQuestions || 6,
      time: time || "20:00",
      timezone: timezone || "Asia/Kolkata",
      frequency: frequency || "DAILY",
      deliveryTarget: deliveryTarget || "GOOGLE_DRIVE",
      enabled: true,
    });

    return NextResponse.json({ success: true, schedule: created });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create schedule." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user } = await verifySession(req);
    if (!user || !can(user, "SCHEDULING")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const scheduleId = searchParams.get("id");
    if (!scheduleId) {
      return NextResponse.json({ error: "Missing scheduleId" }, { status: 400 });
    }

    const doc = await db.collection("schedules").doc(scheduleId).get();
    if (!doc.exists || (doc.data()?.ownerId !== user.uid && user.role !== "ADMIN" && user.role !== "OWNER")) {
      return NextResponse.json({ error: "Schedule not found or unauthorized." }, { status: 404 });
    }

    await db.collection("schedules").doc(scheduleId).delete();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete schedule." }, { status: 500 });
  }
}
