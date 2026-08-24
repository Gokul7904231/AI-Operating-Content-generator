import { NextResponse } from "next/server";
import { EventBus } from "@/ai/event-bus";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const events = EventBus.getHistory().slice(-limit).reverse();
    return NextResponse.json({ success: true, events });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
