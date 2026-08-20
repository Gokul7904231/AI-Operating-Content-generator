"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, AlertTriangle, RefreshCw, Layers, ShieldAlert, Cpu, Activity, Info, BarChart3, Database } from "lucide-react";
import { AdminGuard } from "@/lib/auth/guards";

const SimulationChart = dynamic(() => import("@/components/charts/SimulationChart"), { ssr: false });

// Mock event timelines
const mockEvents = [
  { time: "13:21:02", msg: "Workflow quiz.started with traceId e4c8_f2ff", status: "info" },
  { time: "13:21:04", msg: "Script.generated with provider groq (Llama-3.3)", status: "success" },
  { time: "13:21:05", msg: "Critic.completed evaluation rating: 8.4/10", status: "success" },
  { time: "13:21:07", msg: "Scene.generated broken into 3 JSON scenes", status: "success" },
  { time: "13:21:08", msg: "Voice.generated synthesis complete (voiceover.mp3)", status: "success" },
  { time: "13:21:10", msg: "Image.generated assets cached to data/temp", status: "success" },
  { time: "13:21:11", msg: "Render.completed video mp4 output verified", status: "success" },
  { time: "13:21:12", msg: "Storage.completed uploaded to Drive (22MB, SHA256 match)", status: "success" },
  { time: "13:21:14", msg: "Publisher.completed published to YouTube (unlisted)", status: "success" },
  { time: "13:21:15", msg: "Learning.updated optimization indexes written to DB", status: "success" },
];

