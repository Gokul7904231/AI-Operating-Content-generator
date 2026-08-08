# ⚡ Real-Time State Lifecycle & Synchronization — FactoryOS v1

This document specifies the real-time state management architecture in `gen-v`, combining **Zustand**, **Server-Sent Events (SSE)**, **HTTP Polling Fallbacks**, and **React State**.

---

## 1. 🌊 State Architecture & Event Synchronization

```mermaid
flowchart TD
    subgraph Server_State ["Backend State Engines"]
        MetricsDB[(MetricsDB - SQLite)]
        Firestore[(Firestore DB)]
        EventBus[EventBus Real-Time Stream]
    end

    subgraph Transport_Layer ["Transport Channels"]
        SSEEndpoint[/api/factory-state/sse]
        RESTEndpoint[/api/factory-state]
    end

    subgraph Store_Layer ["Client Zustand Store"]
        FactoryStore[useFactoryStore]
        OSStore[useOSStore]
    end

    subgraph UI_Components ["Control Center Views"]
        MissionControl[/dashboard Dashboard]
        LiveFeed[LiveEventFeed Component]
        JobsList[/dashboard/jobs Table]
        DriveInspector[/media/drive Outbox View]
    end

    %% State flow
    MetricsDB & Firestore & EventBus --> SSEEndpoint & RESTEndpoint
    SSEEndpoint -->|Real-Time Push| FactoryStore
    RESTEndpoint -->|Initial Fetch / Fallback| FactoryStore
    FactoryStore --> MissionControl & LiveFeed & JobsList & DriveInspector
```

---

## 2. 🛡️ Fault Tolerance & SSE Reconnection Protocol

1. **Initial Mount**: `useFactoryStore.fetchState()` performs an immediate HTTP `GET /api/factory-state` to hydrate system metrics, active jobs summary, queue states, and recent event logs.
2. **SSE Connection**: `useFactoryStore.initSSE()` establishes a persistent `EventSource("/api/factory-state/sse")` connection.
3. **Event Stream Reception**: Incoming events (`system.metrics`, `job.status.changed`, `storage.upload.completed`) update the store incrementally.
4. **Reconnection & Fallback**: If the SSE stream disconnects, the store automatically falls back to periodic HTTP polling every 5 seconds until the EventSource reconnects.
