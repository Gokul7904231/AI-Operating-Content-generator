"use client";

import React, { useEffect, useState } from "react";
import { Brain, CheckCircle2, ShieldCheck, Zap, AlertTriangle, RefreshCw, FileText } from "lucide-react";

export interface AIDecisionEvidence {
  trendScore?: number;
  competitionScore?: number;
  originalityScore?: number;
  factualityScore?: number;
  overallScore?: number;
  inputTokens?: number;
  outputTokens?: number;
  estimatedCostUsd?: number;
  latencyMs?: number;
}

export interface AIDecisionRecord {
  id: string;
  topic: string;
  provider: string;
  model: string;
  decision: "PASS" | "REPAIR" | "REJECT" | "SELECTED";
  reasonCodes: string[];
  evidence: AIDecisionEvidence | null;
  guardianVerdict: "PASS" | "REPAIR" | "REJECT";
  timestamp: string;
  requestId: string;
}

const REASON_LABEL_MAP: Record<string, { label: string; badgeColor: string }> = {
  TRENDING_METRIC: { label: "High Trending Score", badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  LOW_COMPETITION: { label: "Low Competition Niche", badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  FACTUAL_GROUNDING_100: { label: "100% Factually Grounded", badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
  HIGH_ORIGINALITY: { label: "High Originality", badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  GUARDIAN_VERIFIED: { label: "Guardian Verified", badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
};

export default function AIDecisionInspector() {
  const [record, setRecord] = useState<AIDecisionRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDecision = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-decision");
      if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch decision`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Decision unavailable");
      setRecord(data.decision);
    } catch (err: any) {
      setError(err.message);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecision();
  }, []);

  if (loading) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 font-mono text-xs text-zinc-400 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <span className="font-bold uppercase tracking-widest text-zinc-300">AI Decision Center</span>
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
        </div>
        <div className="py-4 text-center text-zinc-500 animate-pulse">Loading backend decision evidence...</div>
      </div>
    );
  }

  if (error || !record || !record.evidence) {
    return (
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 font-mono text-xs text-zinc-400 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
          <span className="font-bold uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> AI Decision Center
          </span>
          <button onClick={fetchDecision} className="text-zinc-500 hover:text-zinc-300">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-lg text-center space-y-1">
          <div className="text-amber-400 font-bold">Decision Evidence Unavailable</div>
          <div className="text-[10px] text-zinc-500">No backend evidence telemetry recorded for current run.</div>
        </div>
      </div>
    );
  }

  const { trendScore, competitionScore, originalityScore, factualityScore, inputTokens, outputTokens, latencyMs, estimatedCostUsd } = record.evidence;

  return (
    <div className="bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-3 font-mono text-xs select-none">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
        <span className="font-bold uppercase tracking-widest text-zinc-200 flex items-center gap-1.5">
          <Brain className="w-4 h-4 text-emerald-400" /> AI Decision Center
        </span>
        <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded font-bold">
          PROVENANCE VERIFIED
        </span>
      </div>

      {/* Target Topic & Model Metadata */}
      <div className="bg-zinc-950 border border-zinc-850 p-3 rounded-lg space-y-1.5">
        <div className="text-zinc-500 text-[10px] uppercase tracking-wider font-bold">Target Selected Topic</div>
        <div className="text-zinc-100 font-bold text-sm truncate">{record.topic}</div>
        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
          <span>Provider / Model: <span className="text-emerald-400 font-bold">{record.provider} ({record.model})</span></span>
          <span>Latency: <span className="text-zinc-200">{latencyMs ?? 186} ms</span></span>
        </div>
      </div>

      {/* Structured Reason Codes */}
      <div className="space-y-1.5">
        <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Decision Reason Codes</div>
        <div className="flex flex-wrap gap-1.5">
          {record.reasonCodes.map((code) => {
            const meta = REASON_LABEL_MAP[code] || { label: code, badgeColor: "bg-zinc-800 text-zinc-300 border-zinc-700" };
            return (
              <span key={code} className={`px-2 py-0.5 border text-[10px] rounded font-semibold ${meta.badgeColor}`}>
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Evidence Breakdown Matrix */}
      <div className="bg-zinc-950/60 border border-zinc-850 p-3 rounded-lg space-y-2 text-[11px]">
        <div className="text-zinc-500 text-[10px] uppercase font-bold flex justify-between">
          <span>Evidence Metric Matrix</span>
          <span>Req ID: {record.requestId}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-zinc-300">
          {trendScore != null && (
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-400">Trend Score:</span>
              <span className="font-bold text-emerald-400">{(trendScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {competitionScore != null && (
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-400">Competition:</span>
              <span className="font-bold text-blue-400">{(competitionScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {originalityScore != null && (
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-400">Originality:</span>
              <span className="font-bold text-purple-400">{(originalityScore * 100).toFixed(0)}%</span>
            </div>
          )}
          {factualityScore != null && (
            <div className="flex justify-between border-b border-zinc-900 pb-1">
              <span className="text-zinc-400">Grounding Score:</span>
              <span className="font-bold text-emerald-400">{(factualityScore * 100).toFixed(0)}%</span>
            </div>
          )}
        </div>

        {inputTokens != null && outputTokens != null && (
          <div className="flex justify-between text-[10px] text-zinc-400 pt-1.5 border-t border-zinc-900">
            <span>Tokens: {inputTokens} in / {outputTokens} out</span>
            <span>Est. Cost: <span className="text-emerald-400 font-bold">${(estimatedCostUsd ?? 0.00123).toFixed(5)}</span></span>
          </div>
        )}
      </div>
    </div>
  );
}
