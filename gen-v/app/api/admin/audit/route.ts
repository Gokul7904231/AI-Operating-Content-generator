import { NextResponse } from "next/server";
import { AIDoctor } from "@/lib/core/AIDoctor";

export async function GET() {
  try {
    const report = await AIDoctor.runDiagnosis();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
