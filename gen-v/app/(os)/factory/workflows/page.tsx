"use client";

import React, { useState } from "react";
import Link from "next/link";
import { GitBranch, Clock, ShieldCheck, Database, FileText, ChevronRight, Plus } from "lucide-react";
import NewWorkflowForm from "@/components/NewWorkflowForm";

interface WorkflowStep {
  id: string;
  name: string;
  enabled: boolean;
  dependsOn?: string[];
  retry: number;
  timeoutMs: number;
  provider: string;
  cacheKey?: string;
  avgDurationMs: number;
  logs?: string[];
}

export default function WorkflowsPage() {
  const [selectedNode, setSelectedNode] = useState<WorkflowStep | null>(null);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);

  const steps: WorkflowStep[] = [
    { id: "script", name: "AI Script Generator", enabled: true, retry: 2, timeoutMs: 15000, provider: "google/gemini-1.5-flash", cacheKey: "script_hash_v1", avgDurationMs: 4200, logs: ["Generated script successfully.", "Temperature set to 0.7"] },
    { id: "critic", name: "AI Script Critic", enabled: true, dependsOn: ["script"], retry: 1, timeoutMs: 10050, provider: "groq/llama3-8b", avgDurationMs: 1400, logs: ["Validated fact checklist.", "Safety score: 0.99"] },
    { id: "scene", name: "Visual Scene Planner", enabled: true, dependsOn: ["critic"], retry: 2, timeoutMs: 20000, provider: "google/gemini-1.5-pro", avgDurationMs: 2800, logs: ["Mapped 5 visual scenes.", "Visual layout details validated."] },
    { id: "voice", name: "Speech Narrator", enabled: true, dependsOn: ["scene"], retry: 3, timeoutMs: 30000, provider: "local/kokoro-tts", avgDurationMs: 3200, logs: ["Synthesized audio track.", "Pitch modifier: 1.05"] },
    { id: "image", name: "Imagen Art Planner", enabled: true, dependsOn: ["scene"], retry: 2, timeoutMs: 45000, provider: "google/imagen-3", avgDurationMs: 8900, logs: ["Generated 5 image frames.", "Resolution 1080x1920"] },
    { id: "render", name: "FFmpeg Rendering Engine", enabled: true, dependsOn: ["voice", "image"], retry: 1, timeoutMs: 120000, provider: "local/ffmpeg-cuda", avgDurationMs: 14500, logs: ["Assembled scene blocks.", "Hardware encoder nvenc enabled."] },
    { id: "upload", name: "Drive Uploader", enabled: true, dependsOn: ["render"], retry: 3, timeoutMs: 90000, provider: "google/drive-api", avgDurationMs: 2500, logs: ["Synced file to cloud folder."] },
    { id: "publish", name: "Channel Publisher", enabled: true, dependsOn: ["upload"], retry: 2, timeoutMs: 60000, provider: "youtube/publishing-queue", avgDurationMs: 1800, logs: ["Added YouTube shorts queue."] },
  ];

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div>
          <h1 className="text-xl font-bold text-zinc-50">Factory Pipeline DAGs</h1>
          <p className="text-xs text-zinc-500 mt-1">Interactive DAG (Directed Acyclic Graph) visualization. Click on any pipeline stage to view timeout rules, retries, and SRE logs.</p>
        </div>
        <button
          onClick={() => setShowNewWorkflowModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-zinc-950 text-xs font-semibold rounded-lg transition-colors shrink-0 animate-pulse-subtle"
        >
          <Plus className="w-3.5 h-3.5" /> Custom DAG Builder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive DAG Diagram */}
        <div className="lg:col-span-8 bg-zinc-900/45 border border-zinc-900 rounded-xl p-6 flex flex-col justify-center min-h-[450px]">
          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 font-mono">Directed Acyclic Pipeline Graph</div>
          
          <div className="flex flex-col items-center gap-6 justify-center">
            {/* Stage 1: Script */}
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "script")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "script" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                script
              </button>
              <div className="h-4 w-px bg-zinc-800" />
            </div>

            {/* Stage 2: Critic */}
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "critic")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "critic" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                critic
              </button>
              <div className="h-4 w-px bg-zinc-800" />
            </div>

            {/* Stage 3: Scene */}
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "scene")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "scene" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                scene
              </button>
            </div>

            {/* Concurrent Split: Voice and Image */}
            <div className="w-full max-w-sm flex items-center justify-between relative px-8 py-3">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-zinc-850" />
              <div className="absolute top-0 left-[20%] w-px h-6 bg-zinc-850" />
              <div className="absolute top-0 right-[20%] w-px h-6 bg-zinc-850" />
              
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "voice")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md mt-3 ${selectedNode?.id === "voice" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                voice
              </button>

              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "image")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md mt-3 ${selectedNode?.id === "image" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                image
              </button>
            </div>

            {/* Merge to Render */}
            <div className="w-full max-w-sm flex justify-between relative px-8 pb-3">
              <div className="absolute bottom-0 left-[20%] w-px h-6 bg-zinc-850" />
              <div className="absolute bottom-0 right-[20%] w-px h-6 bg-zinc-850" />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-px bg-zinc-850" />
            </div>
            
            <div className="flex flex-col items-center">
              <div className="h-4 w-px bg-zinc-850" />
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "render")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "render" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                render
              </button>
              <div className="h-4 w-px bg-zinc-800" />
            </div>

            {/* Stage 7: Upload */}
            <div className="flex flex-col items-center">
              <button 
                onClick={() => setSelectedNode(steps.find(s=>s.id === "upload")!)}
                className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "upload" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
              >
                upload
              </button>
              <div className="h-4 w-px bg-zinc-800" />
            </div>

            {/* Stage 8: Publish */}
            <button 
              onClick={() => setSelectedNode(steps.find(s=>s.id === "publish")!)}
              className={`px-4 py-2 rounded-xl border text-xs font-mono font-bold transition-all shadow-md ${selectedNode?.id === "publish" ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700"}`}
            >
              publish
            </button>
          </div>
        </div>

        {/* Right: Stage Inspector */}
        <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-900 rounded-xl p-5 space-y-4 min-h-[350px]">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest border-b border-zinc-800 pb-3 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-emerald-400" /> Node Stage Inspector
          </h3>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-200">{selectedNode.name}</h4>
                <p className="text-[10px] text-zinc-500 mt-0.5">Stage identifier: <span className="font-mono text-zinc-400">{selectedNode.id}</span></p>
              </div>

              <div className="space-y-2.5 text-xs font-mono border-t border-zinc-800/80 pt-3 text-zinc-400">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Active Router:</span>
                  <span className="text-zinc-300 font-bold">{selectedNode.provider}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Max Retries:</span>
                  <span className="text-zinc-300 font-bold">{selectedNode.retry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Timeout Limit:</span>
                  <span className="text-zinc-300 font-bold">{(selectedNode.timeoutMs / 1000).toFixed(0)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Cache Etag:</span>
                  <span className="text-zinc-300 font-bold truncate max-w-[120px]">{selectedNode.cacheKey ?? "None"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Average Speed:</span>
                  <span className="text-zinc-300 font-bold">{(selectedNode.avgDurationMs / 1000).toFixed(1)}s</span>
                </div>
              </div>

              {selectedNode.logs && (
                <div className="border-t border-zinc-800/80 pt-3">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-555 block mb-2 font-mono">Telemetry Event Logs</span>
                  <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-850/80 font-mono text-[9px] text-zinc-500 space-y-1">
                    {selectedNode.logs.map((log, i) => <div key={i}>[EVENT] {log}</div>)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-20 text-zinc-600 font-medium">
              <Clock className="w-8 h-8 text-zinc-700 mb-2" />
              Click any node in the pipeline diagram to inspect telemetry details.
            </div>
          )}
        </div>
      </div>
      {showNewWorkflowModal && (
        <NewWorkflowForm isModal={true} onDismiss={() => setShowNewWorkflowModal(false)} />
      )}
    </div>
  );
}
