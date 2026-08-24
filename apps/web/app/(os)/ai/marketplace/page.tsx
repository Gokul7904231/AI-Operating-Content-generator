"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ShoppingBag, Zap, DollarSign, CheckCircle2, XCircle, AlertTriangle,
  Brain, Code2, FileJson, Eye, Image as ImageIcon, Mic, Box, Activity,
  Layers, Database, Search, SlidersHorizontal, TrendingUp, Award, Globe,
  Filter, ChevronDown, Star
} from "lucide-react";
import type { MarketplaceModel, CapabilityName } from "@/lib/sre/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CAP_ICONS: Record<string, React.ElementType> = {
  TEXT: FileJson, JSON: FileJson, REASONING: Brain, CODE: Code2,
  STREAMING: Activity, VISION: Eye, IMAGE: ImageIcon, EMBEDDING: Box,
  TTS: Mic, OCR: Eye, FUNCTION_CALLING: Layers, LONG_CONTEXT: Database,
};

const BADGE_STYLES: Record<string, string> = {
  "fastest":        "bg-amber-500/15 border-amber-500/30 text-amber-400",
  "cheapest":       "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  "best-reasoning": "bg-blue-500/15 border-blue-500/30 text-blue-400",
  "best-coding":    "bg-purple-500/15 border-purple-500/30 text-purple-400",
  "best-json":      "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
  "best-vision":    "bg-pink-500/15 border-pink-500/30 text-pink-400",
};

const BADGE_LABELS: Record<string, string> = {
  "fastest": "⚡ Fastest", "cheapest": "💰 Cheapest",
  "best-reasoning": "🧠 Best Reasoning", "best-coding": "💻 Best Coding",
  "best-json": "📋 Best JSON", "best-vision": "👁 Best Vision",
};

const PROVIDER_COLORS: Record<string, string> = {
  gemini:      "bg-blue-500/10 border-blue-500/20 text-blue-400",
  groq:        "bg-orange-500/10 border-orange-500/20 text-orange-400",
  openrouter:  "bg-purple-500/10 border-purple-500/20 text-purple-400",
  nvidia:      "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  zai:         "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  pollinations:"bg-pink-500/10 border-pink-500/20 text-pink-400",
  elevenlabs:  "bg-amber-500/10 border-amber-500/20 text-amber-400",
  voyage:      "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
  default:     "bg-zinc-800/50 border-zinc-700 text-zinc-400",
};

function HealthDot({ status }: { status: string }) {
  return (
    <div className={`w-2 h-2 rounded-full ${
      status === "healthy" ? "bg-emerald-400" :
      status === "degraded" ? "bg-amber-400" : "bg-red-500"
    } ${status === "healthy" ? "animate-pulse" : ""}`} />
  );
}

function CapTag({ cap }: { cap: string }) {
  const Icon = CAP_ICONS[cap] || Activity;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-zinc-800/80 border border-zinc-700/50 rounded text-[9px] text-zinc-400 font-medium">
      <Icon className="w-2 h-2" />
      {cap.length > 6 ? cap.slice(0, 6) : cap}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] font-bold text-zinc-300 w-6 text-right">{score}</span>
    </div>
  );
}

