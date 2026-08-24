"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Activity, Filter, Search, Download, Pause, Play } from "lucide-react";

interface BusEvent {
  id: string;
  type: string;
  jobId?: string;
  traceId?: string;
  payload: Record<string, any>;
  timestamp: string;
}

const EVENT_COLORS: Record<string, string> = {
  "workflow.started": "text-blue-400 bg-blue-500/10 border-blue-500/20",
  "workflow.completed": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  "workflow.failed": "text-red-400 bg-red-500/10 border-red-500/20",
  "step.completed": "text-teal-400 bg-teal-500/10 border-teal-500/20",
  "job.approval_required": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "render.completed": "text-purple-400 bg-purple-500/10 border-purple-500/20",
  default: "text-zinc-400 bg-zinc-800/50 border-zinc-700/50",
};

function EventRow({ event }: { event: BusEvent }) {
  const [expanded, setExpanded] = useState(false);
  const style = EVENT_COLORS[event.type] ?? EVENT_COLORS.default;

  return (
    <div className={`rounded-lg border p-3 cursor-pointer hover:opacity-90 transition-opacity ${style}`} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
          <span className="text-xs font-mono font-semibold truncate">{event.type}</span>
          {event.jobId && (
            <span className="text-[10px] font-mono opacity-60 truncate">{event.jobId.slice(-12)}</span>
          )}
        </div>
        <span className="text-[10px] opacity-50 shrink-0 font-mono">
          {new Date(event.timestamp).toLocaleTimeString()}
        </span>
      </div>
      {expanded && (
        <pre className="mt-3 text-[10px] font-mono bg-zinc-950/50 rounded p-3 overflow-x-auto whitespace-pre-wrap break-all opacity-80">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents] = useState<BusEvent[]>([]);
  const [filter, setFilter] = useState("");
  const [paused, setPaused] = useState(false);
  const [eventType, setEventType] = useState("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchEvents = useCallback(async () => {
    if (paused) return;
    try {
      const r = await fetch("/api/logs/events?limit=50");
      if (!r.ok) return;
      const data = await r.json();
      setEvents(data.events ?? []);
    } catch {}
  }, [paused]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const allTypes = [...new Set(events.map((e) => e.type))];
  const filtered = events.filter((e) => {
    const matchType = eventType === "all" || e.type === eventType;
    const matchSearch = !filter || e.type.includes(filter) || e.jobId?.includes(filter) || JSON.stringify(e.payload).includes(filter);
    return matchType && matchSearch;
  });

  return (
    <div className="space-y-4 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Event Bus Monitor</h1>
          <p className="text-sm text-zinc-500 mt-1">Live stream of all EventBus events with trace ID filtering and payload inspection</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaused((p) => !p)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${paused ? "border-amber-600/50 bg-amber-600/10 text-amber-400 hover:bg-amber-600/20" : "border-emerald-600/50 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20"}`}
          >
            {paused ? <><Play className="w-3 h-3" /> Resume</> : <><Pause className="w-3 h-3" /> Pause</>}
          </button>
          <button onClick={() => setEvents([])} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-400 text-xs hover:bg-zinc-700 transition-colors">
            Clear
          </button>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
          <input
            type="text"
            placeholder="Filter by event type, job ID, or payload…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-900 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600"
        >
          <option value="all">All Types</option>
          {allTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div className="flex items-center gap-3 text-[11px] text-zinc-600">
        <span className={`flex items-center gap-1.5 ${paused ? "text-amber-500" : "text-emerald-500"}`}>
          <span className={`w-1.5 h-1.5 rounded-full bg-current ${paused ? "" : "animate-pulse"}`} />
          {paused ? "Paused" : "Live"}
        </span>
        <span>{filtered.length} events</span>
        {filter && <span>filtered from {events.length} total</span>}
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto terminal-scroll">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center rounded-xl border border-dashed border-zinc-800">
            <Activity className="w-8 h-8 text-zinc-700 mb-2" />
            <p className="text-zinc-500 text-sm">{events.length === 0 ? "Waiting for events…" : "No events match your filter"}</p>
          </div>
        ) : (
          filtered.map((event) => <EventRow key={event.id} event={event} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