export default function SimulationDashboard() {
  const [running, setRunning] = useState(true);
  const [chaosMode, setChaosMode] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [activeJob, setActiveJob] = useState("job_8432_e823");
  const [activeStation, setActiveStation] = useState(0); // 0 to 8 index mapping
  const [events, setEvents] = useState<typeof mockEvents>([]);
  const [queueMetrics, setQueueMetrics] = useState({ active: 2, retries: 0, dead: 0 });

  // Chart data
  const [chartData, setChartData] = useState([
    { name: "10:00", cost: 0.04, latency: 450 },
    { name: "11:00", cost: 0.08, latency: 410 },
    { name: "12:00", cost: 0.06, latency: 480 },
    { name: "13:00", cost: 0.12, latency: 390 },
  ]);

  const stations = [
    { id: "script", label: "Script AI" },
    { id: "critic", label: "Critic Review" },
    { id: "scene", label: "Scene Builder" },
    { id: "voice", label: "Voice synthesis" },
    { id: "image", label: "Visual Gen" },
    { id: "render", label: "FFmpeg render" },
    { id: "upload", label: "Storage Upload" },
    { id: "publish", label: "Publisher Post" },
    { id: "learning", label: "Learning Engine" },
  ];

  // Simulation loop
  useEffect(() => {
    // Initial fetch of backend state
    fetch("/api/simulation/control")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.state) {
          setRunning(!json.state.paused);
          setSpeed(json.state.speed);
          setChaosMode(json.state.injectFailure);
        }
      });
  }, []);

  const updateBackendState = async (patch: any) => {
    try {
      const res = await fetch("/api/simulation/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (json.success && json.state) {
        setRunning(!json.state.paused);
        setSpeed(json.state.speed);
        setChaosMode(json.state.injectFailure);
      }
    } catch {}
  };

  useEffect(() => {
    if (!running) return;

    const interval = setInterval(() => {
      setActiveStation((prev) => {
        const next = (prev + 1) % stations.length;
        if (next === 0) {
          // New job loop
          setEvents([mockEvents[0]]);
        } else {
          setEvents((e) => [...e, mockEvents[next]]);
        }
        return next;
      });
    }, 2500 / speed);

    return () => clearInterval(interval);
  }, [running, speed]);

  const injectChaos = async (type: string, failureKey: string) => {
    setChaosMode(type);
    await updateBackendState({ injectFailure: failureKey });
    
    setQueueMetrics((prev) => ({
      ...prev,
      retries: prev.retries + 1,
      active: prev.active + 1,
    }));
    setEvents((e) => [
      ...e,
      { time: "Now", msg: `Chaos Injected: ${type} simulation triggered!`, status: "error" },
    ]);
    
    setTimeout(async () => {
      setChaosMode(null);
      await updateBackendState({ injectFailure: null });
    }, 4000);
  };

  return (
    <AdminGuard>
    <div className="flex-1 p-6 overflow-y-auto bg-zinc-950 text-zinc-50 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header and Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
          <div>
            <h1 className="text-3xl font-extrabold font-display tracking-tight flex items-center gap-3">
              <Activity className="text-blue-400 w-8 h-8 animate-pulse" />
              AI Digital Factory OS Floor
            </h1>
            <p className="text-zinc-400 text-sm mt-1">
              Live visualization of active content generation streams, capability routing decisions, and queue telemetry.
            </p>
          </div>

          {/* Quick controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => updateBackendState({ paused: running })}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800/80 rounded-lg text-sm transition-all"
            >
              {running ? <Pause className="w-4 h-4 text-amber-400" /> : <Play className="w-4 h-4 text-emerald-400" />}
              {running ? "Pause Factory" : "Resume Factory"}
            </button>
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300">
              <span>Speed:</span>
              <select
                value={speed}
                onChange={(e) => updateBackendState({ speed: Number(e.target.value) })}
                className="bg-transparent border-0 font-bold focus:ring-0 cursor-pointer text-zinc-50"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="2">2.0x</option>
                <option value="4">4.0x</option>
              </select>
            </div>
          </div>
        </div>

        {/* 6-Panel Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PANEL 1: Factory Floor (Animates Packet Flow) */}
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Layers className="text-blue-400 w-5 h-5" />
              AI Factory Floor Flow Graph
            </h2>
            
            <div className="grid grid-cols-3 md:grid-cols-9 gap-3 relative py-8">
              {stations.map((st, idx) => {
                const isActive = idx === activeStation;
                const isCompleted = idx < activeStation;
                return (
                  <div key={st.id} className="flex flex-col items-center justify-center relative">
                    <motion.div
                      animate={{
                        scale: isActive ? 1.15 : 1,
                        borderColor: isActive ? "#3b82f6" : isCompleted ? "#10b981" : "#27272a",
                      }}
                      className={`w-14 h-14 rounded-xl border-2 flex items-center justify-center text-xs font-bold text-center ${
                        isActive ? "bg-blue-900/30 text-blue-400 shadow-lg shadow-blue-500/20" : isCompleted ? "bg-emerald-950/20 text-emerald-400" : "bg-zinc-950 text-zinc-500"
                      }`}
                    >
                      {st.id.slice(0, 3).toUpperCase()}
                    </motion.div>
                    <span className="text-[10px] mt-2 text-zinc-400 text-center select-none truncate w-full">{st.label}</span>
                    {idx < stations.length - 1 && (
                      <div className="hidden md:block absolute top-7 -right-5 w-4 h-0.5 bg-zinc-800" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Dependency health indicator */}
            <div className="border-t border-zinc-800 mt-6 pt-4 flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Database className="w-4 h-4 text-zinc-500" />
                Active Database: <strong className="text-zinc-200">queues.db (WAL)</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Uptime: 99.98%
              </span>
            </div>
          </div>

          {/* PANEL 2: Chaos Injection Control Slider */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 mb-2">
                <ShieldAlert className="text-rose-400 w-5 h-5" />
                Chaos Control Room
              </h2>
              <p className="text-zinc-400 text-xs mb-4">
                Test pipeline resilience under SRE failure metrics.
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => injectChaos("Drive Exceeded 403", "drive_403")}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-rose-900/60 rounded-lg text-left hover:bg-rose-950/10 transition-colors"
              >
                Drive 403 Access Denied
              </button>
              <button
                onClick={() => injectChaos("Groq 429 Limit", "groq_429")}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-rose-900/60 rounded-lg text-left hover:bg-rose-950/10 transition-colors"
              >
                AI Router Quota 429
              </button>
              <button
                onClick={() => injectChaos("SQLite DB Busy", "db_lock")}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-rose-900/60 rounded-lg text-left hover:bg-rose-950/10 transition-colors"
              >
                SQLite Locked Block
              </button>
              <button
                onClick={() => injectChaos("Renderer Crash", "render_crash")}
                className="p-2.5 bg-zinc-950 border border-zinc-800 hover:border-rose-900/60 rounded-lg text-left hover:bg-rose-950/10 transition-colors"
              >
                Subprocess Render Crash
              </button>
            </div>

            {chaosMode && (
              <div className="mt-4 p-2 bg-rose-950/40 border border-rose-800 text-rose-300 rounded text-center text-xs animate-bounce">
                Simulating Error: {chaosMode}
              </div>
            )}
          </div>

          {/* PANEL 3: Workflow Timeline Replay Feed */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <Layers className="text-emerald-400 w-5 h-5" />
              Live Feed: {activeJob}
            </h2>
            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-64 pr-2 font-mono text-[11px] text-zinc-300">
              <AnimatePresence>
                {events.map((ev, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-2 border-b border-zinc-800/40 pb-2"
                  >
                    <span className="text-zinc-500">{ev.time}</span>
                    <span className={ev.status === "error" ? "text-rose-400" : "text-zinc-200"}>{ev.msg}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* PANEL 4: Queues Telemetry Board */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Activity className="text-amber-400 w-5 h-5" />
              Queues Dashboard
            </h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-semibold">Active</span>
                <div className="text-xl font-bold text-blue-400 mt-1">{queueMetrics.active}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-semibold">Retries</span>
                <div className="text-xl font-bold text-amber-400 mt-1">{queueMetrics.retries}</div>
              </div>
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                <span className="text-zinc-500 text-[10px] uppercase font-semibold">Dead Letter</span>
                <div className="text-xl font-bold text-rose-500 mt-1">{queueMetrics.dead}</div>
              </div>
            </div>
            <div className="text-xs text-zinc-400 mt-4 leading-relaxed bg-zinc-950/50 p-3 border border-zinc-800/80 rounded-lg">
              Auto-recovery logic is active. If local thread execution crashes, jobs resume from SQLite state logs.
            </div>
          </div>

          {/* PANEL 5: Provider Observatory & Decision Inspector */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <Cpu className="text-purple-400 w-5 h-5" />
              Decision & Cost Inspector
            </h2>
            <div className="space-y-3.5 text-xs text-zinc-300">
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Provider Route</span>
                <span className="font-bold text-zinc-200">Groq (Primary) ➔ Google (Fallback)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Confidence</span>
                <span className="font-bold text-emerald-400">94% (High score prediction)</span>
              </div>
              <div className="flex justify-between border-b border-zinc-800/60 pb-2">
                <span className="text-zinc-500">Estimated Cost</span>
                <span className="font-mono text-zinc-200">${(0.0012).toFixed(4)}</span>
              </div>
            </div>
          </div>

          {/* PANEL 6: Learning & Cost Dashboard Charts */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <BarChart3 className="text-blue-400 w-5 h-5" />
              Cost & Latency Trends (Last 24h)
            </h2>
            <div className="w-full h-44">
              <SimulationChart data={chartData} />
            </div>
          </div>

        </div>

      </div>
    </div>
    </AdminGuard>
  );
}
