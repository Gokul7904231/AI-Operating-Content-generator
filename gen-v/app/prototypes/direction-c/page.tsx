"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Sparkles,
  HelpCircle,
  X,
  CheckCircle2,
  Share2,
  ArrowRight,
  ShieldCheck,
  Server,
  Users,
  Activity,
  Layers,
  Crown,
  Lock,
} from "lucide-react";

export default function PrototypeDirectionC() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStage, setActiveStage] = useState<"idea" | "script" | "scenes" | "voice" | "render">("render");
  const [showWhyDrawer, setShowWhyDrawer] = useState(false);
  const [promptText, setPromptText] = useState("Why 90% of Brain Energy is Wasted Before Noon");

  // Role & Plan Prototype State Controls (Design Exploration Only)
  const [userRole, setUserRole] = useState<"user" | "admin">("user");
  const [userPlan, setUserPlan] = useState<"basic" | "pro" | "enterprise">("pro");
  const [activeSurface, setActiveSurface] = useState<"studio" | "admin">("studio");

  return (
    <div className="h-screen w-screen bg-[#070708] text-zinc-100 flex flex-col font-sans overflow-hidden select-none">
      {/* Top Prototype State Bar (Design Controls Only) */}
      <div className="h-7 bg-zinc-950 border-b border-zinc-850 px-4 flex items-center justify-between text-[11px] font-mono text-zinc-400 shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-bold">PROTOTYPE STATE CONTROLS:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">ROLE:</span>
            <select
              value={userRole}
              onChange={(e) => {
                const r = e.target.value as "user" | "admin";
                setUserRole(r);
                if (r === "admin") setActiveSurface("admin");
                else setActiveSurface("studio");
              }}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 rounded px-1.5 py-0.5 outline-none"
            >
              <option value="user">User (Operator)</option>
              <option value="admin">Admin (Platform Platform Authority)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500">PLAN:</span>
            <select
              value={userPlan}
              onChange={(e) => setUserPlan(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-amber-300 rounded px-1.5 py-0.5 outline-none"
            >
              <option value="basic">Basic Tier</option>
              <option value="pro">Pro Tier</option>
              <option value="enterprise">Enterprise Tier</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {userRole === "admin" && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5">
              <button
                onClick={() => setActiveSurface("studio")}
                className={`px-2 py-0.5 rounded ${activeSurface === "studio" ? "bg-amber-500/20 text-amber-300 font-bold" : "text-zinc-400"}`}
              >
                Studio Surface
              </button>
              <button
                onClick={() => setActiveSurface("admin")}
                className={`px-2 py-0.5 rounded ${activeSurface === "admin" ? "bg-red-500/20 text-red-400 font-bold" : "text-zinc-400"}`}
              >
                Admin Console
              </button>
            </div>
          )}
          <span className="text-zinc-600">|</span>
          <Link href="/prototypes/direction-a" className="text-zinc-400 hover:text-zinc-200">
            ← Prototype A
          </Link>
        </div>
      </div>

      {/* Main Surface Render: Studio vs Admin Console */}
      {activeSurface === "admin" ? (
        /* ================= ADMIN CONSOLE SURFACE ================= */
        <div className="flex-1 flex flex-col p-6 space-y-6 overflow-y-auto nle-scroll font-mono">
          <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-400" />
                <h2 className="text-lg font-bold text-zinc-100">FACTORYOS ADMIN CONSOLE</h2>
                <span className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold rounded">
                  PLATFORM AUTHORITY
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Global platform configuration, render cluster node health, user roles, and security audit logs.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-zinc-400">PLAN ENTITLEMENT: <strong className="text-amber-400 uppercase">{userPlan}</strong></span>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Registered Users</span>
              <div className="text-2xl font-bold text-zinc-100">1,248 Accounts</div>
              <span className="text-[10px] text-emerald-400">● 42 Active Now</span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Render Cluster Cores</span>
              <div className="text-2xl font-bold text-blue-400">64 Worker Cores</div>
              <span className="text-[10px] text-zinc-500">Utilization: 38%</span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Active Subscriptions</span>
              <div className="text-2xl font-bold text-amber-400">820 Pro / 42 Ent</div>
              <span className="text-[10px] text-zinc-500">Stripe Webhook Syncing</span>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase">Platform Security</span>
              <div className="text-2xl font-bold text-emerald-400">0 Critical Audit Errors</div>
              <span className="text-[10px] text-zinc-500">Server-Side Auth Enforced</span>
            </div>
          </div>

          <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider border-b border-zinc-800 pb-2">
              System Audit & Provider Operations
            </h3>
            <div className="space-y-2 text-xs text-zinc-400">
              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded flex justify-between items-center">
                <span>Groq Llama-3.3-70b Engine Provider</span>
                <span className="text-emerald-400">HEALTHY (140ms latency)</span>
              </div>
              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded flex justify-between items-center">
                <span>ElevenLabs TTS Voice Stream Node</span>
                <span className="text-emerald-400">HEALTHY (210ms latency)</span>
              </div>
              <div className="p-2.5 bg-zinc-950 border border-zinc-850 rounded flex justify-between items-center">
                <span>Local FFmpeg GPU Acceleration Cluster</span>
                <span className="text-emerald-400">ONLINE (NVENC active)</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ================= STUDIO SURFACE (USER) ================= */
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Studio Top Navigation Bar */}
          <header className="h-12 border-b border-zinc-800/80 bg-[#0c0c0e]/90 backdrop-blur px-6 flex items-center justify-between shrink-0 z-30">
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold rounded">
                PROTOTYPE C (PREFERRED)
              </div>
              <h1 className="text-xs font-bold tracking-tight text-zinc-100">
                THE CINEMATIC FACTORY — Spatial Studio
              </h1>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-zinc-300 font-bold uppercase">{userPlan} PLAN</span>
                {userPlan === "basic" && (
                  <span className="text-[10px] text-zinc-500 ml-1 hover:underline cursor-pointer">
                    (Standard Queue)
                  </span>
                )}
                {userPlan !== "basic" && (
                  <span className="text-[10px] text-emerald-400 ml-1">
                    ✓ Priority Queue
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Main Studio Workspace */}
          <main className="flex-1 flex flex-col justify-between p-6 overflow-y-auto nle-scroll">
            {/* Top Clean Generation Prompt Bar */}
            <div className="max-w-3xl mx-auto w-full">
              <div className="bg-zinc-900/60 border border-zinc-800 focus-within:border-amber-500/60 rounded-xl p-2.5 flex items-center gap-3 shadow-xl transition-all">
                <Sparkles className="w-4 h-4 text-amber-400 ml-2 shrink-0" />
                <input
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Transform your idea into a short-form video..."
                  className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder:text-zinc-500 outline-none"
                />
                <button className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg text-xs transition-colors shrink-0 flex items-center gap-1.5">
                  Generate <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Center Stage: Hero 9:16 Video Player */}
            <div className="flex-1 flex items-center justify-center my-6 relative">
              <div className="w-80 aspect-[9/16] bg-black rounded-xl border border-zinc-800/80 relative overflow-hidden shadow-2xl flex flex-col justify-between p-5 group">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-zinc-900/40 to-black pointer-events-none" />

                {/* Top Overlay Badges */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-black/60 border border-amber-500/30 text-amber-400 text-[10px] font-mono font-bold rounded">
                    READY
                  </span>
                  
                  {/* Contextual "Why?" Button (AI Disappears Rule) */}
                  <button
                    onClick={() => setShowWhyDrawer(true)}
                    className="px-2.5 py-1 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-300 text-[11px] font-mono rounded flex items-center gap-1 transition-colors"
                  >
                    <HelpCircle className="w-3 h-3 text-amber-400" /> Why?
                  </button>
                </div>

                {/* Center Play Button Overlay */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto my-auto relative z-10 hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause className="w-7 h-7 fill-amber-400" /> : <Play className="w-7 h-7 fill-amber-400 ml-1" />}
                </button>

                {/* Bottom Title & Specs */}
                <div className="relative z-10 space-y-3">
                  <h3 className="text-sm font-bold text-zinc-50 leading-tight">
                    {promptText}
                  </h3>
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-400">
                    <span>00:15.0 • 1080x1920</span>
                    <span className="text-emerald-400 font-bold">● Render Complete</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom User-Facing 5-Stage UX Production Stepper */}
            <div className="max-w-3xl mx-auto w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 text-xs font-mono">
                {[
                  { id: "idea", label: "1. Idea", status: "Done" },
                  { id: "script", label: "2. Script", status: "Done" },
                  { id: "scenes", label: "3. Scenes", status: "Done" },
                  { id: "voice", label: "4. Voice", status: "Done" },
                  { id: "render", label: "5. Render", status: "Complete" },
                ].map((stage, idx, arr) => (
                  <React.Fragment key={stage.id}>
                    <button
                      onClick={() => setActiveStage(stage.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${
                        activeStage === stage.id
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{stage.label}</span>
                    </button>
                    {idx < arr.length - 1 && <span className="text-zinc-700">➔</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </main>

          {/* Right Drawer: Contextual "Why?" AI Decision & Internal 9-Stage Pipeline Reveal */}
          {showWhyDrawer && (
            <aside className="w-96 border-l border-zinc-800 bg-[#0c0c0e] flex flex-col justify-between p-6 z-40 animate-in slide-in-from-right duration-200">
              <div>
                <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
                  <h3 className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" /> Production Decision Context
                  </h3>
                  <button
                    onClick={() => setShowWhyDrawer(false)}
                    className="p-1 hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 text-xs font-mono">
                  {/* Internal Execution Pipeline Reveal */}
                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-2">
                    <span className="text-[10px] text-zinc-500 uppercase block font-bold">
                      Internal 9-Stage Execution Pipeline
                    </span>
                    <div className="text-[10px] text-zinc-400 space-y-1">
                      <div>Topic $\rightarrow$ Script $\rightarrow$ Guardian (Passed)</div>
                      <div>Voice $\rightarrow$ Assets $\rightarrow$ Renderer (60fps)</div>
                      <div>Validation $\rightarrow$ Upload $\rightarrow$ Publish</div>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">Script RAG Match</span>
                    <div className="text-zinc-200">Groq Llama-3.3-70b selected high-hook density structure (Score 0.94).</div>
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">Voiceover Model</span>
                    <div className="text-zinc-200">ElevenLabs TTS stream (Voice: Adam, Pacing 1.15x).</div>
                  </div>

                  <div className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase block">Render Entitlement</span>
                    <div className="text-amber-400 uppercase">
                      {userPlan} Tier — {userPlan !== "basic" ? "Priority Queue Priority 1" : "Standard Queue Priority 3"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setShowWhyDrawer(false)}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded text-xs font-mono font-bold transition-colors"
                >
                  Close Explanation
                </button>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
