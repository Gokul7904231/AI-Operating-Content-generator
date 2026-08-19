"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import type {
  OverseerPresenceEnvelope,
  VoiceState,
} from "@/factoryos/core/overseer/presence";
import { OVERSEER_EXPRESSION_PRESETS } from "@/factoryos/core/overseer/presence/OverseerExpressionPresets";
import dynamic from "next/dynamic";
import { OverseerHero } from "./OverseerHero";
import { OverseerConversation } from "./OverseerConversation";
import { OverseerModeBar } from "./OverseerModeBar";
import { OverseerCommandComposer } from "./OverseerCommandComposer";
import type {
  DisclosurePanel,
  OperationalStateData,
} from "./OverseerProgressiveDisclosure";
import type { FactoryMetrics } from "./OverseerMetricsHUD";
import type { ChatMessage, OverseerMode } from "./OverseerChat";
import { Activity, Layers, ShieldCheck, Bot } from "lucide-react";

const OverseerProgressiveDisclosure = dynamic(
  () => import("./OverseerProgressiveDisclosure").then((mod) => mod.OverseerProgressiveDisclosure),
  { ssr: false }
);

export interface OverseerCommandSurfaceProps {
  initialPresence?: OverseerPresenceEnvelope;
  className?: string;
  isDashboardEmbedded?: boolean;
}

