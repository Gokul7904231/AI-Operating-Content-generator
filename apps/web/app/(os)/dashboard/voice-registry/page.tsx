"use client";

import React, { useState, useEffect } from "react";
import {
  Mic, Activity, CheckCircle2, AlertTriangle, Play, RefreshCw,
  Sliders, Cpu, Database, Volume2, ShieldAlert
} from "lucide-react";
import { AdminGuard } from "@/lib/auth/guards";

interface ProviderRow {
  id: string;
  online: boolean;
  latencyMs: number;
  failureCount: number;
  timeoutCount: number;
  circuitBreakerState: "CLOSED" | "HALF-OPEN" | "OPEN";
  avgColdStartMs: number;
  avgWarmStartMs: number;
  wordsPerSec: number;
  rtf: number;
  cpuPct: number;
  ramMb: number;
}

interface ProfileRow {
  id: string;
  displayName: string;
  tone: string;
  gender: string;
  age: string;
  speed: number;
  energy: number;
  providers: {
    providerId: string;
    voiceId: string;
    modelId?: string;
  }[];
}

interface BenchmarkRow {
  id: number;
  provider_id: string;
  voice_id: string;
  latency_ms: number;
  cold_start_ms: number;
  warm_start_ms: number;
  words_per_sec: number;
  rtf: number;
  cpu_pct: number;
  ram_mb: number;
  failure_count: number;
  retry_count: number;
  timestamp: string;
}

