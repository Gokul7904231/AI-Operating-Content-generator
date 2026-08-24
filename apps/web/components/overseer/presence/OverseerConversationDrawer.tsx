"use client";

import React, { useState, memo } from "react";
import { 
  Terminal, Search, X, Pin, Trash2, Bot, User 
} from "lucide-react";
import type { ChatMessage } from "./OverseerChat";

interface OverseerConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onClearHistory?: () => void;
  onSelectMessage?: (message: ChatMessage) => void;
  accentColor?: string;
}

export const OverseerConversationDrawer: React.FC<OverseerConversationDrawerProps> = memo(({
  isOpen,
  onClose,
  messages,
  onClearHistory,
  onSelectMessage,
  accentColor = "#1677FF",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [pinnedIds, setPinnedIds] = useState<string[]>(["init"]);

  if (!isOpen) return null;

  const togglePin = (id: string) => {
    setPinnedIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const filteredMessages = messages.filter(
    (m) =>
      m.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.evidence && m.evidence.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  const pinnedMessages = filteredMessages.filter((m) => pinnedIds.includes(m.id));
  const recentMessages = filteredMessages.filter((m) => !pinnedIds.includes(m.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg h-full bg-[#070D18] border-l border-white/[0.08] p-6 flex flex-col shadow-2xl animate-slide-in">
        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#1677FF]" />
            <h3 className="text-sm font-mono font-bold tracking-wider text-[#F5F7FA] uppercase">
              OVERSEER CONVERSATION & AUDIT LOG
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversation drawer"
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#A8B2C1] hover:text-[#F5F7FA] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="py-3 flex items-center gap-2">
          <div className="flex-1 relative flex items-center bg-[#0A1220] rounded-xl px-3 py-1.5 border border-white/[0.08]">
            <Search className="w-3.5 h-3.5 text-[#667085] mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversation & evidence logs..."
              className="w-full bg-transparent border-none outline-none text-xs text-[#F5F7FA] placeholder:text-[#667085] font-mono"
            />
          </div>

          {onClearHistory && (
            <button
              type="button"
              onClick={onClearHistory}
              title="Clear Message Log"
              aria-label="Clear message log"
              className="p-2 rounded-xl bg-[#FF5A67]/10 hover:bg-[#FF5A67]/20 text-[#FF5A67] border border-[#FF5A67]/20 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Messages List Container */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 terminal-scroll pr-1">
          {/* Pinned Section */}
          {pinnedMessages.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono font-bold text-[#667085] uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3 text-[#1677FF]" />
                Pinned Insights ({pinnedMessages.length})
              </span>
              {pinnedMessages.map((m) => (
                <div
                  key={m.id}
                  className="p-3 rounded-xl bg-[#1677FF]/10 border border-[#1677FF]/25 space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#A8B2C1]">
                    <span className="font-bold text-[#1677FF] uppercase">{m.sender}</span>
                    <button
                      type="button"
                      onClick={() => togglePin(m.id)}
                      className="text-[#1677FF] hover:opacity-75 cursor-pointer"
                    >
                      <Pin className="w-3 h-3 fill-current" />
                    </button>
                  </div>
                  <p className="text-[#F5F7FA] font-sans">{m.text}</p>
                </div>
              ))}
            </div>
          )}

          {/* Recent Messages Section */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-mono font-bold text-[#667085] uppercase tracking-wider block">
              Recent Session Transcript ({recentMessages.length})
            </span>

            {recentMessages.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#667085] font-mono">
                No matching messages found.
              </div>
            ) : (
              recentMessages.map((m) => (
                <div
                  key={m.id}
                  className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                    m.sender === "user"
                      ? "bg-[#0B4EA8]/15 border-[#1677FF]/25"
                      : "bg-[#0A1220] border-white/[0.08] shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#667085]">
                    <span className="font-bold uppercase flex items-center gap-1">
                      {m.sender === "user" ? <User className="w-3 h-3 text-[#A8B2C1]" /> : <Bot className="w-3 h-3 text-[#1677FF]" />}
                      <span className={m.sender === "user" ? "text-[#A8B2C1]" : "text-[#1677FF]"}>{m.sender}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span>{m.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => togglePin(m.id)}
                        aria-label="Pin message"
                        className="text-[#667085] hover:text-[#F5F7FA] cursor-pointer"
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[#F5F7FA] font-sans leading-relaxed whitespace-pre-wrap">
                    {m.text}
                  </p>

                  {/* Evidence citations */}
                  {m.evidence && m.evidence.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/[0.06] space-y-0.5 text-[11px] font-mono">
                      <span className="text-[9px] text-[#667085] uppercase font-bold">Evidence Citations:</span>
                      {m.evidence.map((ev, i) => (
                        <p key={i} className="text-[#F5B942] truncate">
                          • {ev}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-[10px] font-mono text-[#667085]">
          <span>Logged to ShortForge Session Memory</span>
          <span>{messages.length} Total Messages</span>
        </div>
      </div>
    </div>
  );
});

OverseerConversationDrawer.displayName = "OverseerConversationDrawer";
