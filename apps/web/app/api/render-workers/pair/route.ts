import { NextRequest, NextResponse } from "next/server";
import { WorkerPoolRegistry } from "../../../../lib/rendering/WorkerPoolRegistry";
import crypto from "crypto";

// Keep a map of active pairing codes in memory (in-process)
export const activePairingCodes = new Map<string, { expiresAt: Date; tenantId: string }>();

export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Empty body is expected for browser generation requests
    }

    const { pairingCode, name, endpoint, capabilities } = body;

    // 1. Browser Request: Generate new pairing code
    if (!pairingCode) {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      const randPart1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const randPart2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
      const generatedCode = `FOS-${randPart1}-${randPart2}`;
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

      activePairingCodes.set(generatedCode, { expiresAt, tenantId: "tenant_default" });

      return NextResponse.json({
        success: true,
        pairingCode: generatedCode,
        expiresAt: expiresAt.toISOString(),
      });
    }

    // 2. Worker Agent Request: Use pairing code to register/pair
    const record = activePairingCodes.get(pairingCode);
    if (!record) {
      return NextResponse.json({ success: false, error: "Invalid pairing code" }, { status: 400 });
    }

    if (new Date() > record.expiresAt) {
      activePairingCodes.delete(pairingCode);
      return NextResponse.json({ success: false, error: "Pairing code has expired" }, { status: 400 });
    }

    // Remove code so it cannot be reused
    activePairingCodes.delete(pairingCode);

    const workerId = `byor-${crypto.randomBytes(4).toString("hex")}`;
    const token = crypto.randomBytes(16).toString("hex");

    // Register worker in registry
    WorkerPoolRegistry.registerWorker({
      workerId,
      vendor: "byor",
      accessTier: "USER_OWNED",
      tenantId: record.tenantId,
      name: name || `BYOR Worker ${workerId.slice(-4)}`,
      endpoint: endpoint || "http://localhost:8000",
      tokenHash: token,
      state: "READY",
      capabilities: {
        vendor: "byor",
        accessTier: "USER_OWNED",
        architecture: capabilities?.architecture || "x86_64",
        vCPU: capabilities?.vCPU || 4,
        memoryMb: capabilities?.memoryMb || 8192,
        ffmpegVersion: capabilities?.ffmpegVersion || "6.1",
        supportsGpu: capabilities?.supportsGpu || false,
        maxConcurrentRenders: capabilities?.maxConcurrentRenders || 1,
      },
      telemetry: {
        cpuUtilizationPct: 0,
        ramUtilizationPct: 0,
        activeRenders: 0,
        tempStorageFreeMb: 10240,
        b2Connectivity: true,
        lastHeartbeatTimestamp: Date.now(),
      },
      lastHeartbeat: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      workerId,
      token,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
