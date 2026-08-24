"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers, Brain, Code2, FileJson, Eye, Image as ImageIcon, Mic, Box,
  Database, Activity, ArrowDown, ChevronRight, Star, Zap, DollarSign,
  CheckCircle2, Clock, TrendingUp, Globe, Shield, RefreshCw, Cpu,
  BarChart3, GitMerge
} from "lucide-react";
import type { SREAuditReport, CapabilityRoute, CapabilityName } from "@/lib/sre/types";

// ─── Capability Metadata ──────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, {
  icon: React.ElementType; label: string; description: string;
  color: string; bgColor: string; borderColor: string;
  usedFor: string[];
}> = {
  TEXT:             { icon: FileJson,   label: "Text Generation",    description: "General-purpose text completion and generation",       color: "text-blue-400",    bgColor: "bg-blue-500/10",    borderColor: "border-blue-500/20",    usedFor: ["scripting", "summaries", "descriptions"] },
  JSON:             { icon: FileJson,   label: "JSON Mode",          description: "Structured JSON output with schema validation",        color: "text-cyan-400",    bgColor: "bg-cyan-500/10",    borderColor: "border-cyan-500/20",    usedFor: ["metadata", "structured data", "API responses"] },
  REASONING:        { icon: Brain,      label: "Reasoning",          description: "Chain-of-thought, multi-step logical reasoning",      color: "text-violet-400",  bgColor: "bg-violet-500/10",  borderColor: "border-violet-500/20",  usedFor: ["planning", "decision trees", "analysis"] },
  CODE:             { icon: Code2,      label: "Code Generation",    description: "Write, review, and debug code in any language",       color: "text-purple-400",  bgColor: "bg-purple-500/10",  borderColor: "border-purple-500/20",  usedFor: ["scripts", "automation", "ffmpeg commands"] },
  STREAMING:        { icon: Activity,   label: "Streaming",          description: "Token-by-token streaming for real-time output",       color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20", usedFor: ["real-time UX", "live previews", "chat"] },
  VISION:           { icon: Eye,        label: "Vision / OCR",       description: "Analyze and extract text from images and video",      color: "text-pink-400",    bgColor: "bg-pink-500/10",    borderColor: "border-pink-500/20",    usedFor: ["thumbnail analysis", "OCR", "scene detection"] },
  IMAGE:            { icon: ImageIcon,  label: "Image Generation",   description: "Text-to-image generation and editing",                color: "text-rose-400",    bgColor: "bg-rose-500/10",    borderColor: "border-rose-500/20",    usedFor: ["thumbnails", "covers", "backgrounds"] },
  EMBEDDING:        { icon: Box,        label: "Embeddings",         description: "Semantic vector embeddings for RAG and search",       color: "text-amber-400",   bgColor: "bg-amber-500/10",   borderColor: "border-amber-500/20",   usedFor: ["semantic search", "similarity", "RAG"] },
  TTS:              { icon: Mic,        label: "Text-to-Speech",     description: "High-quality voice synthesis from text",              color: "text-orange-400",  bgColor: "bg-orange-500/10",  borderColor: "border-orange-500/20",  usedFor: ["narration", "voiceovers", "subtitles"] },
  OCR:              { icon: Eye,        label: "OCR",                description: "Optical character recognition from images",           color: "text-lime-400",    bgColor: "bg-lime-500/10",    borderColor: "border-lime-500/20",    usedFor: ["document parsing", "captions", "slides"] },
  FUNCTION_CALLING: { icon: Layers,     label: "Function Calling",   description: "Structured tool use and API integration",            color: "text-teal-400",    bgColor: "bg-teal-500/10",    borderColor: "border-teal-500/20",    usedFor: ["tool orchestration", "agents", "workflows"] },
  LONG_CONTEXT:     { icon: Database,   label: "Long Context",       description: "Process documents, entire codebases, and videos",    color: "text-indigo-400",  bgColor: "bg-indigo-500/10",  borderColor: "border-indigo-500/20",  usedFor: ["long scripts", "transcripts", "codebases"] },
};

// ─── Static fallback capability routes (shown before audit runs) ──────────────

const STATIC_ROUTES: Record<string, Array<{ modelId: string; providerId: string; providerName: string; score: number; isFree: boolean; latencyHint: string }>> = {
  TEXT:             [
    { modelId: "gemini-1.5-flash",                  providerId: "gemini",      providerName: "Google AI",    score: 95, isFree: true,  latencyHint: "~800ms" },
    { modelId: "glm-4.7-flash",                     providerId: "zai",         providerName: "Z.AI",         score: 92, isFree: true,  latencyHint: "~600ms" },
    { modelId: "llama-3.3-70b-versatile",           providerId: "groq",        providerName: "Groq",         score: 88, isFree: true,  latencyHint: "~300ms" },
    { modelId: "meta-llama/llama-3.1-8b-instruct",  providerId: "openrouter",  providerName: "OpenRouter",   score: 72, isFree: false, latencyHint: "~1200ms" },
  ],
  JSON:             [
    { modelId: "glm-4.7-flash",           providerId: "zai",    providerName: "Z.AI",       score: 97, isFree: true,  latencyHint: "~600ms" },
    { modelId: "gemini-1.5-flash",        providerId: "gemini", providerName: "Google AI",   score: 93, isFree: true,  latencyHint: "~800ms" },
    { modelId: "llama-3.3-70b-versatile", providerId: "groq",   providerName: "Groq",        score: 85, isFree: true,  latencyHint: "~300ms" },
  ],
  REASONING:        [
    { modelId: "gemini-2.5-flash",        providerId: "gemini",  providerName: "Google AI",  score: 97, isFree: true,  latencyHint: "~1200ms" },
    { modelId: "glm-4.7-flash",           providerId: "zai",     providerName: "Z.AI",       score: 92, isFree: true,  latencyHint: "~700ms" },
    { modelId: "deepseek-chat",           providerId: "deepseek",providerName: "DeepSeek",   score: 90, isFree: false, latencyHint: "~900ms" },
    { modelId: "llama-3.3-70b-versatile", providerId: "groq",    providerName: "Groq",       score: 85, isFree: true,  latencyHint: "~350ms" },
  ],
  CODE:             [
    { modelId: "glm-4.7-flash",           providerId: "zai",    providerName: "Z.AI",       score: 96, isFree: true,  latencyHint: "~600ms" },
    { modelId: "gemini-1.5-flash",        providerId: "gemini", providerName: "Google AI",   score: 91, isFree: true,  latencyHint: "~800ms" },
    { modelId: "deepseek-chat",           providerId: "deepseek",providerName: "DeepSeek",   score: 90, isFree: false, latencyHint: "~900ms" },
    { modelId: "llama-3.3-70b-versatile", providerId: "groq",   providerName: "Groq",       score: 83, isFree: true,  latencyHint: "~350ms" },
  ],
  STREAMING:        [
    { modelId: "gemini-1.5-flash",        providerId: "gemini",  providerName: "Google AI",  score: 95, isFree: true, latencyHint: "~400ms TTFB" },
    { modelId: "llama-3.3-70b-versatile", providerId: "groq",    providerName: "Groq",       score: 93, isFree: true, latencyHint: "~200ms TTFB" },
    { modelId: "glm-4.7-flash",           providerId: "zai",     providerName: "Z.AI",       score: 88, isFree: true, latencyHint: "~350ms TTFB" },
  ],
  VISION:           [
    { modelId: "gemini-1.5-flash",                          providerId: "gemini",     providerName: "Google AI",   score: 97, isFree: true,  latencyHint: "~900ms" },
    { modelId: "meta-llama/llama-3.2-90b-vision-instruct",  providerId: "openrouter", providerName: "OpenRouter",  score: 85, isFree: false, latencyHint: "~2000ms" },
  ],
  IMAGE:            [
    { modelId: "flux",             providerId: "pollinations", providerName: "Pollinations",  score: 95, isFree: true,  latencyHint: "~3000ms" },
    { modelId: "stable-diffusion", providerId: "aihorde",     providerName: "AI Horde",       score: 80, isFree: true,  latencyHint: "queue" },
    { modelId: "sdxl",             providerId: "replicate",   providerName: "Replicate",      score: 88, isFree: false, latencyHint: "~5000ms" },
    { modelId: "text2img",         providerId: "huggingface", providerName: "HuggingFace",    score: 72, isFree: true,  latencyHint: "~8000ms" },
  ],
  EMBEDDING:        [
    { modelId: "voyage-3-lite",         providerId: "voyage",  providerName: "Voyage AI",   score: 95, isFree: false, latencyHint: "~200ms" },
    { modelId: "jina-embeddings-v3",    providerId: "jina",    providerName: "Jina AI",     score: 88, isFree: true,  latencyHint: "~300ms" },
    { modelId: "text-embedding-004",    providerId: "gemini",  providerName: "Google AI",   score: 85, isFree: true,  latencyHint: "~400ms" },
  ],
  TTS:              [
    { modelId: "eleven_multilingual_v2", providerId: "elevenlabs", providerName: "ElevenLabs", score: 97, isFree: false, latencyHint: "~1500ms" },
    { modelId: "edge-tts",               providerId: "edge",        providerName: "Edge TTS",   score: 82, isFree: true,  latencyHint: "~800ms" },
  ],
  OCR:              [
    { modelId: "gemini-1.5-flash",                         providerId: "gemini",     providerName: "Google AI",  score: 97, isFree: true,  latencyHint: "~900ms" },
    { modelId: "meta-llama/llama-3.2-90b-vision-instruct", providerId: "openrouter", providerName: "OpenRouter", score: 82, isFree: false, latencyHint: "~2000ms" },
  ],
  FUNCTION_CALLING: [
    { modelId: "gemini-1.5-flash",        providerId: "gemini",  providerName: "Google AI", score: 95, isFree: true, latencyHint: "~900ms" },
    { modelId: "llama-3.3-70b-versatile", providerId: "groq",    providerName: "Groq",      score: 90, isFree: true, latencyHint: "~350ms" },
    { modelId: "glm-4.7-flash",           providerId: "zai",     providerName: "Z.AI",      score: 88, isFree: true, latencyHint: "~600ms" },
  ],
  LONG_CONTEXT:     [
    { modelId: "gemini-1.5-flash",  providerId: "gemini",  providerName: "Google AI", score: 98, isFree: true,  latencyHint: "1M tokens" },
    { modelId: "glm-4.7-flash",     providerId: "zai",     providerName: "Z.AI",      score: 90, isFree: true,  latencyHint: "128K tokens" },
    { modelId: "deepseek-chat",     providerId: "deepseek",providerName: "DeepSeek",  score: 87, isFree: false, latencyHint: "64K tokens" },
  ],
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FallbackNode({ model, rank, isLast }: {
  model: typeof STATIC_ROUTES[string][0]; rank: number; isLast: boolean;
}) {
  const isPrimary = rank === 0;
  return (
    <div className="flex flex-col items-center">
      <div className={`w-full px-4 py-3 rounded-xl border transition-all ${
        isPrimary
          ? "bg-emerald-500/10 border-emerald-500/25 shadow-sm shadow-emerald-500/10"
          : "bg-zinc-900/60 border-zinc-800/50 hover:border-zinc-700/60"
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {isPrimary && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
            {!isPrimary && <span className="text-[10px] text-zinc-600 w-3 text-center">{rank + 1}</span>}
            <div>
              <div className="text-xs font-bold text-zinc-100 truncate max-w-[140px]">{model.modelId.split("/").pop()}</div>
              <div className="text-[9px] text-zinc-500 mt-0.5">{model.providerName}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`text-[9px] font-bold ${model.score >= 90 ? "text-emerald-400" : model.score >= 75 ? "text-amber-400" : "text-zinc-400"}`}>
              {model.score}
            </div>
            {model.isFree && (
              <span className="px-1 py-px bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] text-emerald-400 font-bold">FREE</span>
            )}
            <span className="text-[9px] text-zinc-600 font-mono">{model.latencyHint}</span>
          </div>
        </div>
      </div>
      {!isLast && (
        <div className="flex flex-col items-center py-1">
          <div className="w-px h-3 bg-zinc-700" />
          <ArrowDown className="w-3 h-3 text-zinc-700" />
          <div className="w-px h-1 bg-zinc-700" />
        </div>
      )}
    </div>
  );
}

function CapabilityCard({ capKey, liveRoute }: {
  capKey: string;
  liveRoute?: CapabilityRoute;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = CAPABILITY_META[capKey];
  if (!meta) return null;
  const Icon = meta.icon;
  const models = STATIC_ROUTES[capKey] || [];

  return (
    <div className={`${meta.bgColor} ${meta.borderColor} border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:shadow-black/30`}>
      {/* Cap Header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-9 h-9 rounded-xl ${meta.bgColor} ${meta.borderColor} border flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-4.5 h-4.5 ${meta.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-black text-zinc-100">{meta.label}</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">{meta.description}</p>
          </div>
          {liveRoute && (
            <div className="flex-shrink-0">
              <div className={`text-lg font-black font-mono ${meta.color}`}>{liveRoute.confidence}%</div>
              <div className="text-[8px] text-zinc-600 text-right">confidence</div>
            </div>
          )}
        </div>

        {/* Used For */}
        <div className="flex flex-wrap gap-1 mb-4">
          {meta.usedFor.map(u => (
            <span key={u} className={`px-2 py-0.5 rounded-full text-[9px] font-medium ${meta.bgColor} ${meta.color} border ${meta.borderColor}`}>{u}</span>
          ))}
        </div>

        {/* Primary model highlight */}
        {models[0] && (
          <div className="bg-zinc-900/60 rounded-xl p-3 border border-zinc-800/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[9px] text-zinc-500 uppercase tracking-widest mb-1">Primary</div>
                <div className="text-sm font-bold text-zinc-100">{models[0].modelId.split("/").pop()}</div>
                <div className="text-[10px] text-zinc-500">{models[0].providerName} · {models[0].latencyHint}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`text-lg font-black font-mono ${meta.color}`}>{models[0].score}</div>
                {models[0].isFree && <span className="px-1.5 py-px bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] text-emerald-400 font-bold">FREE</span>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fallback chain toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between px-5 py-2.5 border-t ${meta.borderColor} ${meta.bgColor} hover:opacity-80 transition-opacity text-[10px] font-semibold ${meta.color}`}
      >
        <span>View fallback chain ({models.length - 1} fallbacks)</span>
        {expanded ? <ChevronRight className="w-3 h-3 rotate-90" /> : <ChevronRight className="w-3 h-3" />}
      </button>

      {/* Full chain */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 space-y-0 border-t border-zinc-800/30 bg-zinc-950/30">
          {models.map((model, i) => (
            <FallbackNode key={model.modelId} model={model} rank={i} isLast={i === models.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// Router explanation component
function RouterExplanation() {
  const steps = [
    { cap: "SCRIPT",  model: "Gemini 2.5 Flash",  provider: "Google AI",   reason: "Highest quality + 1M context",  icon: Brain,      color: "text-violet-400" },
    { cap: "JSON",    model: "GLM-4.7-Flash",      provider: "Z.AI",        reason: "Fastest JSON mode, free",        icon: FileJson,   color: "text-cyan-400" },
    { cap: "IMAGE",   model: "Flux",               provider: "Pollinations", reason: "Unlimited, free, high quality",  icon: ImageIcon,  color: "text-rose-400" },
    { cap: "VOICE",   model: "Edge TTS",           provider: "System",       reason: "Free, no rate limit",           icon: Mic,        color: "text-orange-400" },
    { cap: "RENDER",  model: "FFmpeg",             provider: "Local",        reason: "No API cost, GPU accelerated",  icon: Cpu,        color: "text-emerald-400" },
  ];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <GitMerge className="w-4 h-4 text-zinc-400" />
        <span className="text-sm font-bold text-zinc-200">Router Explanation</span>
        <span className="text-[9px] text-zinc-600 ml-1">— how the AI selects each component for a workflow</span>
      </div>

      <div className="flex items-start gap-0 overflow-x-auto pb-2">
        {steps.map((step, i) => (
          <React.Fragment key={step.cap}>
            <div className="flex flex-col items-center flex-shrink-0 min-w-[120px]">
              <div className="bg-zinc-900 border border-zinc-700/60 rounded-xl p-3 w-full">
                <step.icon className={`w-4 h-4 ${step.color} mb-1.5`} />
                <div className={`text-[9px] font-black uppercase tracking-widest ${step.color}`}>{step.cap}</div>
                <div className="text-xs font-bold text-zinc-100 mt-1 truncate">{step.model}</div>
                <div className="text-[9px] text-zinc-500">{step.provider}</div>
                <div className="mt-2 text-[8px] text-zinc-600 italic leading-relaxed">{step.reason}</div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex items-center pt-6 px-1 flex-shrink-0">
                <ChevronRight className="w-4 h-4 text-zinc-700" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CapabilityRegistryPage() {
  const [report, setReport] = useState<SREAuditReport | null>(null);
  const [filter, setFilter] = useState<"all" | "llm" | "image" | "audio" | "data">("all");

  useEffect(() => {
    fetch("/api/sre/report").then(r => r.json()).then(d => {
      if (d.success) setReport(d.report);
    }).catch(() => {});
  }, []);

  const CAP_FILTERS: Record<string, string[]> = {
    all:   Object.keys(CAPABILITY_META),
    llm:   ["TEXT", "JSON", "REASONING", "CODE", "STREAMING", "FUNCTION_CALLING", "LONG_CONTEXT"],
    image: ["IMAGE", "VISION", "OCR"],
    audio: ["TTS"],
    data:  ["EMBEDDING"],
  };

  const visibleCaps = CAP_FILTERS[filter] || Object.keys(CAPABILITY_META);
  const liveRoutes = new Map((report?.capabilityRoutes || []).map(r => [r.capability, r]));

  const stats = {
    totalCaps: Object.keys(CAPABILITY_META).length,
    totalModels: new Set(Object.values(STATIC_ROUTES).flat().map(m => m.modelId)).size,
    totalProviders: new Set(Object.values(STATIC_ROUTES).flat().map(m => m.providerId)).size,
    freeCaps: Object.values(STATIC_ROUTES).filter(models => models[0]?.isFree).length,
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">

      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-violet-950/20 border border-zinc-800/60 rounded-2xl p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <Layers className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-zinc-50">Capability Registry</h1>
              <p className="text-xs text-zinc-500 mt-0.5">Capability → Model → Provider → Fallback — the heart of the router</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 mt-5">
            {[
              { label: `${stats.totalCaps} Capabilities`, icon: Layers,    color: "text-violet-400" },
              { label: `${stats.totalModels} Models`,     icon: Cpu,       color: "text-blue-400" },
              { label: `${stats.totalProviders} Providers`, icon: Globe,   color: "text-emerald-400" },
              { label: `${stats.freeCaps} Free Primary`,  icon: DollarSign,color: "text-amber-400" },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 border border-zinc-700/40 rounded-full">
                <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
                <span className="text-xs font-semibold text-zinc-300">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Router Explanation */}
      <RouterExplanation />

      {/* Architecture Diagram */}
      <div className="bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-5">
        <div className="text-xs font-bold text-zinc-400 mb-3 uppercase tracking-widest">Routing Architecture</div>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {["Workflow", "Capability", "Recommendation Engine", "Benchmark DB", "Capability Registry", "Router", "Model", "Provider", "Execution"].map((node, i, arr) => (
            <React.Fragment key={node}>
              <div className={`px-3 py-1.5 rounded-lg border font-semibold ${
                ["Capability", "Capability Registry", "Model"].includes(node)
                  ? "bg-violet-500/10 border-violet-500/25 text-violet-300"
                  : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400"
              }`}>{node}</div>
              {i < arr.length - 1 && <ArrowDown className="w-3 h-3 text-zinc-700 rotate-[-90deg]" />}
            </React.Fragment>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-3">The provider is the <span className="text-zinc-400 font-semibold">last layer</span>, not the first. Capabilities drive routing, not provider names.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/40 rounded-xl p-1">
        {([
          ["all",   "All Capabilities"],
          ["llm",   "LLM / Language"],
          ["image", "Visual / Image"],
          ["audio", "Audio / TTS"],
          ["data",  "Data / Embeddings"],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id as any)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              filter === id ? "bg-zinc-800 text-zinc-100 shadow" : "text-zinc-500 hover:text-zinc-300"
            }`}>{label} {id !== "all" && `(${CAP_FILTERS[id]?.length})`}</button>
        ))}
      </div>

      {/* Capability Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleCaps.map(cap => (
          <CapabilityCard key={cap} capKey={cap} liveRoute={liveRoutes.get(cap as CapabilityName)} />
        ))}
      </div>
    </div>
  );
}
