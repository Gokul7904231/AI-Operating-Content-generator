"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";

interface NewTemplateFormProps {
  onDismiss?: () => void;
  isModal?: boolean;
}

export default function NewTemplateForm({ onDismiss, isModal = false }: NewTemplateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Builder Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Narrative");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [variables, setVariables] = useState("");
  const [version, setVersion] = useState("1.0");

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (newTpl: any) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTpl),
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      handleClose();
    },
  });

  const handleClose = () => {
    if (onDismiss) {
      onDismiss();
    } else if (isModal) {
      router.back();
    } else {
      router.push("/factory/templates");
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version.trim() || !description.trim()) return;
    createMutation.mutate({
      name,
      category,
      description,
      version,
      prompt,
      variables,
    });
  };

  const formContent = (
    <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Custom Template Builder</h3>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[70vh] text-xs">
        {createMutation.isError && (
          <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg font-mono">
            {createMutation.error?.message}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1.5 col-span-2">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Template Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Science Snippets"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Version</label>
            <input
              type="text"
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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
              <option value="Aesthetic">Aesthetic</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Variables (Comma separated)</label>
            <input
              type="text"
              placeholder="e.g. topic, tone"
              value={variables}
              onChange={(e) => setVariables(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Description</label>
          <input
            type="text"
            required
            placeholder="e.g. Explores mysteries of the universe with suspenseful pacing."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">AI System Prompt Seed</label>
          <textarea
            rows={3}
            required
            placeholder="e.g. Create a narrative structure using variables {topic} with {tone} voice parameters..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700 resize-none font-mono text-[10px]"
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
            {createMutation.isPending ? "Saving..." : "Save Template"}
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
