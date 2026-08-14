"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  HelpCircle, BookOpen, History, Code, Flame, Brain, 
  MessageSquare, BookOpenText, Flag, ImageIcon, Clock, 
  CheckCircle, Plus, X, Trash2 
} from "lucide-react";
import NewEngineForm from "@/components/NewEngineForm";
import WebsiteModal from "@/components/WebsiteModal";

interface EngineMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: any;
  color?: string;
  status: "active" | "experimental";
  totalRenders: number;
  lastRun: string;
  avgScore: number;
  retention: string;
  autoPublish: string[];
}

const OFFICIAL_IDS = ["quiz", "facts", "history", "coding", "motivation", "psychology", "reddit", "story", "guess-flag", "guess-logo"];

const ICON_MAP: Record<string, any> = {
  quiz: HelpCircle,
  facts: BookOpen,
  history: History,
  coding: Code,
  motivation: Flame,
  psychology: Brain,
  reddit: MessageSquare,
  story: BookOpenText,
  "guess-flag": Flag,
  "guess-logo": ImageIcon,
};

const COLOR_MAP: Record<string, string> = {
  quiz: "text-blue-400 border-blue-500/20",
  facts: "text-purple-400 border-purple-500/20",
  history: "text-amber-400 border-amber-500/20",
  coding: "text-emerald-400 border-emerald-500/20",
  motivation: "text-rose-400 border-rose-500/20",
  psychology: "text-indigo-400 border-indigo-500/20",
  reddit: "text-orange-400 border-orange-500/20",
  story: "text-teal-400 border-teal-500/20",
  "guess-flag": "text-pink-400 border-pink-500/20",
  "guess-logo": "text-yellow-400 border-yellow-500/20",
};

export default function EnginesGalleryPage() {
  const queryClient = useQueryClient();
  const [showNewEngineModal, setShowNewEngineModal] = useState(false);

  // Fetch engines
  const { data: enginesData, isLoading } = useQuery<{ success: boolean; engines: EngineMeta[] }>({
    queryKey: ["content-engines"],
    queryFn: async () => {
      const res = await fetch("/api/engines");
      if (!res.ok) throw new Error("Failed to fetch engines");
      return res.json();
    }
  });

  const engines = enginesData?.engines ?? [];

  // Delete engine mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/engines?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete engine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-engines"] });
      queryClient.invalidateQueries({ queryKey: ["factory-state"] });
    }
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDeleteEngine = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-900 pb-4">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Content Engines Gallery</h1>
          <p className="text-xs text-zinc-500 mt-1">Select a specialized AI pipeline worker below to customize prompts, rules, and launch video jobs.</p>
        </div>
        <button
          onClick={() => setShowNewEngineModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> New Engine Wizard
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {engines.map((e) => {
            const Icon = ICON_MAP[e.id] || BookOpenText;
            const colorClass = COLOR_MAP[e.id] || "text-emerald-400 border-emerald-500/20";
            const isOfficial = OFFICIAL_IDS.includes(e.id);

            return (
              <div key={e.id} className="relative group">
                <Link
                  href={`/engines/${e.id}`}
                  className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 hover:border-zinc-700 transition-all flex flex-col justify-between cursor-pointer hover:shadow-lg h-full"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className={`w-9 h-9 rounded-lg bg-zinc-950 flex items-center justify-center border border-zinc-800 ${colorClass}`}>
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded font-mono uppercase ${
                          e.status === "active" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-zinc-800 text-zinc-500 border border-zinc-700/60"
                        }`}>
                          {e.status}
                        </span>
                        {!isOfficial && (
                          <button
                            onClick={(event) => handleDelete(event, e.id)}
                            className="p-1 hover:bg-zinc-800 rounded text-zinc-550 hover:text-red-400 transition-colors"
                            title="Delete custom engine"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors">
                        {e.name}
                      </h3>
                      <p className="text-[10px] text-zinc-500 leading-normal line-clamp-2">
                        {e.description}
                      </p>
                    </div>

                    {/* Inline Stats */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-zinc-500 border-t border-b border-zinc-850 py-2.5 my-2">
                      <div className="flex justify-between">
                        <span>Runs:</span>
                        <span className="text-zinc-300 font-bold">{e.totalRenders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Score:</span>
                        <span className="text-emerald-400 font-bold">{e.avgScore}/10</span>
                      </div>
                      <div className="flex justify-between col-span-2">
                        <span>Last Run:</span>
                        <span className="text-zinc-400">{e.lastRun}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Keep:</span>
                        <span className="text-zinc-400">{e.retention}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Publish:</span>
                        <span className="text-zinc-400">
                          {e.autoPublish?.length > 0 ? e.autoPublish.join(", ") : "None"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-[9px] font-mono text-zinc-500">
                    <span>{e.category}</span>
                    <span>{isOfficial ? "OS Module" : "Custom dynamic"}</span>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
      {showNewEngineModal && (
        <NewEngineForm isModal={true} onDismiss={() => setShowNewEngineModal(false)} />
      )}
      <WebsiteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Custom Engine?"
        description={`Are you sure you want to delete custom engine "${deleteConfirmId}"? This action cannot be undone.`}
        icon="warning"
        variant="danger"
        confirmText="Delete Engine"
        cancelText="Cancel"
        onConfirm={confirmDeleteEngine}
      />
    </div>
  );
}
