import { NextRequest } from "next/server";
import { getFactoryOSController } from "@/lib/overseer/factoryos-runtime";
import type { OverseerPresenceEnvelope } from "@/factoryos/core/overseer/presence";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const controller = await getFactoryOSController();
    const presenceEngine = controller.overseer.getPresenceEngine();

    // Check for Last-Event-ID for sequence reconnection replay
    const lastEventIdHeader = request.headers.get("last-event-id");
    const lastEventIdQuery = request.nextUrl.searchParams.get("lastEventId");
    const lastSeq = parseInt(lastEventIdHeader || lastEventIdQuery || "0", 10);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(streamController) {
        let isClosed = false;

        const sendEvent = (event: string, data: any, id?: number) => {
          if (isClosed) return;
          try {
            let msg = "";
            if (id !== undefined) {
              msg += `id: ${id}\n`;
            }
            msg += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            streamController.enqueue(encoder.encode(msg));
          } catch {
            isClosed = true;
          }
        };

        // 1. Send initial presence snapshot & replay missed events
        const { current, replay } = presenceEngine.getSnapshot(isNaN(lastSeq) ? 0 : lastSeq);
        sendEvent("snapshot", current, current.sequence);

        if (replay.length > 0) {
          for (const item of replay) {
            sendEvent("presence", item, item.sequence);
          }
        }

        // 2. Subscribe to live presence events from DurableEventBus
        const unsubscribe = controller.eventBus.subscribe("OVERSEER_PRESENCE_STATE", (event: any) => {
          if (isClosed) return;
          const envelope: OverseerPresenceEnvelope = event?.payload || event;
          sendEvent("presence", envelope, envelope.sequence);
        });

        // 3. Keepalive heartbeat interval (every 15s)
        const keepaliveTimer = setInterval(() => {
          if (isClosed) {
            clearInterval(keepaliveTimer);
            return;
          }
          try {
            streamController.enqueue(encoder.encode(": keepalive\n\n"));
          } catch {
            isClosed = true;
            clearInterval(keepaliveTimer);
          }
        }, 15000);

        // Cleanup when client disconnects
        request.signal.addEventListener("abort", () => {
          isClosed = true;
          clearInterval(keepaliveTimer);
          try {
            streamController.close();
          } catch {}
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err: any) {
    console.error("[API /overseer/presence/events] Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
