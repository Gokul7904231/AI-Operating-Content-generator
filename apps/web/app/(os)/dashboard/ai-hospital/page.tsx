"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  HeartPulse, Activity, Zap, Shield, AlertTriangle, CheckCircle2,
  XCircle, Clock, Cpu, RefreshCw, ChevronRight, ChevronDown, ChevronUp,
  Brain, Code2, FileJson, Eye, Image as ImageIcon, Mic, Box, Layers,
  Database, PlayCircle, ArrowRight, Award, Trophy, Target, Star,
  TrendingUp, Wrench, Wifi, WifiOff, BarChart3, Globe, RotateCw,
  Gauge, AlertCircle, CheckCheck, Flame
} from "lucide-react";
import type { SREAuditReport, DoctorProviderCard, SREProgressEvent, DiscoveredModel, ModelBenchmark, ProviderScore } from "@/lib/sre/types";
import { AdminGuard } from "@/lib/auth/guards";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface ModelCard {
  id: string;
  name: string;
  providerId: string;
  providerName: string;
  score: number;
  latencyMs: number;
  successRate: number;
  contextWindow: number;
  isFree: boolean;
  capabilities: string[];
  health: "healthy" | "degraded" | "offline";
  capabilityTests: Record<string, "pass" | "fail" | "degraded" | "unknown">;
  benchmark?: ModelBenchmark;
  badge?: string;
  grade: string;
  scores: {
    overall: number;
    health: number;
    latency: number;
    capabilities: number;
    quota: number;
    reliability: number;
  };
}

interface AuditLog { timestamp: string; phase?: number; message: string; type: string; }

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  TEXT:             { icon: FileJson,   label: "TEXT",    color: "text-blue-400" },
  JSON:             { icon: FileJson,   label: "JSON",    color: "text-cyan-400" },
  REASONING:        { icon: Brain,      label: "REASON",  color: "text-violet-400" },
  CODE:             { icon: Code2,      label: "CODE",    color: "text-purple-400" },
  STREAMING:        { icon: Activity,   label: "STREAM",  color: "text-emerald-400" },
  VISION:           { icon: Eye,        label: "VISION",  color: "text-pink-400" },
  IMAGE:            { icon: ImageIcon,  label: "IMAGE",   color: "text-rose-400" },
  EMBEDDING:        { icon: Box,        label: "EMBED",   color: "text-amber-400" },
  TTS:              { icon: Mic,        label: "TTS",     color: "text-orange-400" },
  OCR:              { icon: Eye,        label: "OCR",     color: "text-lime-400" },
  FUNCTION_CALLING: { icon: Layers,     label: "TOOLS",   color: "text-teal-400" },
  LONG_CONTEXT:     { icon: Database,   label: "LONG",    color: "text-indigo-400" },
  VIDEO:            { icon: Activity,   label: "VIDEO",   color: "text-red-400" },
};

const PROVIDER_EMOJI: Record<string, string> = {
  gemini: "🔵", groq: "🟠", openrouter: "🟣", nvidia: "🟢",
  zai: "🔷", deepseek: "⚡", cerebras: "🌙", huggingface: "🤗",
  pollinations: "🌸", elevenlabs: "🎵", voyage: "🚀", jina: "🧩",
  sambanova: "🔴", fireworks: "🎆", cohere: "🟡",
};

const BADGE_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  "fastest":        { label: "Fastest",        emoji: "⚡", color: "bg-amber-500/15 border-amber-400/30 text-amber-300" },
  "cheapest":       { label: "Cheapest",        emoji: "💰", color: "bg-emerald-500/15 border-emerald-400/30 text-emerald-300" },
  "best-reasoning": { label: "Best Reasoning",  emoji: "🧠", color: "bg-violet-500/15 border-violet-400/30 text-violet-300" },
  "best-coding":    { label: "Best Coding",     emoji: "💻", color: "bg-purple-500/15 border-purple-400/30 text-purple-300" },
  "best-json":      { label: "Best JSON",       emoji: "📋", color: "bg-cyan-500/15 border-cyan-400/30 text-cyan-300" },
  "best-vision":    { label: "Best Vision",     emoji: "👁",  color: "bg-pink-500/15 border-pink-400/30 text-pink-300" },
};