function ModelCard({ model }: { model: MarketplaceModel }) {
  const providerColor = PROVIDER_COLORS[model.providerId] || PROVIDER_COLORS.default;

  return (
    <div className="group bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-600/60 rounded-xl p-4 space-y-3 transition-all duration-200 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <HealthDot status={model.health} />
            <h3 className="text-xs font-bold text-zinc-100 truncate">{model.name || model.id}</h3>
          </div>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold border ${providerColor}`}>
            {model.providerName}
          </span>
        </div>
        {model.badge && (
          <span className={`flex-shrink-0 px-2 py-0.5 rounded-full border text-[9px] font-bold ${BADGE_STYLES[model.badge]}`}>
            {BADGE_LABELS[model.badge]}
          </span>
        )}
      </div>

      {/* Score */}
      <ScoreBar score={model.score} />

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Latency</div>
          <div className={`text-xs font-bold font-mono mt-0.5 ${
            model.latencyMs === 0 ? "text-zinc-500" :
            model.latencyMs < 500 ? "text-emerald-400" :
            model.latencyMs < 2000 ? "text-amber-400" : "text-red-400"
          }`}>
            {model.latencyMs > 0 ? `${model.latencyMs}ms` : "–"}
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Cost/1M</div>
          <div className={`text-xs font-bold font-mono mt-0.5 ${model.isFree ? "text-emerald-400" : "text-zinc-300"}`}>
            {model.isFree ? "FREE" : model.costPer1MTokens > 0 ? `$${model.costPer1MTokens.toFixed(2)}` : "–"}
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Context</div>
          <div className="text-xs font-bold font-mono mt-0.5 text-zinc-300">
            {model.contextWindow > 0 ? `${(model.contextWindow / 1000).toFixed(0)}K` : "–"}
          </div>
        </div>
        <div className="bg-zinc-950/50 rounded-lg p-2">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Success</div>
          <div className={`text-xs font-bold font-mono mt-0.5 ${model.successRate > 0.9 ? "text-emerald-400" : "text-amber-400"}`}>
            {Math.round(model.successRate * 100)}%
          </div>
        </div>
      </div>

      {/* Capabilities */}
      {model.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {model.capabilities.slice(0, 5).map(cap => <CapTag key={cap} cap={cap} />)}
          {model.capabilities.length > 5 && (
            <span className="text-[9px] text-zinc-600">+{model.capabilities.length - 5}</span>
          )}
        </div>
      )}

      {/* Recommended For */}
      {model.recommendedFor.length > 0 && (
        <div className="text-[9px] text-zinc-500">
          <span className="text-zinc-600">Best for: </span>
          {model.recommendedFor.slice(0, 2).join(", ")}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

type SortKey = "score" | "latency" | "cost" | "context";
type ProviderFilter = "all" | string;
type CapabilityFilter = "all" | CapabilityName;

export default function AIMarketplacePage() {
  const [models, setModels] = useState<MarketplaceModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("score");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [capFilter, setCapFilter] = useState<CapabilityFilter>("all");
  const [freeOnly, setFreeOnly] = useState(false);
  const [healthFilter, setHealthFilter] = useState<"all" | "healthy">("all");

  useEffect(() => {
    fetch("/api/sre/report")
      .then(r => r.json())
      .then(d => {
        if (d.success && d.report?.marketplaceModels) {
          setModels(d.report.marketplaceModels);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const providers = useMemo(() => [...new Set(models.map(m => m.providerId))], [models]);
  const capabilities = useMemo(() => {
    const caps = new Set<CapabilityName>();
    models.forEach(m => m.capabilities.forEach(c => caps.add(c)));
    return [...caps];
  }, [models]);

  const filtered = useMemo(() => {
    let list = [...models];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(m =>
        m.id.toLowerCase().includes(q) ||
        m.providerName.toLowerCase().includes(q) ||
        m.recommendedFor.some(r => r.toLowerCase().includes(q))
      );
    }
    if (providerFilter !== "all") list = list.filter(m => m.providerId === providerFilter);
    if (capFilter !== "all") list = list.filter(m => m.capabilities.includes(capFilter as CapabilityName));
    if (freeOnly) list = list.filter(m => m.isFree);
    if (healthFilter === "healthy") list = list.filter(m => m.health === "healthy");

    list.sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "latency") return (a.latencyMs || 9999) - (b.latencyMs || 9999);
      if (sortBy === "cost") return a.costPer1MTokens - b.costPer1MTokens;
      if (sortBy === "context") return b.contextWindow - a.contextWindow;
      return 0;
    });

    return list;
  }, [models, search, sortBy, providerFilter, capFilter, freeOnly, healthFilter]);

  const stats = useMemo(() => ({
    total: models.length,
    free: models.filter(m => m.isFree).length,
    healthy: models.filter(m => m.health === "healthy").length,
    providers: providers.length,
  }), [models, providers]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900/80 via-zinc-900/60 to-purple-950/20 border border-zinc-800/60 rounded-2xl p-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/5 rounded-full filter blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-zinc-50 tracking-tight">AI Marketplace</h1>
                <p className="text-xs text-zinc-400">All discovered models — live metadata, health, and performance</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-xs text-zinc-300 font-semibold">
                {stats.total} Models
              </span>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400 font-semibold">
                {stats.free} Free
              </span>
              <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-xs text-blue-400 font-semibold">
                {stats.providers} Providers
              </span>
            </div>
          </div>

          {/* Capability Routes preview */}
          <div className="flex flex-col gap-1.5 text-xs">
            {[
              { cap: "TEXT", model: "gemini-1.5-flash", icon: FileJson, color: "text-blue-400" },
              { cap: "JSON", model: "glm-4.7-flash", icon: FileJson, color: "text-cyan-400" },
              { cap: "CODE", model: "glm-4.7-flash", icon: Code2, color: "text-purple-400" },
              { cap: "IMAGE", model: "flux / pollinations", icon: ImageIcon, color: "text-pink-400" },
            ].map(item => (
              <div key={item.cap} className="flex items-center gap-2 text-zinc-500">
                <item.icon className={`w-3 h-3 ${item.color}`} />
                <span className="text-zinc-600 w-12">{item.cap}</span>
                <ArrowRight className="w-3 h-3 text-zinc-700" />
                <span className="font-mono text-zinc-400">{item.model}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-48 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search models..."
            className="w-full bg-zinc-900/60 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as SortKey)}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="score">Sort: Score</option>
          <option value="latency">Sort: Fastest</option>
          <option value="cost">Sort: Cheapest</option>
          <option value="context">Sort: Context</option>
        </select>

        {/* Provider */}
        <select
          value={providerFilter}
          onChange={e => setProviderFilter(e.target.value)}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">All Providers</option>
          {providers.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Capability */}
        <select
          value={capFilter}
          onChange={e => setCapFilter(e.target.value as CapabilityFilter)}
          className="bg-zinc-900/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-xs text-zinc-300 focus:outline-none"
        >
          <option value="all">All Capabilities</option>
          {capabilities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Free Only Toggle */}
        <button
          onClick={() => setFreeOnly(!freeOnly)}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            freeOnly ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400"
          }`}
        >
          Free Only
        </button>

        {/* Healthy Only Toggle */}
        <button
          onClick={() => setHealthFilter(healthFilter === "all" ? "healthy" : "all")}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
            healthFilter === "healthy" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-zinc-900/60 border-zinc-800/60 text-zinc-400"
          }`}
        >
          Healthy Only
        </button>

        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} results</span>
      </div>

      {/* Model Grid */}
      {loading ? (
        <div className="text-center py-16 text-zinc-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30 animate-pulse" />
          <p className="text-sm">Loading marketplace...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-medium">No models found</p>
          <p className="text-xs mt-1">Try running an SRE Audit from AI Hospital to discover models.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(model => (
            <ModelCard key={`${model.providerId}/${model.id}`} model={model} />
          ))}
        </div>
      )}
    </div>
  );
}

// Arrow component used in header
function ArrowRight({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
