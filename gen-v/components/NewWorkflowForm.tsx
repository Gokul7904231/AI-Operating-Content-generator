"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, X, Plus, Trash2 } from "lucide-react";

interface NewWorkflowFormProps {
  onDismiss?: () => void;
  isModal?: boolean;
}

interface WorkflowStepInput {
  id: string;
  name: string;
  provider: string;
  retry: number;
  timeoutMs: number;
  dependsOn: string[];
}

export default function NewWorkflowForm({ onDismiss, isModal = false }: NewWorkflowFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStepInput[]>([
    { id: "script", name: "AI Script Generator", provider: "google/gemini-1.5-flash", retry: 2, timeoutMs: 15000, dependsOn: [] },
    { id: "critic", name: "AI Script Critic", provider: "groq/llama3-8b", retry: 1, timeoutMs: 10000, dependsOn: ["script"] }
  ]);

  const [newStepId, setNewStepId] = useState("");
  const [newStepName, setNewStepName] = useState("");
  const [newStepProvider, setNewStepProvider] = useState("google/gemini-1.5-flash");
  const [newStepRetry, setNewStepRetry] = useState(2);
  const [newStepTimeout, setNewStepTimeout] = useState(15);
  const [newStepDepends, setNewStepDepends] = useState<string[]>([]);

  const handleClose = () => {
    if (onDismiss) {
      onDismiss();
    } else if (isModal) {
      router.back();
    } else {
      router.push("/factory/workflows");
    }
  };

  const handleAddStep = () => {
    if (!newStepId.trim() || !newStepName.trim()) return;
    const newStep: WorkflowStepInput = {
      id: newStepId.trim().toLowerCase().replace(/\s+/g, "-"),
      name: newStepName.trim(),
      provider: newStepProvider,
      retry: newStepRetry,
      timeoutMs: newStepTimeout * 1000,
      dependsOn: newStepDepends
    };
    setSteps([...steps, newStep]);
    setNewStepId("");
    setNewStepName("");
    setNewStepDepends([]);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    alert(`Workflow DAG "${name}" registered successfully with ${steps.length} processing isolates!`);
    handleClose();
  };

  const toggleDependency = (id: string) => {
    if (newStepDepends.includes(id)) {
      setNewStepDepends(newStepDepends.filter((d) => d !== id));
    } else {
      setNewStepDepends([...newStepDepends, id]);
    }
  };

  const formContent = (
    <div className="w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Custom Pipeline DAG Builder</h3>
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
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">DAG Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Ultra Quiz Pipeline"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Description</label>
            <input
              type="text"
              placeholder="e.g. 8-stage sequence with parallel image/voice generators"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Existing Steps List */}
        <div className="space-y-2">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider font-mono">Workflow Step Sequence</span>
          <div className="bg-zinc-950/40 border border-zinc-850 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
            {steps.map((s, idx) => (
              <div key={s.id} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-2 rounded-lg">
                <div>
                  <div className="font-bold text-zinc-250 font-mono text-[11px]">{s.id} ({s.name})</div>
                  <div className="text-[9px] text-zinc-550 font-mono">
                    Provider: {s.provider} • Timeout: {s.timeoutMs / 1000}s • Depends: {s.dependsOn.length > 0 ? s.dependsOn.join(", ") : "None"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveStep(idx)}
                  className="p-1 text-zinc-550 hover:text-red-400 hover:bg-zinc-850 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add Step Sub-Form */}
        <div className="bg-zinc-950/20 border border-zinc-850/80 rounded-xl p-4 space-y-3">
          <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider font-mono flex items-center gap-1.5">
            <Plus className="w-3 h-3" /> Add Step Isolates
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-zinc-500">Step unique id</label>
              <input
                type="text"
                placeholder="e.g. image-gen"
                value={newStepId}
                onChange={(e) => setNewStepId(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-zinc-500">Step display name</label>
              <input
                type="text"
                placeholder="e.g. AI Image Planner"
                value={newStepName}
                onChange={(e) => setNewStepName(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[9px] uppercase font-bold text-zinc-500">Active Provider</label>
              <input
                type="text"
                value={newStepProvider}
                onChange={(e) => setNewStepProvider(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none font-mono"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] uppercase font-bold text-zinc-500">Timeout (sec)</label>
              <input
                type="number"
                value={newStepTimeout}
                onChange={(e) => setNewStepTimeout(parseInt(e.target.value) || 15)}
                className="px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500">Depends On Steps</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {steps.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => toggleDependency(s.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${newStepDepends.includes(s.id) ? "border-emerald-500 bg-emerald-500/10 text-emerald-450 font-bold" : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"}`}
                >
                  {s.id}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddStep}
            className="w-full bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700 py-1.5 rounded-lg text-center font-bold font-mono transition-colors"
          >
            Attach Step to Sequence
          </button>
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
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-colors"
          >
            Register Custom DAG
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
        <div className="relative z-10 w-full max-w-xl animate-modal-scale-in">
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
