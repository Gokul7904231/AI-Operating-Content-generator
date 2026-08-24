"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Mic, MicOff, Check, X, AlertCircle } from "lucide-react";
import type { VoiceState } from "@/factoryos/core/overseer/presence";
import { OverseerVoiceEngine } from "./OverseerVoiceEngine";

interface OverseerVoiceProps {
  voiceState?: VoiceState;
  onDictateTranscript?: (transcript: string) => void;
  onTranscriptReady?: (transcript: string) => void;
  onListeningStateChange?: (isListening: boolean) => void;
  accentColor?: string;
  className?: string;
}

export const OverseerVoice: React.FC<OverseerVoiceProps> = memo(({
  onDictateTranscript,
  onTranscriptReady,
  onListeningStateChange,
  className = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [volume, setVolume] = useState(0.1);
  const [frequencies, setFrequencies] = useState<number[]>([0.2, 0.4, 0.7, 0.4, 0.2]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const engineRef = useRef<OverseerVoiceEngine | null>(null);

  useEffect(() => {
    const engine = new OverseerVoiceEngine({
      onListeningStart: () => {
        setIsListening(true);
        setErrorMessage(null);
        onListeningStateChange?.(true);
      },
      onListeningEnd: () => {
        setIsListening(false);
        setVolume(0.1);
        setFrequencies([0.2, 0.4, 0.7, 0.4, 0.2]);
        onListeningStateChange?.(false);
      },
      onVolumeChange: (vol, freqs) => {
        setVolume(vol);
        if (freqs && freqs.length === 5) {
          setFrequencies(freqs);
        }
      },
      onInterimTranscript: (text) => {
        (onDictateTranscript || onTranscriptReady)?.(text);
      },
      onFinalTranscript: (text) => {
        (onDictateTranscript || onTranscriptReady)?.(text);
      },
      onError: (err) => {
        setIsListening(false);
        setErrorMessage(typeof err === "string" ? err : "Microphone error");
        onListeningStateChange?.(false);
        setTimeout(() => setErrorMessage(null), 4000);
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
  }, [onDictateTranscript, onTranscriptReady, onListeningStateChange]);

  const toggleListening = () => {
    if (!engineRef.current) return;
    if (isListening) {
      engineRef.current.stopListening();
    } else {
      engineRef.current.startDictation();
    }
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (engineRef.current) {
      engineRef.current.stopListening();
    }
  };

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {/* Active ChatGPT-Style Waveform Capsule when listening */}
      {isListening ? (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1677FF]/10 dark:bg-[#1677FF]/20 border border-[#1677FF]/40 shadow-[0_0_15px_rgba(22,119,255,0.25)] animate-in fade-in zoom-in-95 duration-150">
          {/* Real-time Dynamic Soundwave Visualizer Bars */}
          <div className="flex items-center gap-[3px] h-4 px-1" title="Listening to your voice...">
            {frequencies.map((freq, idx) => {
              // Dynamic height scaling: base 4px + frequency modulation up to 16px
              const barHeight = Math.max(4, Math.min(16, 4 + freq * 14 + volume * 6));
              return (
                <span
                  key={idx}
                  style={{ height: `${barHeight}px` }}
                  className="w-[3px] rounded-full bg-gradient-to-t from-[#1677FF] to-[#38BDF8] transition-all duration-75 ease-out"
                />
              );
            })}
          </div>

          <span className="text-[11px] font-medium text-[#1677FF] dark:text-[#38BDF8] pr-1 hidden sm:inline-block">
            Listening...
          </span>

          {/* Done / Checkmark button */}
          <button
            type="button"
            onClick={handleStop}
            title="Finish speaking (Done)"
            aria-label="Done speaking"
            className="w-5 h-5 rounded-full bg-[#1677FF] text-white flex items-center justify-center hover:bg-[#0F63D8] transition-transform active:scale-90 cursor-pointer shadow-xs"
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </button>
        </div>
      ) : (
        /* Idle Microphone Button */
        <button
          type="button"
          onClick={toggleListening}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          aria-label="Start voice input (Ctrl + Shift + D)"
          className="relative flex items-center justify-center w-8 h-8 rounded-full text-[#667085] dark:text-[#A8B2C1] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150 cursor-pointer active:scale-95"
        >
          <Mic className="w-4 h-4" />
        </button>
      )}

      {/* Tooltip on Hover */}
      {showTooltip && !isListening && !errorMessage && (
        <div className="absolute bottom-full mb-2 right-0 px-2.5 py-1 rounded-lg bg-[#0F172A] text-white text-[11px] font-sans font-medium whitespace-nowrap shadow-lg z-50 pointer-events-none flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100 border border-white/10">
          <span>Voice Dictation</span>
          <span className="px-1 py-0.5 rounded bg-white/15 text-[9px] font-mono text-white/80">Ctrl + Shift + D</span>
        </div>
      )}

      {/* Error Message Toast */}
      {errorMessage && (
        <div className="absolute bottom-full mb-2 right-0 px-3 py-1.5 rounded-xl bg-rose-600/95 backdrop-blur-md text-white text-[11px] font-sans font-medium shadow-2xl z-50 flex items-center gap-1.5 border border-rose-400 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap max-w-sm">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-white" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
});

OverseerVoice.displayName = "OverseerVoice";
export default OverseerVoice;
