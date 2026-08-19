"use client";

import React, { useState, useRef, useEffect, memo } from "react";
import { 
  Send, Sparkles, Terminal, ChevronRight, MessageSquare, Bot, Search, 
  Video, Eye, Zap
} from "lucide-react";
import { OverseerVoice } from "./OverseerVoice";
import type { VoiceState } from "@/factoryos/core/overseer/presence";

export type OverseerMode = "CHAT" | "OPERATE" | "RESEARCH" | "CREATE" | "MONITOR" | "AUTOPILOT";

export interface ChatMessage {
  id: string;
  sender: "user" | "overseer";
  text: string;
  evidence?: string[];
  actionsTaken?: string[];
  recommendations?: string[];
  structuredArtifact?: Record<string, any>;
  panelDisclosure?: "floors" | "missions" | "cases" | "decisions" | "activity";
  timestamp: string;
}

interface OverseerChatProps {
  messages: ChatMessage[];
  onSendMessage: (text: string, isVoice?: boolean, mode?: OverseerMode) => Promise<void>;
  isLoading?: boolean;
  voiceState: VoiceState;
  onOpenPanel?: (panel: "floors" | "missions" | "cases" | "decisions" | "activity") => void;
  accentColor?: string;
  currentMode?: OverseerMode;
  onModeChange?: (mode: OverseerMode) => void;
  className?: string;
}

const MODES: { id: OverseerMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "CHAT", label: "Chat", icon: MessageSquare },
  { id: "OPERATE", label: "Operate", icon: Bot },
  { id: "RESEARCH", label: "Research", icon: Search },
  { id: "CREATE", label: "Create", icon: Video },
  { id: "MONITOR", label: "Monitor", icon: Eye },
  { id: "AUTOPILOT", label: "Autopilot", icon: Zap },
];

const QUICK_ACTIONS = [
  { label: "Make Quiz Short", prompt: "Create a 30 second quiz short on World History & Science", mode: "CREATE" as OverseerMode },
  { label: "Generate Short", prompt: "Generate an automated documentary short on AI breakthroughs", mode: "CREATE" as OverseerMode },
  { label: "Inspect Factory", prompt: "Inspect factory status and all 4 production floors", mode: "MONITOR" as OverseerMode },
  { label: "Research Trends", prompt: "Research trending topics and high-retention trivia formats", mode: "RESEARCH" as OverseerMode },
  { label: "Run Diagnostics", prompt: "Fix this bug and run engineering diagnostics on pipeline", mode: "OPERATE" as OverseerMode },
];

