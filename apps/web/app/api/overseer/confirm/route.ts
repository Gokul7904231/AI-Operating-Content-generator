import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { OverseerToolRegistry } from "@/lib/overseer/tool-registry";
import { OverseerAudit } from "@/lib/overseer/audit";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthAndRole(request, "EDITOR"); // Write actions require EDITOR or higher

    const body = await request.json();
    const { confirmationId, toolId, action, payload } = body;

    if (!toolId || !action) {
      return NextResponse.json({ success: false, error: "Missing required parameters: toolId, action" }, { status: 400 });
    }

    if (action === "CANCEL") {
      await OverseerAudit.logAction({
        userId: user.uid,
        role: user.role,
        toolId,
        toolName: toolId,
        riskLevel: "HIGH",
        action: "CONFIRMATION_CANCELLED",
        confirmationStatus: "CANCELLED",
        result: "BLOCKED",
      });

      return NextResponse.json({
        success: true,
        actionResult: { status: "CANCELLED", message: "Action request cancelled by user." },
      });
    }

    // Execute Confirmed Tool
    const tool = OverseerToolRegistry.getTool(toolId);
    if (!tool) {
      return NextResponse.json({ success: false, error: `Tool "${toolId}" not found.` }, { status: 404 });
    }

    const executionResult = await tool.handler(payload || {}, { user: user as any, mode: "OPERATE" });

    await OverseerAudit.logAction({
      userId: user.uid,
      role: user.role,
      toolId,
      toolName: tool.name,
      riskLevel: tool.riskLevel,
      action: "CONFIRMATION_EXECUTED",
      confirmationStatus: "CONFIRMED",
      result: "SUCCESS",
    });

    return NextResponse.json({
      success: true,
      actionResult: executionResult,
    });
  } catch (err: any) {
    console.error("[API /overseer/confirm POST] Error:", err.message);
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
