"use client";

import React, { useState, memo } from "react";
import { 
  CheckCircle2, ChevronRight, ChevronDown, ChevronUp, Bot 
} from "lucide-react";

export interface OverseerResponseData {
  id: string;
  title?: string;
  answer: string;
  rootCause?: string;
  detector?: string;
  healer?: string;
  validatorPassed?: boolean;
  currentState?: string;
  confidence?: number;
  evidence?: string[];
  actionsTaken?: string[];
  recommendations?: string[];
  structuredArtifact?: Record<string, any>;
  panelDisclosure?: "floors" | "missions" | "cases" | "decisions" | "activity";
  timestamp: string;
}

interface OverseerResponseCardProps {
  response: OverseerResponseData;
  onOpenPanel?: (panel: "floors" | "missions" | "cases" | "decisions" | "activity") => void;
  onActionClick?: (action: string) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerResponseCard: React.FC<OverseerResponseCardProps> = memo(({
  response,
  onOpenPanel,
  onActionClick,
  accentColor = "#1677FF",
  className = "",
}) => {
  const [showEvidence, setShowEvidence] = useState(false);

  const hasStructuredFields =
    response.rootCause ||
    response.detector ||
    response.healer ||
    response.validatorPassed !== undefined ||
    response.currentState ||
    response.structuredArtifact;

  return (
    <div
      className={`w-full rounded-2xl bg-[#0E1728] border border-white/[0.08] p-4 sm:p-5 shadow-2xl transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#1677FF]/10 border border-[#1677FF]/20 flex items-center justify-center text-[#1677FF]">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-mono font-bold tracking-wider text-[#F5F7FA] uppercase">
            {response.title || "OVERSEER INTELLIGENCE RESPONSE"}
          </h4>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-[#667085]">
          {response.confidence != null && (
            <span className="bg-[#1677FF]/10 text-[#1677FF] px-2 py-0.5 rounded font-bold border border-[#1677FF]/20">
              Confidence: {(response.confidence * 100).toFixed(0)}%
            </span>
          )}
          <span>{response.timestamp}</span>
        </div>
      </div>

      {/* Main Narrative Conclusion */}
      <div className="text-xs text-[#F5F7FA] font-sans leading-relaxed whitespace-pre-wrap">
        {response.answer}
      </div>

      {/* Structured Metric Grid */}
      {hasStructuredFields && (
        <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono bg-[#070D18] p-3 rounded-xl border border-white/[0.06]">
          {response.rootCause && (
            <div>
              <span className="text-[9px] text-[#667085] uppercase block font-bold">Root Cause</span>
              <span className="text-[#F5F7FA] font-semibold">{response.rootCause}</span>
            </div>
          )}
          {response.detector && (
            <div>
              <span className="text-[9px] text-[#667085] uppercase block font-bold">Detector</span>
              <span className="text-[#F5B942] font-semibold">{response.detector}</span>
            </div>
          )}
          {response.healer && (
            <div>
              <span className="text-[9px] text-[#667085] uppercase block font-bold">Repair Healer</span>
              <span className="text-[#4D8DFF] font-semibold">{response.healer}</span>
            </div>
          )}
          {response.validatorPassed !== undefined && (
            <div>
              <span className="text-[9px] text-[#667085] uppercase block font-bold">Verification</span>
              <span className={response.validatorPassed ? "text-[#19C37D] font-bold" : "text-[#FF5A67] font-bold"}>
                {response.validatorPassed ? "PASSED (100%)" : "FAILED"}
              </span>
            </div>
          )}
          {response.currentState && (
            <div>
              <span className="text-[9px] text-[#667085] uppercase block font-bold">Current State</span>
              <span className="text-[#19C37D] font-bold">{response.currentState}</span>
            </div>
          )}
        </div>
      )}

      {/* Structured Quiz Short Payload Preview */}
      {response.structuredArtifact && (
        <div className="mt-3 p-3 rounded-xl bg-[#1677FF]/10 border border-[#1677FF]/20 text-xs font-mono space-y-1.5">
          <div className="flex items-center justify-between font-bold text-[#1677FF]">
            <span>🎬 Pipelined Quiz Short Generation Mission</span>
            <span className="text-[10px] bg-[#1677FF]/20 px-2 py-0.5 rounded text-[#1677FF]">
              {response.structuredArtifact.durationSeconds || 30}s Duration
            </span>
          </div>
          <p className="text-[#A8B2C1]">Topic: <strong className="text-[#F5F7FA]">{response.structuredArtifact.topic}</strong></p>
          <p className="text-[#A8B2C1]">
            Generated Questions: {response.structuredArtifact.questions?.length || 2} verified challenge questions
          </p>
          <div className="text-[11px] text-[#19C37D] flex items-center gap-1 mt-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Dispatched to Floor 01 Strategy & Floor 02 Scripting swarms</span>
          </div>
        </div>
      )}

      {/* Actions Taken */}
      {response.actionsTaken && response.actionsTaken.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.08] space-y-1 text-xs font-mono">
          <span className="text-[10px] text-[#19C37D] uppercase font-bold tracking-wider">
            Authoritative Swarm Actions:
          </span>
          {response.actionsTaken.map((act, i) => (
            <p key={i} className="text-[#19C37D] text-[11px]">
              ✓ {act}
            </p>
          ))}
        </div>
      )}

      {/* Evidence Toggle & Disclosure Buttons */}
      <div className="mt-3.5 pt-3 border-t border-white/[0.08] flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {response.evidence && response.evidence.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEvidence(!showEvidence)}
              className="px-2.5 py-1 rounded-lg bg-[#070D18] hover:bg-[#121E32] border border-white/[0.08] text-[11px] font-mono text-[#F5F7FA] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{showEvidence ? "Hide Evidence" : `Show Evidence (${response.evidence.length})`}</span>
              {showEvidence ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}

          {response.panelDisclosure && (
            <button
              type="button"
              onClick={() => onOpenPanel?.(response.panelDisclosure!)}
              className="px-2.5 py-1 rounded-lg bg-[#1677FF]/10 hover:bg-[#1677FF]/20 border border-[#1677FF]/30 text-[11px] font-mono font-bold text-[#1677FF] transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>View {response.panelDisclosure.toUpperCase()} HUD</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>

        <span className="text-[10px] font-mono text-[#667085]">
          Grounded in ShortForge Decision Ledger
        </span>
      </div>

      {/* Collapsible Evidence Section */}
      {showEvidence && response.evidence && (
        <div className="mt-2.5 p-3 rounded-xl bg-[#F5B942]/10 border border-[#F5B942]/20 space-y-1 text-xs font-mono animate-fade-in">
          <span className="text-[10px] text-[#F5B942] font-bold uppercase">
            Operational Proof:
          </span>
          {response.evidence.map((ev, i) => (
            <p key={i} className="text-[#F5B942] text-[11px]">
              • {ev}
            </p>
          ))}
        </div>
      )}
    </div>
  );
});

OverseerResponseCard.displayName = "OverseerResponseCard";
