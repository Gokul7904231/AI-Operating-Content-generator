import { NextRequest, NextResponse } from "next/server";
import { verifyAuthAndRole } from "@/lib/auth/auth";
import { OverseerAgent } from "@/lib/overseer/agent";

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuthAndRole(request);

    const body = await request.json();
    const { message, mode, sessionContext } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ success: false, error: "Missing required parameter: message" }, { status: 400 });
    }

    const agentResult = await OverseerAgent.run(message, user, mode || "OPERATE", sessionContext);

    return NextResponse.json({
      success: true,
      data: agentResult,
    });
  } catch (err: any) {
    console.error("[API /overseer/chat POST] Error:", err.message);
    const status = err.status || err.name === "UnauthorizedError" ? 401 : err.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ success: false, error: err.message }, { status });
  }
}
