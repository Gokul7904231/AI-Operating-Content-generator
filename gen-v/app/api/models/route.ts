import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { AIDoctor } from "@/lib/core/AIDoctor";

export async function GET() {
  try {
    const passportFile = path.resolve(process.cwd(), "data", "model-passports.json");
    if (!fs.existsSync(passportFile)) {
      // Re-run diagnostics to generate if missing
      await AIDoctor.runDiagnosis();
    }
    
    const raw = fs.readFileSync(passportFile, "utf-8");
    const passports = JSON.parse(raw);
    return NextResponse.json({ success: true, models: passports });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
