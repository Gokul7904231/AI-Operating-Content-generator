/**
 * GET /api/sre/status
 * SSE stream of live audit progress events.
 * Client connects and receives real-time phase updates.
 */
import { NextRequest } from "next/server";
import { SREAuditEngine } from "@/lib/sre/SREAuditEngine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch {}
      };

      send(JSON.stringify({
        type: "connected",
        message: "ShortFactory SRE Live Feed connected",
        isRunning: SREAuditEngine.isAuditRunning,
        timestamp: new Date().toISOString(),
      }));

      // Subscribe to audit progress
      const unsub = SREAuditEngine.subscribeToProgress((event) => {
        send(JSON.stringify(event));
        if (event.type === "audit_complete") {
          setTimeout(() => { try { controller.close(); } catch {} }, 1000);
        }
      });

      // Cleanup on disconnect
      req.signal.addEventListener("abort", () => {
        unsub();
        try { controller.close(); } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