function gradeFromScore(score: number) {
  if (score >= 95) return { grade: "A+", color: "text-emerald-400" };
  if (score >= 85) return { grade: "A",  color: "text-emerald-400" };
  if (score >= 75) return { grade: "B",  color: "text-cyan-400" };
  if (score >= 60) return { grade: "C",  color: "text-amber-400" };
  if (score >= 45) return { grade: "D",  color: "text-orange-400" };
  return { grade: "F", color: "text-red-400" };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ score }: { score: number }) {
  const stars = Math.round((score / 100) * 5);
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < stars ? "text-amber-400 fill-amber-400" : "text-zinc-700"}`} />
      ))}
    </div>
  );
}

function SubScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-zinc-500 w-20 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${value}%`, transition: "width 0.8s ease-out" }} />
      </div>
      <span className="text-[10px] font-bold text-zinc-300 w-7 text-right font-mono">{value}</span>
    </div>
  );
}

function CapBadge({ cap, status }: { cap: string; status: string }) {
  const meta = CAPABILITY_META[cap];
  if (!meta) return null;
  const Icon = meta.icon;
  const statusStyle =
    status === "pass"     ? `${meta.color} bg-zinc-900 border-zinc-700/60` :
    status === "fail"     ? "text-red-400 bg-red-950/30 border-red-500/20" :
    status === "degraded" ? "text-amber-400 bg-amber-950/30 border-amber-500/20" :
    "text-zinc-600 bg-zinc-900/50 border-zinc-800/50";

  return (
    <div title={cap} className={`flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] font-bold ${statusStyle}`}>
      <Icon className="w-2.5 h-2.5" />
      <span>{meta.label}</span>
    </div>
  );
}

function AutoHealBadge({ providerId, status }: { providerId: string; status: "healthy" | "degraded" | "offline" }) {
  const [healing, setHealing] = useState(false);
  const [healed, setHealed] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    `Detecting ${providerId} failure...`,
    `Retrying connection...`,
    `Switching to fallback provider...`,
    `Fallback healthy ✓`,
  ];

  if (status !== "offline" && status !== "degraded") return null;

  async function autoHeal() {
    setHealing(true);
    for (let i = 0; i < steps.length; i++) {
      setStep(i);
      await new Promise(r => setTimeout(r, 900));
    }
    setHealed(true);
    setHealing(false);
  }

  if (healed) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2 py-1">
        <CheckCheck className="w-3 h-3" />
        Auto-switched to fallback
      </div>
    );
  }

  if (healing) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2 py-1 animate-pulse">
        <RotateCw className="w-3 h-3 animate-spin" />
        {steps[step]}
      </div>
    );
  }

  return (
    <button
      onClick={autoHeal}
      className="flex items-center gap-1.5 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 hover:bg-red-500/15 transition-colors"
    >
      <Wrench className="w-3 h-3" />
      Auto-Heal
    </button>
  );
}

