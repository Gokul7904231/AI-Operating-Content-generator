"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import type { VoiceState } from "@/factoryos/core/overseer/presence";

interface OverseerVoiceProps {
  voiceState: VoiceState;
  onTranscriptReady: (transcript: string) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  accentColor?: string;
  className?: string;
}

export const OverseerVoice: React.FC<OverseerVoiceProps> = memo(({
  voiceState,
  onTranscriptReady,
  onSpeechStart,
  onSpeechEnd,
  accentColor = "#1677FF",
  className = "",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
          onSpeechStart?.();
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            onTranscriptReady(transcript);
          }
        };

        recognition.onerror = (e: any) => {
          console.warn("[OverseerVoice] Speech recognition error:", e);
          setIsListening(false);
          onSpeechEnd?.();
        };

        recognition.onend = () => {
          setIsListening(false);
          onSpeechEnd?.();
        };

        recognitionRef.current = recognition;
      }
    }
  }, [onTranscriptReady, onSpeechStart, onSpeechEnd]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      // Barge-in: Cancel any active speech synthesis
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("[OverseerVoice] Failed to start recognition:", err);
      }
    }
  };

  const toggleMute = () => {
    if (!isMuted && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {/* Microphone Toggle Button */}
      <button
        type="button"
        onClick={toggleListening}
        aria-label={isListening ? "Stop listening" : "Talk to Overseer (Voice Mode)"}
        className={`relative flex items-center justify-center w-8 h-8 rounded-full transition-all duration-200 border cursor-pointer ${
          isListening
            ? "bg-[#1769E8]/20 border-[#1769E8] text-[#1769E8] shadow-[0_0_12px_rgba(23,105,232,0.35)] animate-pulse"
            : "bg-black/[0.04] dark:bg-[#0D1622] border-black/[0.06] dark:border-white/[0.08] text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] hover:bg-black/[0.08] dark:hover:bg-[#121E30]"
        }`}
      >
        <Mic className="w-4 h-4" />
      </button>

      {/* Mute Audio Toggle Button */}
      <button
        type="button"
        onClick={toggleMute}
        aria-label={isMuted ? "Unmute Overseer Voice" : "Mute Overseer Voice"}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-black/[0.04] dark:bg-[#0D1622] border border-black/[0.06] dark:border-white/[0.08] text-[#667085] dark:text-[#A7B0BC] hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer"
      >
        {isMuted ? (
          <VolumeX className="w-3.5 h-3.5 text-[#FF5964]" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" />
        )}
      </button>
    </div>
  );
});

OverseerVoice.displayName = "OverseerVoice";
