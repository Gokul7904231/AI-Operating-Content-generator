"use client";

import React, { useRef, useEffect, memo, useState } from "react";
import { Bot, User, ChevronDown, ChevronUp, Layers, Film, ArrowRight } from "lucide-react";
import type { ChatMessage, OverseerMode } from "./OverseerChat";
import type { DisclosurePanel } from "./OverseerProgressiveDisclosure";

interface OverseerConversationProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  onOpenPanel?: (panel: DisclosurePanel) => void;
  onQuickPrompt?: (prompt: string, mode?: OverseerMode) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerConversation: React.FC<OverseerConversationProps> = memo(({
  messages,
  isLoading = false,
  onOpenPanel,
  onQuickPrompt,
  accentColor = "#1769E8",
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={`w-full max-h-[260px] sm:max-h-[300px] overflow-y-auto terminal-scroll px-2 py-2 space-y-3 select-text ${className}`}
      role="log"
      aria-label="Overseer Conversation Stream"
    >
      {messages.map((msg) => {
        const isUser = msg.sender === "user";
        const isEvidenceOpen = Boolean(expandedEvidence[msg.id]);

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isUser ? "items-end" : "items-start"} animate-fade-in`}
          >
            {/* Identity & Timestamp Header */}
            <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#667085] dark:text-[#A7B0BC]">
              {isUser ? (
                <>
                  <span>You</span>
                  <User className="w-3 h-3 text-[#1769E8]" />
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-[#1769E8]" />
                  <span className="font-semibold text-[#111827] dark:text-[#F5F7FA]">Overseer</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </>
              )}
            </div>

            {/* Clean Apple Message Body */}
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed transition-all shadow-2xs ${
                isUser
                  ? "bg-[#1769E8]/12 dark:bg-[#1769E8]/20 border border-[#1769E8]/30 text-[#111827] dark:text-[#F5F7FA] rounded-tr-xs"
                  : "bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] text-[#111827] dark:text-[#F5F7FA] rounded-tl-xs"
              }`}
            >
              {/* Message text */}
              <div className="whitespace-pre-wrap font-sans font-normal">
                {msg.text}
              </div>

              {/* Structured Quiz Artifact Preview (if present) */}
              {msg.structuredArtifact && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-[#050A12] border border-[#1769E8]/30 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold uppercase text-[#1769E8] flex items-center gap-1">
                      <Film className="w-3.5 h-3.5" /> 30s Quiz Pipeline
                    </span>
                    <span className="text-[10px] font-mono text-[#21C58B] font-bold">
                      ● Mission Active
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-[#111827] dark:text-[#F5F7FA]">
                    {msg.structuredArtifact.topic}
                  </div>
                  <div className="text-[10px] text-[#667085] dark:text-[#A7B0BC] italic">
                    &ldquo;{msg.structuredArtifact.hook}&rdquo;
                  </div>
                </div>
              )}

              {/* Evidence Pills */}
              {msg.evidence && msg.evidence.length > 0 && (
                <div className="mt-2 pt-1.5 border-t border-black/[0.04] dark:border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => toggleEvidence(msg.id)}
                    className="flex items-center gap-1 text-[10px] font-mono text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] cursor-pointer transition-colors"
                  >
                    <span>{isEvidenceOpen ? "Hide" : "Show"} Evidence ({msg.evidence.length})</span>
                    {isEvidenceOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {isEvidenceOpen && (
                    <div className="mt-1.5 space-y-1 bg-black/[0.02] dark:bg-[#050A12] p-2 rounded-lg border border-black/[0.04] dark:border-white/[0.06]">
                      {msg.evidence.map((ev, i) => (
                        <div key={i} className="text-[10px] font-mono text-[#667085] dark:text-[#A7B0BC] flex items-start gap-1.5">
                          <span className="text-[#1769E8] font-bold">›</span>
                          <span>{ev}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Action HUD links */}
              {msg.panelDisclosure && onOpenPanel && (
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenPanel(msg.panelDisclosure!)}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-black/[0.04] dark:bg-[#0D1622] hover:bg-black/[0.08] dark:hover:bg-[#121E30] border border-black/[0.06] dark:border-white/[0.08] text-[10px] font-mono font-bold text-[#1769E8] transition-colors cursor-pointer"
                  >
                    <Layers className="w-3 h-3" />
                    <span>View {msg.panelDisclosure.toUpperCase()}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Thinking State */}
      {isLoading && (
        <div className="flex flex-col items-start animate-fade-in">
          <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-[#667085] dark:text-[#A7B0BC]">
            <Bot className="w-3 h-3 text-[#1769E8]" />
            <span className="font-semibold text-[#111827] dark:text-[#F5F7FA]">Overseer</span>
          </div>
          <div className="bg-white dark:bg-[#08101B] border border-black/[0.06] dark:border-white/[0.08] rounded-2xl rounded-tl-xs p-2.5 flex items-center gap-2 text-xs font-mono text-[#667085] dark:text-[#A7B0BC] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1769E8] animate-ping" />
            <span>Thinking...</span>
          </div>
        </div>
      )}
    </div>
  );
});

OverseerConversation.displayName = "OverseerConversation";
