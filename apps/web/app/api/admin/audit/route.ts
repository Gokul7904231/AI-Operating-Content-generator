import { NextResponse } from "next/server";
import { AIDoctor } from "../../../../lib/core/AIDoctor";
import { verifyAuthAndRole } from "../../../../lib/auth/auth";

export async function GET(req: Request) {
  try {
    await verifyAuthAndRole(req, "ADMIN");
    const report = await AIDoctor.runDiagnosis();
    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    const isForbidden = err.message?.includes("Forbidden") || err.message?.includes("Role");
    const status = isForbidden ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
