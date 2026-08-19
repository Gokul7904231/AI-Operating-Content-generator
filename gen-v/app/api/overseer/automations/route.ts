import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { OverseerAutomationStore } from "@/lib/overseer/automations/automation-store";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuthAndRole(request);
    const automations = OverseerAutomationStore.getAutomations(user.uid);
    return NextResponse.json({ success: true, automations });
  } catch (err: any) {
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthAndRole(request, "EDITOR");
    const body = await request.json();
    const { action, id, name, triggerType, prompt, enabled } = body;

    if (action === "toggle") {
      OverseerAutomationStore.toggleAutomation(user.uid, id, Boolean(enabled));
      return NextResponse.json({ success: true, message: "Automation updated." });
    }

    if (action === "delete") {
      OverseerAutomationStore.removeAutomation(user.uid, id);
      return NextResponse.json({ success: true, message: "Automation deleted." });
    }

    if (!name || !triggerType || !prompt) {
      return NextResponse.json({ success: false, error: "Missing required fields: name, triggerType, prompt" }, { status: 400 });
    }

    const created = OverseerAutomationStore.addAutomation(user.uid, {
      name,
      triggerType,
      prompt,
      enabled: true,
    });

    return NextResponse.json({ success: true, automation: created });
  } catch (err: any) {
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
