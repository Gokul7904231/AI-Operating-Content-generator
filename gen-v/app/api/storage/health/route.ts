/**
 * GET /api/storage/health
 *
 * Returns health reports for all registered storage providers.
 * Shows: Drive Reachable, Credentials OK, Folder Exists, Upload Permission,
 *        Remaining Storage, Latency.
 */
import { NextResponse } from "next/server";
import "../../../../storage/index";
import { StorageRegistry } from "../../../../storage/storage-registry";

export async function GET() {
  try {
    const providers = StorageRegistry.getAllProviders();

    const reports = await Promise.allSettled(
      providers.map(async (p) => {
        try {
          return await p.healthCheck();
        } catch (err: any) {
          return {
            provider: p.id,
            state: "OFFLINE" as const,
            reachable: false,
            credentialsOk: false,
            folderExists: false,
            uploadPermission: false,
            latencyMs: 0,
            usedBytes: -1,
            quotaBytes: -1,
            checkedAt: new Date().toISOString(),
            error: err.message,
          };
        }
      })
    );

    const results = reports.map((r) =>
      r.status === "fulfilled" ? r.value : { error: "Health check threw" }
    );

    const allHealthy = results.every((r: any) => r.state === "ONLINE");

    return NextResponse.json({
      success: true,
      healthy: allHealthy,
      providers: results,
      checkedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[/api/storage/health]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
