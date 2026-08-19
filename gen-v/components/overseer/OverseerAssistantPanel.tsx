"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, MicOff, Send, X, Loader2, Volume2, 
  CheckCircle2, AlertTriangle
} from "lucide-react";
import { AgentMode, AgentStepTrace, ConfirmationRequest, ContextualCard } from "@/lib/overseer/types";
import { useOSStore } from "@/lib/os-store";
import { useAuth } from "@/lib/auth/hooks";

interface Message {
  id: string;
  sender: "user" | "overseer";
  text: string;
  mode?: AgentMode;
  traces?: AgentStepTrace[];
  confirmationRequest?: ConfirmationRequest;
  contextualCard?: ContextualCard;
  timestamp: string;
}

export default function OverseerAssistantPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const selectedAvatar = useOSStore((state) => state.selectedAvatar);
  const { user } = useAuth();
  const userAvatar = selectedAvatar || user?.photoURL || "/avatars/factory-avatar-01.png";

  const [mode, setMode] = useState<AgentMode>("OPERATE");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "overseer",
      text: "FactoryOS Overseer Operational Agent ready. Ask me to inspect renders, create videos, research topics, or check factory telemetry.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const queryText = textToSend || inputText;
    if (!queryText.trim() || loading) return;

    const userMsg: Message = {
      id: `user_${Date.now()}`,
      sender: "user",
      text: queryText,
      mode,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("/api/overseer/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText, mode }),
      });
      const data = await res.json();

      if (data.success) {
        const agentData = data.data;
        const overseerMsg: Message = {
          id: `overseer_${Date.now()}`,
          sender: "overseer",
          text: agentData.answer,
          mode: agentData.mode,
          traces: agentData.traces,
          confirmationRequest: agentData.confirmationRequest,
          contextualCard: agentData.contextualCard,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages(prev => [...prev, overseerMsg]);

        // Text-to-Speech Output
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(agentData.answer.replace(/[*`]/g, ""));
          utterance.onstart = () => setSpeaking(true);
          utterance.onend = () => setSpeaking(false);
          window.speechSynthesis.speak(utterance);
        }
      } else {
        throw new Error(data.error || "Overseer execution failed.");
      }
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "overseer",
          text: `Overseer Error: ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, confirmation: ConfirmationRequest, userAction: "CONFIRM" | "CANCEL") => {
    try {
      const res = await fetch("/api/overseer/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationId: confirmation.id,
          toolId: confirmation.toolId,
          action: userAction,
          payload: confirmation.payload,
        }),
      });
      await res.json();

      setMessages(prev =>
        prev.map(m => {
          if (m.id === msgId && m.confirmationRequest) {
            return {
              ...m,
              text: userAction === "CONFIRM" ? `✓ Action Confirmed & Executed: ${confirmation.summary}` : `✕ Action Cancelled.`,
              confirmationRequest: undefined,
            };
          }
          return m;
        })
      );
    } catch (err: any) {
      alert(`Confirmation failed: ${err.message}`);
    }
  };

  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      handleSend(transcript);
    };

    recognition.start();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-lg bg-[#0A1220] border border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[560px] font-sans select-none animate-fade-in">
      {/* Panel Top Header */}
      <div className="bg-[#070D18] text-[#F5F7FA] p-4 flex items-center justify-between border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1677FF]/10 border border-[#1677FF]/20 p-1 flex items-center justify-center text-[#1677FF] shadow-xs overflow-hidden">
            <img src="/favicon-white.png" alt="FactoryOS Logo" width={24} height={24} loading="lazy" decoding="async" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="font-bold text-xs block flex items-center gap-1.5 text-[#F5F7FA]">
              FactoryOS Overseer <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#1677FF]/20 text-[#1677FF] border border-[#1677FF]/30">OPERATIONAL AGENT</span>
            </span>
            <span className="text-[10px] text-[#A8B2C1] block">Operational Intelligence & Multi-Step Assistant</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {speaking && (
            <button
              onClick={() => {
                if (typeof window !== "undefined") window.speechSynthesis.cancel();
                setSpeaking(false);
              }}
              className="px-2 py-1 bg-[#FF5A67]/20 text-[#FF5A67] rounded text-[10px] font-mono flex items-center gap-1"
            >
              <Volume2 className="w-3 h-3 animate-pulse" /> Stop Voice
            </button>
          )}
          <button onClick={onClose} aria-label="Close Overseer Assistant" className="text-[#A8B2C1] hover:text-[#F5F7FA] transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mode Selector Bar */}
      <div className="px-3 py-2 bg-[#070D18] border-b border-white/[0.08] flex items-center gap-1 overflow-x-auto text-[10px]">
        {(["CHAT", "OPERATE", "RESEARCH", "CREATE", "MONITOR", "AUTOPILOT"] as AgentMode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === m
                ? "bg-[#1677FF] text-white shadow-xs"
                : "text-[#A8B2C1] hover:text-[#F5F7FA] hover:bg-[#121E32]"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-[#050B14] terminal-scroll">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "overseer" && (
              <div className="w-6.5 h-6.5 rounded-lg bg-[#1677FF]/10 border border-[#1677FF]/20 flex items-center justify-center flex-shrink-0 mt-0.5 p-1 overflow-hidden shadow-xs">
                <img src="/favicon-black.png" alt="FactoryOS Logo" width={20} height={20} loading="lazy" decoding="async" className="w-full h-full object-contain dark:hidden block" />
                <img src="/favicon-white.png" alt="FactoryOS Logo" width={20} height={20} loading="lazy" decoding="async" className="w-full h-full object-contain hidden dark:block" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl p-3.5 space-y-2.5 ${
              msg.sender === "user"
                ? "bg-[#1677FF] text-white rounded-br-none shadow-sm"
                : "bg-[#0E1728] border border-white/[0.08] text-[#F5F7FA] rounded-bl-none shadow-xs"
            }`}>
              <p className="leading-relaxed font-medium whitespace-pre-wrap">{msg.text}</p>

              {/* Tool Trace Badges */}
              {msg.traces && msg.traces.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-white/[0.08]">
                  {msg.traces.map((trace, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[10px] text-[#A8B2C1] font-mono">
                      <CheckCircle2 className="w-3 h-3 text-[#19C37D] flex-shrink-0" />
                      <span>{trace.subAgentName ? `[${trace.subAgentName}] ` : ""}{trace.outputSummary}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Contextual UI Card */}
              {msg.contextualCard && (
                <div className="bg-[#070D18] border border-[#1677FF]/30 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1677FF] text-[11px] uppercase tracking-wider">{msg.contextualCard.title}</span>
                    <span className="px-2 py-0.5 rounded bg-[#19C37D]/10 text-[#19C37D] font-bold text-[9px]">
                      {msg.contextualCard.details.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-[#0E1728] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#1677FF] h-full transition-all" style={{ width: `${msg.contextualCard.details.progress}%` }} />
                  </div>
                </div>
              )}

              {/* Interactive Action Confirmation Card */}
              {msg.confirmationRequest && (
                <div className="bg-[#F5B942]/10 border border-[#F5B942]/30 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center gap-2 text-[#F5B942] font-bold text-xs">
                    <AlertTriangle className="w-4 h-4" /> Action Confirmation Required
                  </div>
                  <p className="text-xs text-[#F5F7FA] font-medium">{msg.confirmationRequest.summary}</p>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleConfirmAction(msg.id, msg.confirmationRequest!, "CANCEL")}
                      className="px-3 py-1.5 rounded-lg bg-[#070D18] text-[#A8B2C1] hover:text-[#F5F7FA] font-semibold text-xs cursor-pointer border border-white/[0.08]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleConfirmAction(msg.id, msg.confirmationRequest!, "CONFIRM")}
                      className="px-4 py-1.5 rounded-lg bg-[#1677FF] hover:bg-[#0F63D8] text-white font-semibold text-xs cursor-pointer shadow-xs"
                    >
                      Confirm Action
                    </button>
                  </div>
                </div>
              )}
            </div>

            {msg.sender === "user" && (
              <img
                src={userAvatar}
                alt="User Avatar"
                width={26}
                height={26}
                loading="lazy"
                decoding="async"
                className="w-6.5 h-6.5 rounded-full object-cover border border-[#1677FF]/30 flex-shrink-0 mt-0.5 shadow-xs"
              />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-[#667085]">
            <Loader2 className="w-4 h-4 animate-spin text-[#1677FF]" />
            <span>Overseer is evaluating tools & system state...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & Voice Controls */}
      <div className="p-3 bg-[#070D18] border-t border-white/[0.08] space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder={isListening ? "Listening to your voice..." : `Ask Overseer [Mode: ${mode}]...`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="flex-1 bg-[#0A1220] border border-white/[0.10] rounded-xl px-3.5 py-2 text-xs outline-none focus:border-[#1677FF] text-[#F5F7FA] placeholder:text-[#667085]"
          />

          <button
            onClick={toggleVoiceInput}
            aria-label="Voice input"
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isListening
                ? "bg-[#FF5A67] text-white border-[#FF5A67] animate-pulse"
                : "bg-[#0A1220] text-[#A8B2C1] border-white/[0.10] hover:text-[#1677FF] hover:border-[#1677FF]/40"
            }`}
            title="🎤 Voice Interaction"
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || loading}
            aria-label="Send message"
            className="p-2 rounded-xl bg-[#1677FF] hover:bg-[#0F63D8] text-white disabled:opacity-40 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