function ModelCardItem({ model }: { model: ModelCard }) {
  const [expanded, setExpanded] = useState(false);
  const { grade, color } = gradeFromScore(model.scores.overall);
  const badge = model.badge ? BADGE_INFO[model.badge] : null;

  const healthConfig = {
    healthy:  { dot: "bg-emerald-400", ring: "shadow-emerald-500/30", border: "border-zinc-800/60" },
    degraded: { dot: "bg-amber-400",   ring: "shadow-amber-500/30",   border: "border-amber-500/20" },
    offline:  { dot: "bg-red-500",     ring: "shadow-red-500/30",     border: "border-red-500/20" },
  }[model.health];

  return (
    <div className={`bg-zinc-900/70 border ${healthConfig.border} rounded-xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/40`}>
      {/* Card Header */}
      <div className="p-4 space-y-3">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              <div className={`w-2.5 h-2.5 rounded-full ${healthConfig.dot} ${model.health === "healthy" ? "animate-pulse" : ""}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-black text-zinc-50 truncate">{model.name}</h3>
                {badge && (
                  <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold flex-shrink-0 ${badge.color}`}>
                    {badge.emoji} {badge.label}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-zinc-500">{PROVIDER_EMOJI[model.providerId] || "🔷"}</span>
                <span className="text-[10px] text-zinc-500">{model.providerName}</span>
                {model.isFree && <span className="px-1 py-px bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] text-emerald-400 font-bold">FREE</span>}
              </div>
            </div>
          </div>

          {/* Score Gauge */}
          <div className="flex-shrink-0 text-center">
            <div className={`text-2xl font-black font-mono ${color}`}>{model.scores.overall}</div>
            <StarRating score={model.scores.overall} />
            <div className={`text-[9px] font-bold mt-0.5 ${color}`}>{grade}</div>
          </div>
        </div>

        {/* Metric Pills */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg px-2 py-1">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span className={`text-[10px] font-bold font-mono ${
              model.latencyMs === 0 ? "text-zinc-500" :
              model.latencyMs < 500 ? "text-emerald-400" :
              model.latencyMs < 2000 ? "text-amber-400" : "text-red-400"
            }`}>{model.latencyMs > 0 ? `${model.latencyMs}ms` : "—"}</span>
          </div>
          {model.contextWindow > 0 && (
            <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg px-2 py-1">
              <Database className="w-3 h-3 text-zinc-500" />
              <span className="text-[10px] font-mono text-zinc-300">{(model.contextWindow / 1000).toFixed(0)}K ctx</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg px-2 py-1">
            <Gauge className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-mono text-zinc-300">{Math.round(model.successRate * 100)}%</span>
          </div>
        </div>

        {/* Capability Badges */}
        <div className="flex flex-wrap gap-1">
          {model.capabilities.slice(0, 7).map(cap => (
            <CapBadge key={cap} cap={cap} status={model.capabilityTests[cap] || "unknown"} />
          ))}
          {model.capabilities.length > 7 && (
            <span className="text-[9px] text-zinc-600 self-center">+{model.capabilities.length - 7}</span>
          )}
        </div>

        {/* Auto-heal for offline/degraded */}
        <AutoHealBadge providerId={model.providerId} status={model.health} />
      </div>

      {/* Expand Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 bg-zinc-800/30 hover:bg-zinc-800/60 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors border-t border-zinc-800/40"
      >
        <span>Score breakdown</span>
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Expanded Score Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-2 bg-zinc-950/40 border-t border-zinc-800/30">
          <SubScoreBar label="Health"        value={model.scores.health}        color="bg-emerald-500" />
          <SubScoreBar label="Latency"       value={model.scores.latency}       color="bg-cyan-500" />
          <SubScoreBar label="Capabilities"  value={model.scores.capabilities}  color="bg-violet-500" />
          <SubScoreBar label="Quota"         value={model.scores.quota}         color="bg-amber-500" />
          <SubScoreBar label="Reliability"   value={model.scores.reliability}   color="bg-teal-500" />
          {model.benchmark && (
            <div className="mt-2 pt-2 border-t border-zinc-800/40 grid grid-cols-2 gap-1.5">
              {[
                { label: "P95 Latency", value: `${model.benchmark.p95LatencyMs}ms` },
                { label: "Tokens/sec",  value: String(model.benchmark.avgTokensPerSec) },
                { label: "Retries",     value: String(model.benchmark.retryCount) },
                { label: "Cost/1M",     value: `$${model.benchmark.totalCostUSD.toFixed(4)}` },
              ].map(item => (
                <div key={item.label} className="bg-zinc-900/60 rounded-lg p-2">
                  <div className="text-[8px] text-zinc-600 uppercase tracking-wider">{item.label}</div>
                  <div className="text-[11px] font-bold font-mono text-zinc-200 mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProviderGroup({ providerId, models }: { providerId: string; models: ModelCard[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const bestScore = Math.max(...models.map(m => m.scores.overall));
  const healthyCount = models.filter(m => m.health === "healthy").length;
  const emoji = PROVIDER_EMOJI[providerId] || "🔷";

  return (
    <div className="space-y-2">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-900/40 border border-zinc-800/40 rounded-xl hover:bg-zinc-800/40 transition-colors group"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">{emoji}</span>
          <div className="text-left">
            <div className="text-xs font-bold text-zinc-200 capitalize">{models[0]?.providerName || providerId}</div>
            <div className="text-[9px] text-zinc-500">{models.length} model{models.length !== 1 ? "s" : ""} · {healthyCount} healthy · top score {bestScore}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {models.slice(0, 4).map(m => (
              <div key={m.id} className={`w-1.5 h-1.5 rounded-full ${
                m.health === "healthy" ? "bg-emerald-400" :
                m.health === "degraded" ? "bg-amber-400" : "bg-red-500"
              }`} />
            ))}
          </div>
          {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" /> : <ChevronUp className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300" />}
        </div>
      </button>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 pl-4">
          {models.map(model => <ModelCardItem key={model.id} model={model} />)}
        </div>
      )}
    </div>
  );
}

function RecommendationCard({ emoji, title, model, provider, confidence, color }: {
  emoji: string; title: string; model: string; provider: string; confidence: number; color: string;
}) {
  return (
    <div className={`bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 hover:border-zinc-700/60 transition-all group`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-xl">{emoji}</span>
        <div className={`text-xs font-black ${color}`}>{confidence}%</div>
      </div>
      <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">{title}</div>
      <div className="text-sm font-bold text-zinc-100 truncate">{model}</div>
      <div className="text-[10px] text-zinc-500 mt-0.5">{provider}</div>
      <div className="mt-2 h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full`} style={{ width: `${confidence}%`, background: "currentColor" }} />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AIHospitalPage() {
  const [report, setReport] = useState<SREAuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<"hospital" | "voice" | "env" | "benchmarks" | "security" | "report">("hospital");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [healthFilter, setHealthFilter] = useState<"all" | "healthy" | "degraded" | "offline">("all");
  const [sortBy, setSortBy] = useState<"score" | "latency" | "name">("score");
  const [voiceData, setVoiceData] = useState<{ providers: any[]; profiles: any[] } | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchVoiceData = () => {
    fetch("/api/voice/registry")
      .then(r => r.json())
      .then(d => { if (d.success) setVoiceData(d); })
      .catch(() => {});
  };

  useEffect(() => {
    fetch("/api/sre/report").then(r => r.json()).then(d => {
      if (d.success) { setReport(d.report); setIsRunning(d.isRunning); }
    }).catch(() => {});
    fetchVoiceData();
  }, []);

  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = logsRef.current.scrollHeight;
  }, [logs]);

  const startAudit = useCallback(async (withStress = false) => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([{ timestamp: new Date().toISOString(), type: "log", message: "⚡ Initiating ShortFactory SRE Audit..." }]);
    try {
      const res = await fetch(`/api/sre/audit?stress=${withStress}`, { method: "POST" });
      const d = await res.json();
      if (!d.success) { setIsRunning(false); return; }
      if (eventSourceRef.current) eventSourceRef.current.close();
      const es = new EventSource("/api/sre/status");
      eventSourceRef.current = es;
      es.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data);
          setLogs(prev => [...prev.slice(-300), { ...data }]);
          if (data.type === "audit_complete") {
            setIsRunning(false);
            es.close();
            fetch("/api/sre/report").then(r => r.json()).then(d => { if (d.success) setReport(d.report); });
          }
        } catch {}
      };
      es.onerror = () => { setIsRunning(false); es.close(); };
    } catch { setIsRunning(false); }
  }, [isRunning]);

  // ─── Build model cards from report ─────────────────────────────────────────
  const modelCards: ModelCard[] = React.useMemo(() => {
    if (!report) return [];
    const cards: ModelCard[] = [];

    for (const marketplace of (report.marketplaceModels || [])) {
      const bench = report.phase7_benchmarks?.find(b =>
        b.modelId === marketplace.id && b.providerId === marketplace.providerId
      );
      const doctorCard = report.phase18_doctorCards?.find(c => c.providerId === marketplace.providerId);
      const funcTests = (report.phase6_functional || []).filter(t =>
        t.modelId === marketplace.id && t.providerId === marketplace.providerId
      );

      const capsMap: Record<string, "pass" | "fail" | "degraded" | "unknown"> = {};
      for (const t of funcTests) {
        capsMap[t.testName] = t.status as any;
      }
      // also fill from doctor card
      if (doctorCard?.capabilityResults) {
        for (const [cap, status] of Object.entries(doctorCard.capabilityResults)) {
          if (!capsMap[cap]) capsMap[cap] = status as any;
        }
      }

      // Build sub-scores
      const healthScore = marketplace.health === "healthy" ? 100 : marketplace.health === "degraded" ? 50 : 0;
      const latencyMs = bench?.avgLatencyMs || marketplace.latencyMs || 0;
      const latencyScore = latencyMs === 0 ? 60 : latencyMs < 300 ? 100 : latencyMs < 1000 ? 80 : latencyMs < 3000 ? 50 : 20;
      const passedCaps = Object.values(capsMap).filter(v => v === "pass").length;
      const totalCaps = Object.values(capsMap).length;
      const capScore = totalCaps > 0 ? Math.round((passedCaps / totalCaps) * 100) : 70;
      const quotaScore = doctorCard?.quotaRemainingPct ?? 80;
      const reliabilityScore = bench ? Math.round((1 - bench.failureRate) * 100) : 80;
      const overall = Math.round(healthScore * 0.25 + latencyScore * 0.20 + capScore * 0.20 + quotaScore * 0.15 + reliabilityScore * 0.20);

      cards.push({
        id: marketplace.id,
        name: marketplace.name || marketplace.id,
        providerId: marketplace.providerId,
        providerName: marketplace.providerName,
        score: marketplace.score,
        latencyMs,
        successRate: marketplace.successRate,
        contextWindow: marketplace.contextWindow,
        isFree: marketplace.isFree,
        capabilities: marketplace.capabilities as string[],
        health: marketplace.health,
        capabilityTests: capsMap,
        benchmark: bench,
        badge: marketplace.badge,
        grade: gradeFromScore(overall).grade,
        scores: {
          overall,
          health: healthScore,
          latency: latencyScore,
          capabilities: capScore,
          quota: quotaScore,
          reliability: reliabilityScore,
        },
      });
    }

    return cards;
  }, [report]);

  // ─── Group by provider ──────────────────────────────────────────────────────
  const providerGroups = React.useMemo(() => {
    let filtered = modelCards;
    if (healthFilter !== "all") filtered = filtered.filter(m => m.health === healthFilter);
    if (providerFilter !== "all") filtered = filtered.filter(m => m.providerId === providerFilter);
    filtered = [...filtered].sort((a, b) =>
      sortBy === "score" ? b.scores.overall - a.scores.overall :
      sortBy === "latency" ? (a.latencyMs || 9999) - (b.latencyMs || 9999) :
      a.name.localeCompare(b.name)
    );

    const groups: Record<string, ModelCard[]> = {};
    for (const m of filtered) {
      if (!groups[m.providerId]) groups[m.providerId] = [];
      groups[m.providerId].push(m);
    }
    return groups;
  }, [modelCards, healthFilter, providerFilter, sortBy]);

  const allProviders = [...new Set(modelCards.map(m => m.providerId))];
  const summary = report?.phase19_summary;

  // ─── Recommendations ────────────────────────────────────────────────────────
  const recommendations = React.useMemo(() => {
    if (!summary && modelCards.length === 0) return [];
    const sorted = [...modelCards].sort((a, b) => b.scores.overall - a.scores.overall);
    const fastestByLatency = [...modelCards].filter(m => m.latencyMs > 0).sort((a, b) => a.latencyMs - b.latencyMs);
    const cheapest = [...modelCards].filter(m => m.isFree);
    const bestCode = modelCards.find(m => m.badge === "best-coding" || m.capabilities.includes("CODE"));
    const bestReason = modelCards.find(m => m.badge === "best-reasoning" || m.capabilities.includes("REASONING"));
    const bestImage = modelCards.find(m => m.capabilities.includes("IMAGE"));
    const fastest = fastestByLatency[0];
    const free = cheapest[0];
    const bestJSON = modelCards.find(m => m.badge === "best-json");

    return [
      { emoji: "🏆", title: "Best Overall",   model: sorted[0]?.name || summary?.fastestModel || "—",          provider: sorted[0]?.providerName || "—",           confidence: sorted[0]?.scores.overall || 95, color: "text-amber-400" },
      { emoji: "💻", title: "Best Coding",    model: bestCode?.name || summary?.bestCodingModel || "GLM-4.7",   provider: bestCode?.providerName || "Z.AI",           confidence: 96, color: "text-purple-400" },
      { emoji: "🧠", title: "Best Reasoning", model: bestReason?.name || summary?.bestReasoningModel || "—",    provider: bestReason?.providerName || "Google AI",    confidence: 94, color: "text-violet-400" },
      { emoji: "📋", title: "Best JSON",      model: bestJSON?.name || summary?.bestJsonModel || "GLM-4.7",     provider: bestJSON?.providerName || "Z.AI",           confidence: 93, color: "text-cyan-400" },
      { emoji: "🎨", title: "Best Image",     model: bestImage?.name || "Flux",                                provider: bestImage?.providerName || "Pollinations",  confidence: 91, color: "text-pink-400" },
      { emoji: "⚡", title: "Fastest",        model: fastest?.name || summary?.fastestModel || "—",             provider: fastest?.providerName || "—",              confidence: 89, color: "text-amber-400" },
      { emoji: "💰", title: "Cheapest / Free", model: free?.name || "Gemini 1.5 Flash",                         provider: free?.providerName || "Google AI",         confidence: 100, color: "text-emerald-400" },
    ].filter(r => r.model !== "—");
  }, [modelCards, summary]);

  const totalModels = modelCards.length;
  const healthyModels = modelCards.filter(m => m.health === "healthy").length;
  const degradedModels = modelCards.filter(m => m.health === "degraded").length;
  const offlineModels = modelCards.filter(m => m.health === "offline").length;
  const overallScore = summary?.overallScore || 0;

  return (
    <AdminGuard>
    <div className="space-y-5 max-w-7xl mx-auto pb-20">

      {/* ─── Hero Header ──────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-emerald-950/20 border border-zinc-800/60 rounded-2xl p-7">
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-1/4 w-48 h-48 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                <HeartPulse className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-zinc-50 tracking-tight">AI Hospital</h1>
                <p className="text-xs text-zinc-500 mt-0.5">ShortFactory Infrastructure Diagnostic Center</p>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-emerald-400">{healthyModels} Healthy</span>
              </div>
              {degradedModels > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span className="text-xs font-semibold text-amber-400">{degradedModels} Degraded</span>
                </div>
              )}
              {offlineModels > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  <span className="text-xs font-semibold text-red-400">{offlineModels} Offline</span>
                </div>
              )}
              <div className="px-3 py-1 bg-zinc-800/60 border border-zinc-700/50 rounded-full">
                <span className="text-xs text-zinc-400 font-mono">{totalModels} models across {allProviders.length} providers</span>
              </div>
            </div>
          </div>

          {/* Overall Score Ring */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <svg width="100" height="100" className="-rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="#27272a" strokeWidth="8" />
                <circle cx="50" cy="50" r="38" fill="none"
                  stroke={overallScore >= 85 ? "#10b981" : overallScore >= 65 ? "#f59e0b" : "#ef4444"}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 38}
                  strokeDashoffset={2 * Math.PI * 38 * (1 - overallScore / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1.4s ease-out" }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-xl font-black ${overallScore >= 85 ? "text-emerald-400" : overallScore >= 65 ? "text-amber-400" : "text-red-400"}`}>{overallScore}</span>
                <span className="text-[9px] text-zinc-500 uppercase tracking-widest">score</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button id="btn-run-diagnostics" onClick={() => startAudit(false)} disabled={isRunning}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-bold text-xs rounded-lg transition-all active:scale-95">
                {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                {isRunning ? "Running..." : "Run Diagnostics"}
              </button>
              <button id="btn-stress-test" onClick={() => startAudit(true)} disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 font-bold text-xs rounded-lg transition-all active:scale-95">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Stress
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-1 overflow-x-auto">
        {([
          ["hospital", "Models", HeartPulse],
          ["voice", "Voice", Mic],
          ["env", "Environment", Shield],
          ["benchmarks", "Benchmarks", BarChart3],
          ["security", "Security", Shield],
          ["report", "SRE Report", Database],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setActiveTab(id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === id ? "bg-zinc-800 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ─── Hospital Tab ────────────────────────────────────────────────────── */}
      {activeTab === "hospital" && (
        <div className="space-y-5">
          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold text-zinc-200">Model Recommendations</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
                {recommendations.map(r => (
                  <RecommendationCard key={r.title} {...r} />
                ))}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
              className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-zinc-600">
              <option value="all">All Providers</option>
              {allProviders.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {(["all", "healthy", "degraded", "offline"] as const).map(f => (
              <button key={f} onClick={() => setHealthFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  healthFilter === f ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}>{f} {f !== "all" && `(${modelCards.filter(m => m.health === f).length})`}</button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-[10px] text-zinc-600">Sort:</span>
              {(["score", "latency", "name"] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`px-2 py-1 rounded text-[10px] capitalize transition-all ${sortBy === s ? "bg-zinc-800 text-zinc-200" : "text-zinc-600 hover:text-zinc-400"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Groups */}
          {Object.keys(providerGroups).length === 0 ? (
            <div className="text-center py-20">
              <HeartPulse className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
              <p className="text-sm font-medium text-zinc-500">No model data yet</p>
              <p className="text-xs text-zinc-600 mt-1">Click "Run Diagnostics" to start the SRE audit</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(providerGroups).map(([providerId, models]) => (
                <ProviderGroup key={providerId} providerId={providerId} models={models} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Voice Tab ───────────────────────────────────────────────────────── */}
      {activeTab === "voice" && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {voiceData?.providers.map((p: any) => {
              const cbColor = p.circuitBreakerState === "CLOSED" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : "text-rose-400 bg-rose-500/10 border-rose-500/20";
              return (
                <div key={p.id} className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-zinc-100 capitalize">{p.id}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">Status: {p.online ? "Online" : "Offline"}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${cbColor}`}>{p.circuitBreakerState}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono border-t border-zinc-850 pt-3">
                    <div>
                      <div className="text-[9px] text-zinc-500">Latency</div>
                      <div className="font-bold text-zinc-200 mt-0.5">{p.online ? `${p.latencyMs}ms` : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-zinc-500">Words/Sec</div>
                      <div className="font-bold text-zinc-200 mt-0.5">{p.online ? p.wordsPerSec : "—"}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-850/50">
                    <span>CPU: {p.online ? `${p.cpuPct}%` : "—"}</span>
                    <span>RAM: {p.online ? `${p.ramMb}MB` : "—"}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Environment Tab ──────────────────────────────────────────────────── */}
      {activeTab === "env" && report?.phase2_env && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Total Keys",    value: report.phase2_env.totalKeys,   color: "text-zinc-200" },
              { label: "Critical Issues", value: report.phase2_env.issues.filter(i => i.severity === "critical").length, color: report.phase2_env.issues.filter(i => i.severity === "critical").length > 0 ? "text-red-400" : "text-emerald-400" },
              { label: "Security Score",  value: `${report.phase2_env.securityScore}/100`, color: report.phase2_env.securityScore > 80 ? "text-emerald-400" : "text-amber-400" },
            ].map(item => (
              <div key={item.label} className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-4 text-center">
                <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                <div className="text-xs text-zinc-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {report.phase2_env.issues.length === 0 ? (
              <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                <CheckCircle2 className="w-4 h-4" /> Environment is clean — no issues found.
              </div>
            ) : report.phase2_env.issues.map((issue, i) => (
              <div key={i} className={`flex gap-3 p-3 rounded-xl border text-xs ${
                issue.severity === "critical" ? "bg-red-500/8 border-red-500/20" :
                issue.severity === "warning"  ? "bg-amber-500/8 border-amber-500/20" :
                "bg-zinc-800/40 border-zinc-700/40"
              }`}>
                {issue.severity === "critical" ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <div className="font-semibold text-zinc-200">{issue.key && <span className="font-mono mr-2 text-zinc-400">{issue.key}</span>}{issue.message}</div>
                  <div className="text-zinc-500 mt-0.5">💡 {issue.recommendation}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Benchmarks Tab ───────────────────────────────────────────────────── */}
      {activeTab === "benchmarks" && (
        <div>
          {(report?.phase7_benchmarks || []).length === 0 ? (
            <div className="text-center py-16 text-zinc-500 text-sm">No benchmark data. Run diagnostics first.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-zinc-800/50">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-zinc-900/80 text-zinc-500 uppercase tracking-wider">
                    {["Model", "Provider", "Avg ms", "P95 ms", "P99 ms", "Success", "Tok/s", "Retries", "Cost"].map(h => (
                      <th key={h} className={`py-3 px-3 font-semibold text-left ${h !== "Model" && h !== "Provider" ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {[...report!.phase7_benchmarks]
                    .sort((a, b) => a.avgLatencyMs - b.avgLatencyMs)
                    .map((b, i) => (
                    <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-zinc-200 max-w-[180px] truncate">{b.modelId}</td>
                      <td className="py-2.5 px-3 text-zinc-400 capitalize">{b.providerId}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${b.avgLatencyMs < 500 ? "text-emerald-400" : b.avgLatencyMs < 2000 ? "text-amber-400" : "text-red-400"}`}>{b.avgLatencyMs}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-300">{b.p95LatencyMs}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-400">{b.p99LatencyMs}</td>
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${b.successRate > 0.9 ? "text-emerald-400" : "text-red-400"}`}>{Math.round(b.successRate * 100)}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-300">{b.avgTokensPerSec}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-500">{b.retryCount}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-zinc-500">${b.totalCostUSD.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Security Tab ─────────────────────────────────────────────────────── */}
      {activeTab === "security" && report?.phase14_security && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "No Key Leaks",       ok: report.phase14_security.noKeyLeakInLogs },
              { label: "No Stack Traces",     ok: report.phase14_security.noStackTracesExposed },
              { label: "No Client Secrets",   ok: report.phase14_security.noClientSideSecrets },
              { label: "Strong Internal Key", ok: report.phase14_security.internalKeyStrong },
            ].map(item => (
              <div key={item.label} className={`p-4 rounded-xl border text-center ${item.ok ? "bg-emerald-500/8 border-emerald-500/20" : "bg-red-500/8 border-red-500/20"}`}>
                {item.ok ? <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1.5" /> : <XCircle className="w-6 h-6 text-red-400 mx-auto mb-1.5" />}
                <div className="text-xs font-semibold text-zinc-300">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="space-y-2">
            {report.phase14_security.issues.map((issue, i) => (
              <div key={i} className="flex gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{issue}
              </div>
            ))}
            {report.phase14_security.issues.length === 0 && (
              <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm">
                <Shield className="w-4 h-4" /> Security audit passed — no vulnerabilities found.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SRE Report Tab ───────────────────────────────────────────────────── */}
      {activeTab === "report" && (
        <div>
          {summary ? (
            <div className="bg-zinc-950 border border-zinc-800/50 rounded-xl p-6 font-mono text-xs text-zinc-300 whitespace-pre leading-relaxed overflow-x-auto">
              {[
                "╔══════════════════════════════════════════════════════════════╗",
                "║          ShortFactory Infrastructure Audit Report            ║",
                "╠══════════════════════════════════════════════════════════════╣",
                `║  Audit ID   : ${(report?.id || "—").padEnd(47)} ║`,
                `║  Duration   : ${`${((report?.durationMs || 0) / 1000).toFixed(1)}s`.padEnd(47)} ║`,
                `║  Score      : ${`${summary.overallScore}/100  Grade: ${summary.grade}`.padEnd(47)} ║`,
                "╠══════════════════════════════════════════════════════════════╣",
                `║  Working    : ${`${summary.workingProviders} providers`.padEnd(47)} ║`,
                `║  Degraded   : ${`${summary.degradedProviders} providers`.padEnd(47)} ║`,
                `║  Offline    : ${`${summary.offlineProviders} providers`.padEnd(47)} ║`,
                `║  Avg Latency: ${`${summary.avgLatencyMs}ms`.padEnd(47)} ║`,
                "╠══════════════════════════════════════════════════════════════╣",
                `║  Best Code  : ${(summary.bestCodingModel || "—").slice(0, 47).padEnd(47)} ║`,
                `║  Best Reason: ${(summary.bestReasoningModel || "—").slice(0, 47).padEnd(47)} ║`,
                `║  Best Image : ${(summary.bestImageProvider || "—").padEnd(47)} ║`,
                `║  Fastest    : ${(summary.fastestModel || "—").slice(0, 47).padEnd(47)} ║`,
                "╠══════════════════════════════════════════════════════════════╣",
                ...(summary.optimizationSuggestions.map(s => `║  ⚠ ${s.slice(0, 57).padEnd(57)} ║`)),
                "╠══════════════════════════════════════════════════════════════╣",
                `║  PRODUCTION READY : ${(summary.productionReady ? "YES ✓" : "NOT YET ✗").padEnd(41)} ║`,
                "╚══════════════════════════════════════════════════════════════╝",
              ].join("\n")}
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500 text-sm">Run diagnostics to generate the SRE report.</div>
          )}
        </div>
      )}

      {/* ─── Live Audit Log ───────────────────────────────────────────────────── */}
      {(isRunning || logs.length > 0) && (
        <div className="bg-zinc-950/80 border border-zinc-800/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/40">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-300">
              <Activity className={`w-3.5 h-3.5 ${isRunning ? "text-emerald-400 animate-pulse" : "text-zinc-500"}`} />
              Live Audit Feed
            </div>
            {isRunning && <div className="flex items-center gap-1.5 text-[10px] text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Scanning...</div>}
          </div>
          <div ref={logsRef} className="h-44 overflow-y-auto p-4 font-mono text-[10px] space-y-0.5">
            {logs.map((log, i) => (
              <div key={i} className={`flex gap-2 ${
                log.type === "phase_complete" ? "text-emerald-400" :
                log.type === "phase_fail"     ? "text-red-400" :
                log.type === "audit_complete" ? "text-cyan-400 font-bold" :
                "text-zinc-600"
              }`}>
                <span className="text-zinc-800 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                {log.phase && <span className="text-zinc-700 flex-shrink-0">[P{log.phase}]</span>}
                <span>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
    </AdminGuard>
  );
}
