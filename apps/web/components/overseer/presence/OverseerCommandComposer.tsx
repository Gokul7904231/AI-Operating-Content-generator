"use client";

import React, { useState, memo, useRef } from "react";
import {
  ArrowUp,
  ChevronDown,
  MessageSquare,
  Wrench,
  Search,
  Activity,
  Zap,
} from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { OverseerVoice } from "./OverseerVoice";
import type { VoiceState } from "@/factoryos/core/overseer/presence";
import type { OverseerMode } from "./OverseerChat";

interface OverseerCommandComposerProps {
  onSendCommand: (command: string, isVoice?: boolean, context?: string, mode?: OverseerMode) => Promise<void>;
  isLoading?: boolean;
  voiceState?: VoiceState;
  currentMode: OverseerMode;
  onModeChange?: (mode: OverseerMode) => void;
  accentColor?: string;
  className?: string;
}

const MODE_OPTIONS: Array<{
  id: OverseerMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: "CHAT", label: "Chat", icon: MessageSquare },
  { id: "OPERATE", label: "Operate", icon: Wrench },
  { id: "RESEARCH", label: "Research", icon: Search },
  { id: "CREATE", label: "Create", icon: BrandIcon },
  { id: "MONITOR", label: "Monitor", icon: Activity },
  { id: "AUTOPILOT", label: "Autopilot", icon: Zap },
];

export const OverseerCommandComposer: React.FC<OverseerCommandComposerProps> = memo(({
  onSendCommand,
  isLoading = false,
  currentMode,
  onModeChange,
  className = "",
}) => {
  const [inputText, setInputText] = useState("");
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

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

  const handleDictateTranscript = (transcript: string) => {
    setInputText(transcript);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const currentModeObj = MODE_OPTIONS.find((m) => m.id === currentMode) || MODE_OPTIONS[0];
  const CurrentIcon = currentModeObj.icon;

  const getPlaceholder = () => {
    if (isVoiceListening) {
      return "Listening to your voice... (speak now)";
    }
    switch (currentMode) {
      case "CREATE":
        return "Describe short to create (e.g. 'Make a quiz short about Space')...";
      case "RESEARCH":
        return "Ask for intelligence or trend research...";
      case "OPERATE":
        return "Issue operational command to FactoryOS swarms...";
      case "MONITOR":
        return "Query telemetry or buffer status...";
      case "AUTOPILOT":
        return "Configure autopilot bounds or trigger replanning...";
      case "CHAT":
      default:
        return "Ask Overseer anything...";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`w-full max-w-2xl mx-auto relative flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-full bg-white dark:bg-[#0A1220] border transition-all duration-200 ${
        isVoiceListening
          ? "border-[#1677FF] ring-2 ring-[#1677FF]/30 shadow-[0_0_20px_rgba(22,119,255,0.2)]"
          : "border-black/[0.08] dark:border-white/[0.12] shadow-sm focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-[#1677FF]/20"
      } ${className}`}
    >
      {/* 1. Left Action / Mode Dropdown */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          aria-label="Open message actions"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-[#0D1622] text-[11px] font-sans font-medium text-[#111827] dark:text-[#F5F7FA] hover:bg-black/[0.08] dark:hover:bg-[#121E30] transition-colors cursor-pointer border border-black/[0.06] dark:border-white/[0.08]"
        >
          <CurrentIcon className="w-3.5 h-3.5 text-[#1677FF]" />
          <span>{currentModeObj.label}</span>
          <ChevronDown className="w-3 h-3 text-[#667085] dark:text-[#A8B2C1]" />
        </button>

        {showModeDropdown && (
          <div className="absolute left-0 bottom-full mb-2 w-44 rounded-2xl bg-white dark:bg-[#0D1622] border border-black/[0.08] dark:border-white/[0.12] shadow-xl overflow-hidden z-50 py-1.5 text-xs font-sans animate-in fade-in zoom-in-95 duration-100">
            <span className="px-3 py-1 text-[9px] font-mono font-bold text-[#667085] dark:text-[#A8B2C1] uppercase block">
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
                      ? "bg-[#1677FF]/10 text-[#1677FF] font-bold"
                      : "text-[#667085] dark:text-[#A8B2C1] hover:bg-black/[0.04] dark:hover:bg-[#121E30] hover:text-[#111827] dark:hover:text-[#F5F7FA]"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-[#1677FF]" : "text-[#667085] dark:text-[#A8B2C1]"}`} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Text Command Input */}
      <input
        ref={inputRef}
        type="text"
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder()}
        disabled={isLoading}
        aria-label="Ask Overseer anything"
        className="flex-1 bg-transparent border-none outline-none px-2 py-1.5 text-xs sm:text-sm text-[#111827] dark:text-[#F5F7FA] placeholder:text-[#98A2B3] dark:placeholder:text-[#667085] font-sans"
      />

      {/* 3. Real Voice Input Microphone Button with ChatGPT Visualizer */}
      <OverseerVoice
        onDictateTranscript={handleDictateTranscript}
        onListeningStateChange={setIsVoiceListening}
      />

      {/* 4. Submit Arrow Button */}
      <button
        type="submit"
        disabled={!inputText.trim() || isLoading}
        aria-label="Send command to Overseer"
        className={`flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 flex-shrink-0 ${
          inputText.trim() && !isLoading
            ? "bg-[#1677FF] text-white hover:bg-[#0F63D8] shadow-xs cursor-pointer active:scale-95"
            : "bg-black/[0.04] dark:bg-[#0D1622] text-[#98A2B3] dark:text-[#667085] cursor-not-allowed"
        }`}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </form>
  );
});

OverseerCommandComposer.displayName = "OverseerCommandComposer";
