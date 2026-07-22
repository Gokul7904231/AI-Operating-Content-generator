import { create } from "zustand";

export interface VideoJob {
  id: string;
  jobId: string;
  topic: string;
  status: "queued" | "processing" | "completed" | "failed" | "purged" | "dead";
  createdAt: string;
  renderDurationSeconds?: number;
  videoUrl?: string | null;
  telemetry?: any;
}

export interface FactoryState {
  system: {
    cpuUsagePct: number;
    memUsagePct: number;
    diskUsagePct: number;
    healthPct: number;
    hardware: any;
  };
  jobsSummary: {
    total: number;
    completed: number;
    failed: number;
    running: number;
    queued: number;
  };
  jobs: VideoJob[];
  queues: {
    storageQueue: any[];
    storageDead: any[];
    publisherQueue: any[];
    publisherDead: any[];
  };
  activeProviders: any[];
  activeEngines: string[];
  events: any[];
  isLoading: boolean;
  sseConnected: boolean;
  error: string | null;
  fetchState: () => Promise<void>;
  initSSE: () => void;
}

export const useFactoryStore = create<FactoryState>((set, get) => {
  let sseSource: EventSource | null = null;

  return {
    system: {
      cpuUsagePct: 0,
      memUsagePct: 0,
      diskUsagePct: 0,
      healthPct: 100,
      hardware: null,
    },
    jobsSummary: {
      total: 0,
      completed: 0,
      failed: 0,
      running: 0,
      queued: 0,
    },
    jobs: [],
    queues: {
      storageQueue: [],
      storageDead: [],
      publisherQueue: [],
      publisherDead: [],
    },
    activeProviders: [],
    activeEngines: [],
    events: [],
    isLoading: true,
    sseConnected: false,
    error: null,

    fetchState: async () => {
      try {
        const res = await fetch("/api/factory-state");
        if (!res.ok) throw new Error("Failed to load factory state");
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to parse state");
        
        set({
          system: data.system,
          jobsSummary: data.jobsSummary,
          jobs: data.jobs,
          queues: data.queues,
          activeProviders: data.activeProviders,
          activeEngines: data.activeEngines,
          events: data.events,
          isLoading: false,
          error: null,
        });
      } catch (err: any) {
        set({ error: err.message, isLoading: false });
      }
    },

    initSSE: () => {
      if (typeof window === "undefined" || get().sseConnected) return;

      if (sseSource) {
        sseSource.close();
      }

      sseSource = new EventSource("/api/factory-state/sse");
      set({ sseConnected: true });

      sseSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          set({
            system: data.system,
            jobsSummary: data.jobsSummary,
            jobs: data.jobs,
            queues: data.queues,
            activeProviders: data.activeProviders,
            activeEngines: data.activeEngines,
            events: data.events,
            isLoading: false,
            error: null,
          });
        } catch (e: any) {
          console.warn("[SSE JSON Parse Error]:", e.message);
        }
      };

      sseSource.onerror = (err) => {
        console.warn("[SSE Connection Error], falling back to fetchState:", err);
        if (sseSource) {
          sseSource.close();
        }
        set({ sseConnected: false });
        // Fallback polling
        get().fetchState();
      };
    },
  };
});
