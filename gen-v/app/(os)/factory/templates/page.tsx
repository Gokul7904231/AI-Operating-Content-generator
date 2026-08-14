"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  FileCode, Search, Play, Copy, Eye, Plus, Trash2, 
  ArrowUpRight, Share2, Sparkles, X, Download, Upload 
} from "lucide-react";
import NewTemplateForm from "@/components/NewTemplateForm";
import WebsiteModal from "@/components/WebsiteModal";

interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tags: string[];
  stepCount: number;
  renderProfile: string;
  version: string;
  prompt: string;
  variables: string;
  isOfficial?: boolean;
  isCommunity?: boolean;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"official" | "my" | "community">("official");
  const [search, setSearch] = useState("");

  // Builder Fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Narrative");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [variables, setVariables] = useState("");
  const [version, setVersion] = useState("1.0");

  // Run Modal state
  const [runningTemplate, setRunningTemplate] = useState<WorkflowTemplate | null>(null);
  const [runTopic, setRunTopic] = useState("");
  const [runSuccess, setRunSuccess] = useState("");
  const [runError, setRunError] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);

  // Fetch templates via query
  const { data: templatesData, isLoading } = useQuery<{ success: boolean; templates: WorkflowTemplate[] }>({
    queryKey: ["workflow-templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    }
  });

  const templates = templatesData?.templates ?? [];

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: async (newTpl: Partial<WorkflowTemplate>) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTpl)
      });
      if (!res.ok) throw new Error("Failed to create template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
      setName("");
      setDescription("");
      setPrompt("");
      setVariables("");
    }
  });

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/templates?id=${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete template");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-templates"] });
    }
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version.trim() || !description.trim()) return;
    createMutation.mutate({
      name,
      category,
      description,
      version,
      prompt,
      variables
    });
  };

  const handleDuplicate = (tpl: WorkflowTemplate) => {
    createMutation.mutate({
      name: `${tpl.name} (Copy)`,
      category: tpl.category,
      description: tpl.description,
      version: tpl.version,
      prompt: tpl.prompt,
      variables: tpl.variables
    });
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      deleteMutation.mutate(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleExport = (tpl: WorkflowTemplate) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tpl, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${tpl.id}_template.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleExecuteRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runningTemplate || !runTopic.trim()) return;
    setIsExecuting(true);
    setRunSuccess("");
    setRunError("");

    try {
      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: runTopic.trim(),
          style: runningTemplate.id,
          contentType: runningTemplate.id.includes("quiz") ? "QUIZ_SHORTS" : "STORY",
          renderProfile: "FAST_SHORTS"
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enqueue generation job");
      setRunSuccess(`Job successfully enqueued! ID: ${data.jobId}`);
      setRunTopic("");
    } catch (err: any) {
      setRunError(err.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
    if (activeTab === "official") return matchesSearch && t.isOfficial;
    if (activeTab === "community") return matchesSearch && t.isCommunity;
    return matchesSearch && !t.isOfficial && !t.isCommunity;
  });

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-900">
        <div>
          <h2 className="text-xl font-bold text-zinc-50 tracking-tight">Workflow Templates Marketplace</h2>
          <p className="text-xs text-zinc-500 mt-1">Deploy, copy, export, and build specialized prompt structures for the DAG pipeline.</p>
        </div>
        <button
          onClick={() => setShowNewTemplateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Template Builder
        </button>
      </div>

      {/* Navigation tabs */}
      <div className="flex border-b border-zinc-900 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("official")}
          className={`pb-2 px-1 border-b-2 transition-all ${activeTab === "official" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Official Marketplace
        </button>
        <button
          onClick={() => setActiveTab("my")}
          className={`pb-2 px-1 border-b-2 transition-all ${activeTab === "my" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          My Custom Templates
        </button>
        <button
          onClick={() => setActiveTab("community")}
          className={`pb-2 px-1 border-b-2 transition-all ${activeTab === "community" ? "border-emerald-500 text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          Community Shared
        </button>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          type="text"
          placeholder="Search templates by name or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 placeholder:text-zinc-650 focus:outline-none focus:border-zinc-700 transition-colors"
        />
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        /* Grid List */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((tpl) => (
            <div key={tpl.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col justify-between hover:border-zinc-750 transition-colors">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-150">{tpl.name}</h3>
                    <span className="text-[9px] font-mono text-zinc-600 mt-0.5 block">v{tpl.version} • {tpl.category}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setRunningTemplate(tpl)}
                      className="p-1 hover:bg-zinc-800 rounded text-emerald-500 hover:text-emerald-400 transition-colors"
                      title="Run/Execute template"
                    >
                      <Play className="w-3.5 h-3.5 fill-emerald-500/20" />
                    </button>
                    <button 
                      onClick={() => handleDuplicate(tpl)}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => handleExport(tpl)}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
                      title="Export Template"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    {!tpl.isOfficial && !tpl.isCommunity && (
                      <button 
                        onClick={() => handleDelete(tpl.id)}
                        className="p-1 hover:bg-zinc-800 rounded text-zinc-550 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">{tpl.description}</p>
              </div>

              <div className="border-t border-zinc-850/60 pt-3.5 mt-4 space-y-2 text-[10px] font-mono">
                <div>
                  <span className="text-zinc-600 uppercase text-[8px] block">Variables:</span>
                  <span className="text-zinc-400">{tpl.variables || "None"}</span>
                </div>
                <div>
                  <span className="text-zinc-600 uppercase text-[8px] block">Prompt:</span>
                  <span className="text-zinc-400 block truncate">{tpl.prompt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-850 rounded-xl">
          <FileCode className="w-8 h-8 text-zinc-700 mb-2" />
          <p className="text-zinc-550 text-xs">No matching templates found.</p>
        </div>
      )}

      {/* Run Modal */}
      {runningTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-xs">
          <div 
            onClick={() => { setRunningTemplate(null); setRunSuccess(""); setRunError(""); }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer" 
          />
          <div className="relative z-10 w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-modal-scale-in">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-zinc-200">Run Template: {runningTemplate.name}</h3>
              </div>
              <button 
                onClick={() => { setRunningTemplate(null); setRunSuccess(""); setRunError(""); }}
                className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteRun} className="p-5 space-y-4">
              {runSuccess && <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 text-emerald-450 rounded-lg">{runSuccess}</div>}
              {runError && <div className="p-3 bg-red-950/30 border border-red-900/50 text-red-400 rounded-lg">{runError}</div>}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Target Topic</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5 Fascinating Deep Space Mysteries"
                  value={runTopic}
                  onChange={(e) => setRunTopic(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-300 focus:outline-none focus:border-zinc-700"
                />
              </div>

              <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setRunningTemplate(null); setRunSuccess(""); setRunError(""); }}
                  className="px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExecuting}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {isExecuting ? "Executing..." : "Run Job"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showNewTemplateModal && (
        <NewTemplateForm isModal={true} onDismiss={() => setShowNewTemplateModal(false)} />
      )}
      <WebsiteModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Custom Template?"
        description="Are you sure you want to delete this custom template? This action cannot be undone."
        icon="warning"
        variant="danger"
        confirmText="Delete Template"
        cancelText="Cancel"
        onConfirm={confirmDelete}
      />
    </div>
  );
}