export const OverseerChat: React.FC<OverseerChatProps> = memo(({
  messages,
  onSendMessage,
  isLoading = false,
  voiceState,
  onOpenPanel,
  accentColor = "#1677FF",
  currentMode = "OPERATE",
  onModeChange,
  className = "",
}) => {
  const [inputText, setInputText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, showHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText("");
    await onSendMessage(text, false, currentMode);
  };

  const handleActionClick = async (prompt: string, mode: OverseerMode) => {
    if (isLoading) return;
    onModeChange?.(mode);
    await onSendMessage(prompt, false, mode);
  };

  const latestMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  return (
    <div className={`w-full max-w-3xl mx-auto flex flex-col items-center gap-3.5 ${className}`}>
      {/* 1. Overseer Compact Mode Selector Bar */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#070D18] border border-white/[0.08] shadow-md overflow-x-auto max-w-full">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = currentMode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange?.(m.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all duration-200 cursor-pointer ${
                isActive
                  ? "bg-[#1677FF] text-white shadow-xs"
                  : "text-[#A8B2C1] hover:text-[#F5F7FA] hover:bg-[#121E32]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. Proactive Insights / Recommendations Banner */}
      {latestMessage?.recommendations && latestMessage.recommendations.length > 0 && (
        <div className="w-full rounded-2xl bg-[#1677FF]/10 border border-[#1677FF]/20 p-3.5 text-xs text-[#F5F7FA] space-y-1.5 shadow-lg animate-fade-in">
          <div className="flex items-center justify-between font-mono text-[11px] font-bold text-[#1677FF] uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#1677FF]" />
              Proactive Intelligence HUD
            </span>
            <span className="text-[9px] bg-[#1677FF]/20 px-2 py-0.5 rounded text-[#1677FF]">Confidence: 94%</span>
          </div>
          {latestMessage.recommendations.map((rec, i) => (
            <p key={i} className="text-[11px] text-[#A8B2C1]">
              • {rec}
            </p>
          ))}
        </div>
      )}

      {/* 3. Collapsible Message History Drawer */}
      {showHistory && (
        <div className="w-full max-h-80 overflow-y-auto rounded-2xl bg-[#070D18] border border-white/[0.08] p-4 space-y-3 shadow-2xl transition-all terminal-scroll">
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.08] text-xs font-mono text-[#667085]">
            <span className="flex items-center gap-1.5 text-[#1677FF]">
              <Terminal className="w-3.5 h-3.5" />
              OVERSEER COMMAND & CONVERSATION LOG
            </span>
            <button
              type="button"
              onClick={() => setShowHistory(false)}
              className="text-[#667085] hover:text-[#F5F7FA] cursor-pointer"
            >
              Hide Log
            </button>
          </div>

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col gap-1.5 text-xs ${
                m.sender === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`px-4 py-3 rounded-2xl max-w-[88%] leading-relaxed ${
                  m.sender === "user"
                    ? "bg-[#0B4EA8]/15 border border-[#1677FF]/25 text-[#F5F7FA] rounded-br-none"
                    : "bg-[#0E1728] border border-white/[0.08] text-[#F5F7FA] rounded-bl-none shadow-xs"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>

                {/* Evidence Citations */}
                {m.evidence && m.evidence.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-white/[0.06] space-y-1">
                    <span className="text-[10px] font-mono text-[#667085] uppercase font-bold">
                      Operational Evidence:
                    </span>
                    {m.evidence.map((ev, i) => (
                      <p key={i} className="text-[11px] font-mono text-[#F5B942] truncate">
                        • {ev}
                      </p>
                    ))}
                  </div>
                )}

                {/* Actions Taken */}
                {m.actionsTaken && m.actionsTaken.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-white/[0.06] space-y-1">
                    <span className="text-[10px] font-mono text-[#19C37D] uppercase font-bold">
                      Actions Executed:
                    </span>
                    {m.actionsTaken.map((act, i) => (
                      <p key={i} className="text-[11px] font-mono text-[#19C37D] truncate">
                        ✓ {act}
                      </p>
                    ))}
                  </div>
                )}

                {/* Structured Quiz Artifact Preview */}
                {m.structuredArtifact && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#0A1220] border border-white/[0.08] space-y-1 text-[11px] font-mono">
                    <span className="text-[#1677FF] font-bold">🎬 Structured Quiz Short Payload</span>
                    <p className="text-[#A8B2C1]">Topic: {m.structuredArtifact.topic}</p>
                    <p className="text-[#A8B2C1]">Questions: {m.structuredArtifact.questions?.length} generated</p>
                    <p className="text-[#19C37D]">Pipelined to 9-Stage Factory Pipeline</p>
                  </div>
                )}

                {/* Progressive Disclosure Link Button */}
                {m.panelDisclosure && (
                  <button
                    type="button"
                    onClick={() => onOpenPanel?.(m.panelDisclosure!)}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1677FF]/10 border border-[#1677FF]/30 text-[11px] font-mono font-bold text-[#1677FF] hover:bg-[#1677FF]/20 transition-colors cursor-pointer"
                  >
                    <span>View {m.panelDisclosure.toUpperCase()} HUD</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="text-[10px] font-mono text-[#667085] px-1">{m.timestamp}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* 4. Quick Action Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap px-2">
        {QUICK_ACTIONS.map((action, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleActionClick(action.prompt, action.mode)}
            className="text-xs font-sans px-3 py-1.5 rounded-full bg-[#0E1728] border border-white/[0.08] text-[#A8B2C1] hover:text-[#1677FF] hover:border-[#1677FF]/40 hover:bg-[#121E32] transition-all duration-150 shadow-xs cursor-pointer"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* 5. Main Conversational Input Bar */}
      <form
        onSubmit={handleSubmit}
        className="w-full relative flex items-center gap-2 p-1.5 rounded-full bg-[#070D18] border border-white/[0.10] shadow-lg focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-[#1677FF]/20 transition-all duration-150"
      >
        <OverseerVoice
          voiceState={voiceState}
          onTranscriptReady={(transcript) => onSendMessage(transcript, true, currentMode)}
          accentColor={accentColor}
        />

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`Ask Overseer (${currentMode} mode: e.g. "Make me a quiz short" or "Inspect Floor 03")...`}
          disabled={isLoading}
          className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm text-[#F5F7FA] placeholder:text-[#667085] font-sans"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          aria-label="Send prompt to Overseer"
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 ${
            inputText.trim() && !isLoading
              ? "bg-[#1677FF] text-white hover:bg-[#0F63D8] shadow-md cursor-pointer"
              : "bg-[#0E1728] text-[#667085] cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

      {/* Toggle History Button & Quick Count */}
      <div className="flex items-center justify-between w-full px-4 text-[11px] font-mono text-[#667085]">
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 hover:text-[#1677FF] transition-colors cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{showHistory ? "Hide Message History" : `Show Message History (${messages.length})`}</span>
        </button>

        <span className="text-[10px] text-[#667085]">
          Supervising FactoryOS Core • Mode: <strong className="text-[#1677FF]">{currentMode}</strong>
        </span>
      </div>
    </div>
  );
});

OverseerChat.displayName = "OverseerChat";