export const OverseerCommandSurface: React.FC<OverseerCommandSurfaceProps> = memo(({
  initialPresence,
  className = "",
  isDashboardEmbedded = false,
}) => {
  const [presence, setPresence] = useState<OverseerPresenceEnvelope>(
    initialPresence || {
      type: "overseer.presence",
      sequence: 1,
      intent: "OBSERVING",
      affect: {
        valence: 0.3,
        arousal: 0.1,
        confidence: 0.9,
        uncertainty: 0.1,
        curiosity: 0.1,
        urgency: 0.0,
        satisfaction: 0.6,
        concern: 0.0,
        frustration: 0.0,
      },
      faceParameters: OVERSEER_EXPRESSION_PRESETS.IDLE,
      voiceState: "IDLE",
      effectLevel: 2,
      thoughtSummary: "All systems are operational across 4 production floors.",
      timestamp: new Date().toISOString(),
    }
  );

  const [currentMode, setCurrentMode] = useState<OverseerMode>("CHAT");
  const [isConnected, setIsConnected] = useState(false);
  const [activePanel, setActivePanel] = useState<DisclosurePanel | null>(null);
  const [stateData, setStateData] = useState<OperationalStateData | undefined>(undefined);

  const [metrics, setMetrics] = useState<FactoryMetrics>({
    factoryHealthPercent: 100,
    factoryStatus: "ONLINE",
    activeMissionsCount: 1,
    activeCasesCount: 0,
    criticalCasesCount: 0,
    healthyWorkersCount: 4,
    totalWorkersCount: 4,
    onlineFloorsCount: 4,
    totalFloorsCount: 4,
    activeRepairsCount: 0,
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const lastSequenceRef = useRef<number>(presence.sequence || 0);

  // Fetch Authoritative Operational State
  const fetchOperationalState = useCallback(async () => {
    try {
      const res = await fetch("/api/overseer/presence/state");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStateData(json.data);
          if (json.data.metrics) {
            setMetrics(json.data.metrics);
          }
        }
      }
    } catch (err) {
      console.warn("[OverseerCommandSurface] Failed to fetch state:", err);
    }
  }, []);

  useEffect(() => {
    fetchOperationalState();
    const interval = setInterval(fetchOperationalState, 8000);
    return () => clearInterval(interval);
  }, [fetchOperationalState]);

  // SSE Stream Connection with Singleton Guard
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      const url = `/api/overseer/presence/events?lastEventId=${lastSequenceRef.current}`;
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener("overseer.presence", (event) => {
        try {
          const envelope: OverseerPresenceEnvelope = JSON.parse(event.data);
          if (envelope.sequence && envelope.sequence > lastSequenceRef.current) {
            lastSequenceRef.current = envelope.sequence;
            setPresence(envelope);
          }
        } catch (e) {
          console.error("[OverseerCommandSurface] Error parsing presence SSE envelope:", e);
        }
      });

      eventSource.addEventListener("factory.state", (event) => {
        try {
          const stateUpdate = JSON.parse(event.data);
          if (stateUpdate.metrics) {
            setMetrics(stateUpdate.metrics);
          }
        } catch (e) {
          console.error("[OverseerCommandSurface] Error parsing factory state SSE:", e);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) {
          eventSource.close();
        }
        reconnectTimeout = setTimeout(connectSSE, 4000);
      };
    };

    connectSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  // Command Dispatch with strict Text vs. Voice distinction
  const handleSendCommand = async (
    command: string,
    isVoice: boolean = false,
    context: string = "factory",
    modeOverride?: OverseerMode
  ) => {
    if (!command.trim() || isLoading) return;

    const activeMode = modeOverride || currentMode;
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: command,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    if (isVoice) {
      setPresence((prev) => ({ ...prev, voiceState: "LISTENING", intent: "LISTENING" }));
    } else {
      setPresence((prev) => ({ ...prev, voiceState: "IDLE", intent: "THINKING" }));
    }

    try {
      const res = await fetch("/api/overseer/presence/interact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: command,
          isVoice,
          context,
          mode: activeMode,
          previousMessages: messages.slice(-4),
        }),
      });

      const json = await res.json();

      if (json.success) {
        const {
          answer,
          evidence,
          actionsTaken,
          recommendations,
          structuredArtifact,
          panelDisclosure,
          presence: updatedPresence,
        } = json.data;

        if (updatedPresence) {
          const safePresence = isVoice 
            ? updatedPresence 
            : { ...updatedPresence, voiceState: "IDLE" };
          setPresence(safePresence);
          lastSequenceRef.current = safePresence.sequence;
        }

        const overseerMsg: ChatMessage = {
          id: `overseer_${Date.now()}`,
          sender: "overseer",
          text: answer,
          evidence,
          actionsTaken,
          recommendations,
          structuredArtifact,
          panelDisclosure,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };

        setMessages((prev) => [...prev, overseerMsg]);

        if (panelDisclosure) {
          setActivePanel(panelDisclosure);
        }

        if (actionsTaken && actionsTaken.length > 0) {
          fetchOperationalState();
        }

        // Voice audio playback ONLY for voice input
        if (isVoice && typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const cleanText = answer.replace(/[*`#]/g, "");
          const utterance = new SpeechSynthesisUtterance(cleanText);
          utterance.pitch = 1.05;
          utterance.rate = 1.0;
          utterance.volume = 0.9;

          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find((v) =>
            /samantha|victoria|zira|karen|moira|google us english|female/i.test(v.name)
          ) || voices[0];
          if (preferredVoice) utterance.voice = preferredVoice;

          utterance.onstart = () => setPresence((prev) => ({ ...prev, voiceState: "SPEAKING" }));
          utterance.onend = () => setPresence((prev) => ({ ...prev, voiceState: "IDLE" }));
          utterance.onerror = () => setPresence((prev) => ({ ...prev, voiceState: "IDLE" }));
          window.speechSynthesis.speak(utterance);
        }
      } else {
        throw new Error(json.error || "Failed to query Overseer");
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: "overseer",
        text: `Overseer Alert: ${err.message || "Failed to reach Overseer control plane."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const accentColor = "#1769E8";

  return (
    <div
      id="overseer-stage"
      className={`w-full min-h-[calc(100vh-6.5rem)] flex flex-col justify-between items-center max-w-4xl mx-auto select-none py-4 ${className}`}
    >
      {/* 1. TOP/CENTER: GRAND LIVING OVERSEER HERO & CONVERSATION */}
      <div className="w-full flex-1 flex flex-col justify-center items-center my-auto">
        <OverseerHero
          faceParameters={presence.faceParameters}
          intent={presence.intent}
          thoughtSummary={presence.thoughtSummary}
          voiceState={presence.voiceState}
          onFaceClick={() => handleSendCommand("How is the factory?", false)}
          accentColor={accentColor}
          className="w-full"
        />

        {/* 2. INLINE FRONTIER CONVERSATION STREAM */}
        <section className="w-full max-w-2xl mt-3">
          <OverseerConversation
            messages={messages}
            isLoading={isLoading}
            onOpenPanel={(panel) => setActivePanel(panel)}
            onQuickPrompt={(prompt, mode) => {
              if (mode) setCurrentMode(mode);
              handleSendCommand(prompt, false, undefined, mode);
            }}
            accentColor={accentColor}
          />
        </section>
      </div>

      {/* 3. BOTTOM OF VIEWER SEEING PAGE: CHATBOX / COMPOSER + MINIMAL SUMMARY */}
      <div className="w-full max-w-2xl space-y-3 pt-3">
        <OverseerCommandComposer
          onSendCommand={handleSendCommand}
          isLoading={isLoading}
          voiceState={presence.voiceState}
          currentMode={currentMode}
          onModeChange={(m) => setCurrentMode(m)}
          accentColor={accentColor}
        />

        {/* Minimal Operational Summary */}
        <div className="flex items-center justify-center gap-5 text-[11px] font-mono text-[#667085] dark:text-[#A7B0BC] pt-1">
          <button
            type="button"
            onClick={() => setActivePanel("floors")}
            className="hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer"
          >
            HEALTH <strong className="text-[#179E69] dark:text-[#21C58B]">{metrics.factoryHealthPercent}%</strong>
          </button>
          <span className="opacity-40">•</span>
          <button
            type="button"
            onClick={() => setActivePanel("floors")}
            className="hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer"
          >
            FLOORS <strong className="text-[#111827] dark:text-[#F5F7FA]">{metrics.onlineFloorsCount}/{metrics.totalFloorsCount}</strong>
          </button>
          <span className="opacity-40">•</span>
          <button
            type="button"
            onClick={() => setActivePanel("cases")}
            className="hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer"
          >
            CASES <strong className="text-[#111827] dark:text-[#F5F7FA]">{metrics.activeCasesCount}</strong>
          </button>
          <span className="opacity-40">•</span>
          <button
            type="button"
            onClick={() => setActivePanel("missions")}
            className="hover:text-[#111827] dark:hover:text-[#F5F7FA] transition-colors cursor-pointer"
          >
            MISSIONS <strong className="text-[#1769E8]">{metrics.activeMissionsCount}</strong>
          </button>
        </div>
      </div>

      {/* Progressive Disclosure Slide-out HUD Drawer */}
      <OverseerProgressiveDisclosure
        activePanel={activePanel}
        onClose={() => setActivePanel(null)}
        stateData={stateData}
        onRefresh={fetchOperationalState}
        accentColor={accentColor}
      />
    </div>
  );
});

OverseerCommandSurface.displayName = "OverseerCommandSurface";
