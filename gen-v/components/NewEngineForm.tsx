"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Brain, X } from "lucide-react";

interface NewEngineFormProps {
  onDismiss?: () => void;
  isModal?: boolean;
}

export default function NewEngineForm({ onDismiss, isModal = false }: NewEngineFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form Fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [workflow, setWorkflow] = useState("quiz-workflow");
  const [voice, setVoice] = useState("alloy");
  const [prompt, setPrompt] = useState("");
  const [sceneRules, setSceneRules] = useState("");
  const [category, setCategory] = useState("Narrative");

  // Create engine mutation
  const createMutation = useMutation({
    mutationFn: async (newEng: any) => {
      const res = await fetch("/api/engines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEng),
      });
      if (!res.ok) throw new Error("Failed to create engine");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-engines"] });
      queryClient.invalidateQueries({ queryKey: ["ai-providers-dynamic"] });
      queryClient.invalidateQueries({ queryKey: ["factory-state"] });
      handleClose();
    },
  });

  const handleClose = () => {
    if (onDismiss) {
      onDismiss();
    } else if (isModal) {
      router.back();
    } else {
      router.push("/engines");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createMutation.mutate({
      name,
      description,
      workflow,
      voice,
      prompt,
      sceneRules,
      category,
    });
  };

  const formContent = (
    <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">New Content Engine Wizard</h3>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[70vh]">
        {createMutation.isError && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg text-[11px] font-mono">
            {createMutation.error?.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Engine Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Psychology Facts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="Narrative">Narrative</option>
              <option value="Interactive">Interactive</option>
              <option value="Trivia">Trivia</option>
              <option value="Educational">Educational</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Description</label>
          <input
            type="text"
            required
            placeholder="e.g. High-retention psychology facts with aesthetic background loops"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Target DAG Workflow</label>
            <select
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="quiz-workflow">Quiz Pipeline</option>
              <option value="narrative-workflow">Narrative Pipeline</option>
              <option value="fast-facts">Fast Facts (Aesthetic)</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Voice Profile</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            >
              <option value="alloy">Alloy (Clean Masculine)</option>
              <option value="echo">Echo (Soft Narrator)</option>
              <option value="fable">Fable (Dramatic)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AI System Prompt Instructions</label>
          <textarea
            rows={3}
            placeholder="Tell the AI how to generate the narrative structure, script hooks, and CTA..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700 resize-none font-mono text-[10px]"
          />
        </div>

        <div className="flex flex-col gap-1.5 text-xs">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Visual Scene Generation Rules</label>
          <textarea
            rows={3}
            placeholder="Specify image styles, camera movements, aspect ratios, etc..."
            value={sceneRules}
            onChange={(e) => setSceneRules(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700 resize-none font-mono text-[10px]"
          />
        </div>

        <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-colors disabled:opacity-50"
          >
            {createMutation.isPending ? "Creating..." : "Create Engine"}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer" 
        />
        <div className="relative z-10 w-full max-w-lg animate-modal-scale-in">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {formContent}
    </div>
  );
}
