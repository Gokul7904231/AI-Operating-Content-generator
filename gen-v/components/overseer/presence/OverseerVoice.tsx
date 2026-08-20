"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Mic, MicOff } from "lucide-react";
import type { VoiceState } from "@/factoryos/core/overseer/presence";
import { OverseerVoiceEngine } from "./OverseerVoiceEngine";

interface OverseerVoiceProps {
  voiceState?: VoiceState;
  onDictateTranscript?: (transcript: string) => void;
  onTranscriptReady?: (transcript: string) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerVoice: React.FC<OverseerVoiceProps> = memo(({
  onDictateTranscript,
  onTranscriptReady,
  className = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const engineRef = useRef<OverseerVoiceEngine | null>(null);

  useEffect(() => {
    const engine = new OverseerVoiceEngine({
      onListeningStart: () => {
        setIsListening(true);
      },
      onListeningEnd: () => {
        setIsListening(false);
      },
      onInterimTranscript: (text) => {
        (onDictateTranscript || onTranscriptReady)?.(text);
      },
      onFinalTranscript: (text) => {
        (onDictateTranscript || onTranscriptReady)?.(text);
        setIsListening(false);
      },
      onError: () => {
        setIsListening(false);
      },
    });

    engineRef.current = engine;

    // Keyboard shortcut: Ctrl + Shift + D
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault();
        toggleListening();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      engine.stopListening();
    };
  }, [onDictateTranscript, onTranscriptReady]);

  const toggleListening = () => {
    if (!engineRef.current) return;
    if (isListening) {
      engineRef.current.stopListening();
      setIsListening(false);
    } else {
      setIsListening(true);
      engineRef.current.startDictation();
    }
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        aria-label={isListening ? "Stop voice input" : "Start voice input (Ctrl + Shift + D)"}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-150 cursor-pointer ${
          isListening
            ? "bg-[#1677FF]/20 text-[#1677FF] border border-[#1677FF] shadow-[0_0_12px_rgba(22,119,255,0.4)] animate-pulse"
            : "text-[#667085] dark:text-[#A8B2C1] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
        }`}
      >
        {isListening ? (
          <Mic className="w-4 h-4 text-[#1677FF]" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 right-0 px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-[11px] font-sans font-medium whitespace-nowrap shadow-lg z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100 border border-white/10">
          <span>{isListening ? "Listening..." : "Voice Input"}</span>
          <span className="px-1 py-0.5 rounded bg-white/15 text-[9px] font-mono text-white/80">Ctrl + Shift + D</span>
        </div>
      )}
    </div>
  );
});

OverseerVoice.displayName = "OverseerVoice";
