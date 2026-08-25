"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Cpu, Sliders, Play, AlertTriangle, CheckCircle, 
  Terminal, Shield, Settings, Activity, Trash2, ExternalLink
} from "lucide-react";
import BrandIcon from "@/components/BrandIcon";
import { useOSStore } from "@/lib/os-store";
import { useFactoryStore } from "@/lib/factory-store";
import { useAuth } from "@/lib/auth/hooks";

export default function DynamicEnginePage() {
  const { user } = useAuth();
  const isAdmin = ["ADMIN", "OWNER", "SUPERADMIN"].includes(user?.role?.toUpperCase() || "");
  const params = useParams();
  const engineId = params.id as string;

  const { events } = useFactoryStore();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const [manifest, setManifest] = useState<any>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Configuration Form State
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [audience, setAudience] = useState("general");
  const [tone, setTone] = useState("Challenging");
  const [voice, setVoice] = useState("neutral");
  const [ratio, setRatio] = useState("9:16");
  const [providerOverride, setProviderOverride] = useState("auto");
  const [retention, setRetention] = useState(72);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [thumbnailStyle, setThumbnailStyle] = useState("cinematic");

  const selectedProfile = useOSStore((state) => state.selectedProfile);

  useEffect(() => {
    if (!engineId) return;
    setError("");
    setSuccess("");

    fetch(`/api/engines/${engineId}`)
      .then((res) => {
        if (!res.ok) throw new Error(`Content Engine "${engineId}" not found in registries.`);
        return res.json();
      })
      .then((data) => {
        if (data.success && data.manifest) {
          setManifest(data.manifest);
          setTopic(engineId === "quiz" ? "Global Geography Quiz" : `Fascinating facts about ${engineId}`);
        } else {
          setError(data.error || `Content Engine "${engineId}" not found in registries.`);
        }
      })
      .catch((err) => {
        setError(err.message);
      });
  }, [engineId]);

  // Dynamically poll events and format logs
  useEffect(() => {
    if (!activeJobId) return;

    // Filter events belonging to this jobId
    const jobEvents = events.filter(e => e.traceId === activeJobId || e.payload?.jobId === activeJobId);
    
    // Format events as log lines
    const newLogs = [
      `[0.0s] Initializing ${engineId} engine runtime...`,
      `[0.2s] [SUCCESS] Manifest enqueued. Job ID: ${activeJobId}`
    ];

    // Sort by timestamp
    const sortedEvents = [...jobEvents].sort((a, b) => a.timestamp - b.timestamp);

    let isFinished = false;
    let isError = false;

    sortedEvents.forEach(e => {
      const timeOffset = ((e.timestamp - sortedEvents[0]?.timestamp || 0) / 1000).toFixed(1);
      
      if (e.type === "workflow.started") {
        newLogs.push(`[${timeOffset}s] Workflow pipeline started for topic: "${e.payload.topic}"`);
      } else if (e.type === "step.started") {
        newLogs.push(`[${timeOffset}s] Executing stage: ${e.payload.stepId}...`);
      } else if (e.type === "step.completed") {
        newLogs.push(`[${timeOffset}s] Stage completed: ${e.payload.stepId} in ${e.payload.duration}ms`);
      } else if (e.type === "step.failed") {
        newLogs.push(`[${timeOffset}s] [ERROR] Stage failed: ${e.payload.stepId} - ${e.payload.error}`);
        isError = true;
      } else if (e.type === "workflow.completed") {
        newLogs.push(`[${timeOffset}s] [SUCCESS] Pipeline execution finished in ${e.payload.durationMs}ms`);
        isFinished = true;
      } else if (e.type === "workflow.failed") {
        newLogs.push(`[${timeOffset}s] [CRITICAL_ERR] Execution failed: ${e.payload.error}`);
        isFinished = true;
        isError = true;
      }
    });

    setLogs(newLogs);

    if (isFinished) {
      setRunning(false);
      if (isError) {
        setError("Pipeline run failed. Check process logs.");
      } else {
        setSuccess(`Video job completed successfully! ID: ${activeJobId}`);
      }
    }
  }, [events, activeJobId, engineId]);

  // Execute job mutation
  const executeJob = useMutation({
    mutationFn: async () => {
      setRunning(true);
      setSuccess("");
      setActiveJobId(null);
      setLogs([`[0.0s] Initializing ${engineId} engine runtime...`]);

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          style: engineId,
          contentType: engineId === "quiz" ? "QUIZ_SHORTS" : "STORY",
          renderProfile: selectedProfile,
          platforms,
          options: {
            difficulty,
            audience,
            tone,
            voice,
            ratio,
            retention,
            thumbnailStyle,
            providerOverride,
          }
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to queue job");
      return data;
    },
    onSuccess: (data) => {
      setSuccess(`Job enqueued successfully! ID: ${data.jobId}`);
      setActiveJobId(data.jobId);
    },
    onError: (err: any) => {
      setError(err.message);
      setLogs((prev) => [...prev, `[CRITICAL_ERR] Spawn process crashed: ${err.message}`]);
      setRunning(false);
    }
  });

  const togglePlatform = (p: string) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const isQuizLive = isAdmin || engineId === "quiz";
  const comingSoonEngine = !isQuizLive;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-900 pb-4 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-50 tracking-tight capitalize">{manifest?.name ?? engineId} Engine</h2>
              {isQuizLive ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE NOW</span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-wider">COMING SOON</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">Version {manifest?.version ?? "1.0"} • Profile: {selectedProfile}{comingSoonEngine ? " · Coming soon — Quiz Shorts is live now" : ""}</p>
          </div>
        </div>
      </div>

      {comingSoonEngine && (
        <div
          className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3"
          title="Coming soon — Quiz Shorts is live now"
        >
          <p className="text-xs font-semibold text-amber-300">This engine is coming soon. Quiz Shorts is the live production path — create from the Quiz engine today.</p>
          <a href="/factory/jobs" className="px-3 py-1.5 rounded-lg bg-white text-zinc-900 text-xs font-bold hover:bg-zinc-100 transition-colors">Create Quiz Short →</a>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Config Forms */}
        <div className="lg:col-span-6 bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Sliders className="w-4 h-4 text-blue-400" />
            Configuration
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Topic / Theme</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="general">General</option>
                <option value="kids">Kids</option>
                <option value="experts">Experts</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Engagement Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="Challenging">Challenging</option>
                <option value="Dramatic">Dramatic</option>
                <option value="Friendly">Friendly</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Voice Synthesizer</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="neutral">Neutral Voice</option>
                <option value="male">Male Voice</option>
                <option value="female">Female Voice</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Thumbnail Style</label>
              <select
                value={thumbnailStyle}
                onChange={(e) => setThumbnailStyle(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="cinematic">Cinematic</option>
                <option value="flat">Minimalist</option>
                <option value="isometric">Isometric</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Output Ratio</label>
              <select
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="9:16">Portrait Shorts (9:16)</option>
                <option value="16:9">Horizontal Landscape (16:9)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">AI Provider Override</label>
              <select
                value={providerOverride}
                onChange={(e) => setProviderOverride(e.target.value)}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value="auto">Auto Router</option>
                <option value="google">Google Gemini Only</option>
                <option value="groq">Groq LPU Only</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Retention Policy</label>
              <select
                value={retention}
                onChange={(e) => setRetention(Number(e.target.value))}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-blue-500"
              >
                <option value={24}>Delete after 24h</option>
                <option value={48}>Delete after 48h</option>
                <option value={72}>Delete after 72h</option>
                <option value={0}>Never Delete (Premium)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Publish targets</span>
            <div className="flex flex-wrap gap-2">
              {["youtube", "tiktok", "instagram"].map((p) => {
                const active = platforms.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all select-none ${
                      active 
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                        : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => executeJob.mutate()}
            disabled={running || !topic}
            className="w-full bg-blue-500 hover:bg-blue-600 text-zinc-950 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            <BrandIcon className="w-4 h-4" />
            <span>Generate Video</span>
          </button>
        </div>

        {/* Right Column: Execution Logs / Previews */}
        <div className="lg:col-span-6 space-y-6">
          {/* Logs */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col h-[320px]">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 shrink-0">
              <Terminal className="w-4 h-4 text-blue-400" />
              Live Process Feed
            </h3>
            
            <div className="flex-1 overflow-y-auto mt-4 p-4 rounded-lg bg-zinc-950 border border-zinc-800/60 font-mono text-[10px] leading-relaxed text-zinc-400 space-y-1 terminal-scroll">
              {logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
              {running && (
                <div className="flex items-center gap-2 text-blue-400 animate-pulse mt-2">
                  <span className="w-1.5 h-3 bg-blue-400 inline-block animate-pulse"></span>
                  Running engine logic...
                </div>
              )}
              {logs.length === 0 && (
                <div className="text-zinc-600">Awaiting job launch...</div>
              )}
            </div>
          </div>

          {/* Engine Manifesto */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3 text-xs">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-800 pb-3 font-mono">
              <Shield className="w-4 h-4 text-blue-400" />
              Engine Manifesto
            </h3>
            <div className="space-y-2.5 font-mono text-[10px] text-zinc-400">
              <div className="flex justify-between">
                <span className="text-zinc-650">Hook Prompt:</span>
                <span>{manifest?.hookPrompt ?? "prompts/quiz/hook.txt"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-650">Critic Rules:</span>
                <span>{manifest?.criticRules ?? "content-engines/quiz/critic.json"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-650">Renderer Profile:</span>
                <span>{manifest?.renderProfile ?? "default"}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
