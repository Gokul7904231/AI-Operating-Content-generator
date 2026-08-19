"use client";

import React, { useState, memo, useRef, useEffect } from "react";
import { ArrowUp, ChevronDown, MessageSquare, Wrench, Search, Sparkles, Activity, Zap } from "lucide-react";
import { OverseerVoice } from "./OverseerVoice";
import type { VoiceState } from "@/factoryos/core/overseer/presence";
import type { OverseerMode } from "./OverseerChat";

interface OverseerCommandComposerProps {
  onSendCommand: (command: string, isVoice?: boolean, context?: string, mode?: OverseerMode) => Promise<void>;
  isLoading?: boolean;
  voiceState: VoiceState;
  currentMode: OverseerMode;
  onModeChange?: (mode: OverseerMode) => void;
  accentColor?: string;
  className?: string;
}

const MODE_OPTIONS: Array<{ id: OverseerMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "CHAT", label: "Chat", icon: MessageSquare },
  { id: "OPERATE", label: "Operate", icon: Wrench },
  { id: "RESEARCH", label: "Research", icon: Search },
  { id: "CREATE", label: "Create", icon: Sparkles },
  { id: "MONITOR", label: "Monitor", icon: Activity },
  { id: "AUTOPILOT", label: "Autopilot", icon: Zap },
];

export const OverseerCommandComposer: React.FC<OverseerCommandComposerProps> = memo(({
  onSendCommand,
  isLoading = false,
  voiceState,
  currentMode,
  onModeChange,
  accentColor = "#1769E8",
  className = "",
}) => {
  const [inputText, setInputText] = useState("");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const typingIntervalRef = useRef<any>(null);

  // Subtle procedural typing sound generator for text generation
  useEffect(() => {
    if (isLoading && voiceState !== "SPEAKING") {
      // Start typing sound ticks
      try {
        if (!audioCtxRef.current && typeof window !== "undefined") {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume();
        }

        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

        typingIntervalRef.current = setInterval(() => {
          if (!audioCtxRef.current || audioCtxRef.current.state !== "running") return;
          try {
            const ctx = audioCtxRef.current;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(1600 + Math.random() * 800, now);
            gain.gain.setValueAtTime(0.012, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
          } catch {
            // Ignore audio tick failures
          }
        }, 80 + Math.random() * 50);
      } catch {
        // Web Audio not initialized yet
      }
    } else {
      // Stop typing sound ticks immediately
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    }

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [isLoading, voiceState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;
    const text = inputText.trim();
    setInputText("");
    await onSendCommand(text, false, "factory", currentMode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const currentModeObj = MODE_OPTIONS.find((m) => m.id === currentMode) || MODE_OPTIONS[0];
  const CurrentIcon = currentModeObj.icon;

  const getPlaceholder = () => {
    switch (currentMode) {
      case "CREATE":
        return "Describe short to create (e.g. 'Make a quiz short about Space')...";
      case "RESEARCH":
        return "Ask for intelligence or trend research (e.g. 'Research video pacing')...";
      case "OPERATE":
        return "Issue operational command to FactoryOS swarms...";
      case "MONITOR":
        return "Query telemetry or buffer status (e.g. 'Inspect Floor 03')...";
      case "AUTOPILOT":
        return "Configure autopilot bounds or trigger replanning...";
      case "CHAT":
      default:
        return "Ask Overseer anything about factory health or pipeline...";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full relative flex items-center gap-2 p-1.5 rounded-full bg-white dark:bg-[#08101B] border border-black/[0.08] dark:border-white/[0.10] shadow-xs focus-within:border-[#1769E8] focus-within:ring-2 focus-within:ring-[#1769E8]/20 transition-all duration-150 ${className}`}
    >
      {/* 1. Operations Mode Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-[#0D1622] text-[11px] font-sans font-medium text-[#111827] dark:text-[#F5F7FA] hover:bg-black/[0.08] dark:hover:bg-[#121E30] transition-colors cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
        >
          <CurrentIcon className="w-3.5 h-3.5 text-[#1769E8]" />
          <span>{currentModeObj.label}</span>
          <ChevronDown className="w-3 h-3 text-[#667085] dark:text-[#A7B0BC]" />
        </button>

        {showModeDropdown && (
          <div className="absolute left-0 bottom-full mb-2 w-44 rounded-2xl bg-white dark:bg-[#0D1622] border border-black/[0.08] dark:border-white/[0.12] shadow-xl overflow-hidden z-50 py-1.5 text-xs font-sans">
            <span className="px-3 py-1 text-[9px] font-mono font-bold text-[#667085] dark:text-[#A7B0BC] uppercase block">
              Operation Mode
            </span>
            {MODE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = currentMode === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (onModeChange) onModeChange(opt.id);
                    setShowModeDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 flex items-center gap-2 text-left font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? "bg-[#1769E8]/10 text-[#1769E8] font-bold"
                      : "text-[#667085] dark:text-[#A7B0BC] hover:bg-black/[0.04] dark:hover:bg-[#121E30] hover:text-[#111827] dark:hover:text-[#F5F7FA]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#1769E8]" : "text-[#667085] dark:text-[#A7B0BC]"}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Text Command Input */}
      <input
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        disabled={isLoading}
        aria-label="Command composer input"
        className="flex-1 bg-transparent border-none outline-none px-2 py-1.5 text-xs sm:text-sm text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#98A2B3] dark:placeholder:text-[#667085] font-sans"
      />

      {/* 3. Voice Input Button */}
      <OverseerVoice
        voiceState={voiceState}
        onTranscriptReady={(transcript) => onSendCommand(transcript, true, "factory", currentMode)}
        accentColor={accentColor}
      />

      {/* 4. Submit Arrow Button */}
      <button
        type="submit"
        disabled={!inputText.trim() || isLoading}
        aria-label="Send command to Overseer"
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 flex-shrink-0 ${
          inputText.trim() && !isLoading
            ? "bg-[#1769E8] text-white hover:bg-[#0F58CA] shadow-2xs cursor-pointer active:scale-95"
            : "bg-black/[0.04] dark:bg-[#0D1622] text-[#98A2B3] dark:text-[#667085] cursor-not-allowed"
        }`}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </form>
  );
});

OverseerCommandComposer.displayName = "OverseerCommandComposer";