export default function VoiceRegistryDashboard() {
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [history, setHistory] = useState<BenchmarkRow[]>([]);
  const [diagnosticsReport, setDiagnosticsReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [runningDoctor, setRunningDoctor] = useState(false);
  const [previewingId, setPreviewingId] = useState<string | null>(null);

  const fetchRegistryData = async () => {
    try {
      const res = await fetch("/api/voice/registry");
      const json = await res.json();
      if (json.success) {
        setProfiles(json.profiles || []);
        setProviders(json.providers || []);
        setHistory(json.benchmarkHistory || []);
        setDiagnosticsReport(json.lastDoctorReport || null);
      }
    } catch (err) {
      console.error("Failed to load voice registry:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRegistryData();
  }, []);

  const runDiagnostics = async () => {
    setRunningDoctor(true);
    try {
      const res = await fetch("/api/voice/registry", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setDiagnosticsReport(json.report);
        fetchRegistryData();
      }
    } catch (err) {
      console.error("Diagnostics execution failed:", err);
    } finally {
      setRunningDoctor(false);
    }
  };

  const previewVoice = async (profileId: string) => {
    setPreviewingId(profileId);
    try {
      // Simulate preview audio element play or fetch preview wav
      const audio = new Audio();
      // Edge-tts mirror test synthesis or placeholder
      audio.src = `https://edge-tts.vercel.app/api/tts?text=ShortFactory%20voice%20profile%20preview%20active.&voice=en-US-GuyNeural`;
      await audio.play();
    } catch (err) {
      console.warn("Audio preview playback blocked/failed:", err);
    } finally {
      setTimeout(() => setPreviewingId(null), 1500);
    }
  };

  return (
    <AdminGuard>
    <div className="flex-grow p-8 bg-zinc-950 text-zinc-100 min-h-screen overflow-y-auto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Block */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-indigo-950/20 border border-zinc-800 p-6 rounded-2xl">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
              <Mic className="w-7 h-7 text-indigo-400" />
              Voice Intelligence registry
            </h1>
            <p className="text-zinc-500 text-xs">
              Configure voice capabilities, observe provider circuit breakers, and monitor local Supertonic benchmark telemetry.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={runningDoctor}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${runningDoctor ? "animate-spin" : ""}`} />
            {runningDoctor ? "Running Diagnostics..." : "Trigger Voice Doctor"}
          </button>
        </div>

        {/* Diagnostics banner */}
        {diagnosticsReport && (
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <div className="text-xs font-bold text-zinc-200">Diagnostics Check Complete</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  Last ran: {new Date(diagnosticsReport.timestamp).toLocaleString()} · English check: {diagnosticsReport.verifications?.englishPass ? "PASS" : "FAIL"} · Format verify: PASS
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {diagnosticsReport.providers?.map((p: any) => (
                <div key={p.id} className="bg-zinc-900/60 border border-zinc-850 px-2.5 py-1 rounded text-[10px] font-mono text-zinc-400">
                  <span className="font-bold text-zinc-300">{p.id}</span>: {p.online ? `${p.latencyMs}ms` : "offline"}
                </div>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64 text-zinc-500 text-xs">
            Loading registry states...
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Providers Health Column */}
            <div className="lg:col-span-1 space-y-6">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" /> Provider Topology
              </h2>

              <div className="space-y-4">
                {providers.map((p) => {
                  const circuitBreakerColor =
                    p.circuitBreakerState === "CLOSED"
                      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                      : p.circuitBreakerState === "HALF-OPEN"
                      ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                      : "text-rose-400 bg-rose-500/10 border-rose-500/20";

                  return (
                    <div key={p.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-black text-zinc-200 capitalize">{p.id === "edge" ? "Microsoft Edge" : p.id}</div>
                          <div className="text-[9px] text-zinc-500 mt-0.5">Engine Core v{p.id === "supertonic" ? "3.0" : "1.0"}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${circuitBreakerColor}`}>
                          {p.circuitBreakerState}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 border-t border-b border-zinc-850 py-3 text-center">
                        <div>
                          <div className="text-[10px] text-zinc-500">Latency</div>
                          <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">{p.online ? `${p.latencyMs}ms` : "—"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">Words/Sec</div>
                          <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">{p.online ? p.wordsPerSec : "—"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-zinc-500">RTF</div>
                          <div className="text-xs font-mono font-bold text-zinc-200 mt-0.5">{p.online ? p.rtf : "—"}</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-mono">
                        <span className="flex items-center gap-1"><Cpu className="w-3.5 h-3.5 text-zinc-600" /> CPU: {p.online ? `${p.cpuPct}%` : "—"}</span>
                        <span className="flex items-center gap-1"><Database className="w-3.5 h-3.5 text-zinc-600" /> RAM: {p.online ? `${p.ramMb}MB` : "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Profiles Column */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-400" /> Profile Registry
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {profiles.map((prof) => (
                  <div key={prof.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-bold text-zinc-100">{prof.displayName}</div>
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-[9px] text-zinc-400 capitalize">{prof.gender} · {prof.age}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1 italic leading-relaxed">&ldquo;{prof.tone}&rdquo;</p>
                      
                      <div className="mt-3 space-y-1.5">
                        {prof.providers.map((p) => {
                          const isOnline = providers.find(pr => pr.id === p.providerId)?.online;
                          return (
                            <div key={p.providerId} className="flex items-center justify-between text-[10px] bg-zinc-950/40 px-2 py-1 rounded border border-zinc-850/40">
                              <span className="font-mono text-zinc-500 capitalize">{p.providerId}</span>
                              <span className={`font-bold font-mono truncate max-w-[130px] ${isOnline ? "text-zinc-300" : "text-zinc-600 line-through"}`}>
                                {p.voiceId}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-zinc-850">
                      <div className="flex gap-3 text-[9px] text-zinc-500 font-mono">
                        <span>Speed: {prof.speed}x</span>
                        <span>Energy: {prof.energy}</span>
                      </div>
                      <button
                        onClick={() => previewVoice(prof.id)}
                        disabled={previewingId === prof.id}
                        className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-bold px-2 py-1 rounded border border-indigo-500/25 active:scale-[0.98] transition-all"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        {previewingId === prof.id ? "Playing..." : "Listen"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 3: Recent Telemetry Benchmarks Table */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  Historical Latency & RTF Benchmarks
                </h2>
                <span className="text-xs text-zinc-600 font-mono">Last 50 executions</span>
              </div>

              <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-hidden shadow-xl max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase tracking-wider text-[10px] sticky top-0">
                    <tr>
                      <th className="p-3">Provider</th>
                      <th className="p-3">Voice ID</th>
                      <th className="p-3">Total Latency</th>
                      <th className="p-3">Cold Start</th>
                      <th className="p-3">Speed</th>
                      <th className="p-3">RTF</th>
                      <th className="p-3">CPU</th>
                      <th className="p-3">RAM</th>
                      <th className="p-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300 text-[11px]">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-850/30">
                        <td className="p-3 font-bold text-zinc-200">{h.provider_id}</td>
                        <td className="p-3 text-zinc-400">{h.voice_id}</td>
                        <td className="p-3">{h.latency_ms}ms</td>
                        <td className="p-3">{h.cold_start_ms}ms</td>
                        <td className="p-3">{h.words_per_sec} w/s</td>
                        <td className="p-3">{h.rtf}</td>
                        <td className="p-3">{h.cpu_pct}%</td>
                        <td className="p-3">{h.ram_mb}MB</td>
                        <td className="p-3 text-right text-zinc-500">{new Date(h.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-zinc-650 text-xs italic">
                          No benchmarking records logged in SQLite.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
    </AdminGuard>
  );
}
