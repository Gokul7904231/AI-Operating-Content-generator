"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Globe2, 
  Settings2, 
  Sparkles, 
  Play, 
  Download, 
  Clock, 
  HelpCircle,
  FileVideo,
  FileText,
  CheckCircle2
} from "lucide-react";
import { useOSStore } from "@/lib/os-store";

const GEO_COUNTRIES = [
  { code: "US", label: "🇺🇸 United States (US)" },
  { code: "GB", label: "🇬🇧 United Kingdom (UK)" },
  { code: "IN", label: "🇮🇳 India (IN)" },
  { code: "JP", label: "🇯🇵 Japan (JP)" },
  { code: "IT", label: "🇮🇹 Italy (IT)" },
  { code: "BR", label: "🇧🇷 Brazil (BR)" },
  { code: "DE", label: "🇩🇪 Germany (DE)" },
  { code: "FR", label: "🇫🇷 France (FR)" },
  { code: "CA", label: "🇨🇦 Canada (CA)" },
  { code: "AU", label: "🇦🇺 Australia (AU)" },
];

export default function QuickGenerateOverlay() {
  const isOpen = useOSStore((state) => state.quickGenerateOpen);
  const setOpen = useOSStore((state) => state.setQuickGenerateOpen);

  const [quizCountry, setQuizCountry] = useState("US");
  const [engagementTone, setEngagementTone] = useState("Challenging & Provocative");
  const [quizFormat, setQuizFormat] = useState("6_rapid");
  const [batchNumber, setBatchNumber] = useState("1");
  const [mockMode, setMockMode] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quizData, setQuizData] = useState<any>(null);

  // Video Rendering State
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoStatus, setVideoStatus] = useState<any>(null);
  const [polling, setPolling] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollingStartRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      // Defer state resets to satisfy ESLint effect rule
      setTimeout(() => {
        setQuizData(null);
        setVideoStatus(null);
        setError("");
      }, 0);
    }
  }, [isOpen]);

  async function generateDraft() {
    setLoading(true);
    setError("");
    setVideoStatus(null);
    try {
      const endpoint = mockMode ? "/api/quiz/mock" : "/api/quiz/geo";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ 
          countryCode: quizCountry, 
          tone: engagementTone, 
          format: quizFormat, 
          version: parseInt(batchNumber) || 1 
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to generate geo-quiz draft");

      setQuizData({
        hook: json.hook,
        questions: (json.questions || []).map((q: any) => ({
          question: q.question,
          options: q.options,
          answer: q.options[q.answerIndex ?? 0],
          answerIndex: q.answerIndex ?? 0,
          difficulty: "medium",
        })),
        title: `${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry} Quiz`,
        description: `How well do you know ${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry}? Take the challenge!`,
        hashtags: ["quiz", "geoquiz", quizCountry.toLowerCase(), "shorts"],
      });
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  }

  async function renderVideo() {
    setGeneratingVideo(true);
    setVideoStatus(null);
    setError("");
    try {
      const payload = {
        topic: `${GEO_COUNTRIES.find((c) => c.code === quizCountry)?.label ?? quizCountry} Geo Quiz`,
        style: "quiz",
        contentType: "QUIZ_SHORTS",
        hook: quizData?.hook,
        questions: quizData?.questions,
        title: quizData?.title,
        description: quizData?.description,
        hashtags: quizData?.hashtags,
        renderProfile: "FAST_QUIZ",
        durationSeconds: 45,
      };

      const res = await fetch("/api/generate-video", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Video generation failed");
      setVideoStatus({ videoId: json.jobId || json.videoId, status: json.status });
    } catch (e: any) {
      setError(e?.message ?? "Video generation failed");
    } finally {
      setGeneratingVideo(false);
    }
  }

  // Polling Status
  useEffect(() => {
    if (!videoStatus?.videoId) return;
    if (polling) return;

    let cancelled = false;
    const id = videoStatus.videoId;
    
    // Defer state updates to satisfy react-hooks/set-state-in-effect
    setTimeout(() => {
      setPolling(true);
      setElapsedSeconds(0);
    }, 0);
    
    pollingStartRef.current = Date.now();

    const elapsedTimerId = setInterval(() => {
      if (cancelled) return;
      setElapsedSeconds(Math.floor((Date.now() - pollingStartRef.current) / 1000));
    }, 1000);

    async function tick() {
      if (cancelled) return;
      try {
        const res = await fetch(`/api/job-status/${id}`);
        const json = await res.json();
        if (res.ok) {
          setVideoStatus((prev: any) => {
            if (!prev?.videoId || prev.videoId !== id) return prev;
            return {
              videoId: id,
              status: json.status,
              output: json.output || (json.videoUrl ? { videoUrl: json.videoUrl, thumbnailUrl: json.thumbnailUrl } : null),
            };
          });
          if (json.status === "completed" || json.status === "failed") {
            clearInterval(elapsedTimerId);
            setTimeout(() => setPolling(false), 0);
            if (json.status === "failed" && json.error) {
              setError(`Video rendering failed: ${json.error}`);
            }
            return;
          }
        }
      } catch (e) {}
      if (!cancelled) setTimeout(tick, elapsedSeconds < 60 ? 3000 : 5000);
    }
    tick();
    return () => { cancelled = true; clearInterval(elapsedTimerId); setTimeout(() => setPolling(false), 0); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoStatus?.videoId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          {/* Overlay Box */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-4xl max-h-[85vh] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-zinc-50">Quick Generate Short</h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded hover:bg-zinc-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6 terminal-scroll">
              {/* Form Config Left */}
              <div className="md:col-span-5 space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Target Country</label>
                  <select
                    value={quizCountry}
                    onChange={(e) => setQuizCountry(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    {GEO_COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Engagement Tone</label>
                  <select
                    value={engagementTone}
                    onChange={(e) => setEngagementTone(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="Challenging & Provocative">Challenging & Provocative</option>
                    <option value="Educational & Direct">Educational & Direct</option>
                    <option value="Fun & Energetic">Fun & Energetic</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Quiz Format</label>
                  <select
                    value={quizFormat}
                    onChange={(e) => setQuizFormat(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
                  >
                    <option value="6_rapid">6 Rapid Questions (Golden Strategy, 60s)</option>
                    <option value="12_slow">12 Slow Paced Questions (120s)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Batch / Version</label>
                  <input
                    type="number"
                    min="1"
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-md bg-zinc-950 border border-zinc-800/80">
                  <div>
                    <div className="text-[10px] font-bold text-zinc-200">Sandbox Mock Mode</div>
                    <div className="text-[9px] text-zinc-500">Fast preview run, saves credits.</div>
                  </div>
                  <button 
                    onClick={() => setMockMode(!mockMode)}
                    className={`w-9 h-5 rounded-full relative transition-colors ${mockMode ? 'bg-emerald-500' : 'bg-zinc-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${mockMode ? 'left-4.5' : 'left-0.5'}`} />
                  </button>
                </div>

                <button
                  onClick={generateDraft}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold text-xs py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2"><div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin"/> Generating...</span>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Generate Draft</>
                  )}
                </button>
              </div>

              {/* Viewer Output Right */}
              <div className="md:col-span-7 flex flex-col h-full overflow-hidden">
                {error && (
                  <div className="p-3 mb-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-semibold text-rose-400">
                    {error}
                  </div>
                )}

                {!quizData && !loading ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 border border-zinc-800 border-dashed rounded-xl bg-zinc-950/30">
                    <HelpCircle className="w-10 h-10 text-zinc-700 mb-3" />
                    <div className="text-xs font-bold text-zinc-300">No Draft Generated</div>
                    <div className="text-[10px] text-zinc-500 max-w-xs mt-1">Configure options on the left and click &ldquo;Generate Draft&rdquo; to write script scenes.</div>
                  </div>
                ) : quizData ? (
                  <div className="flex-grow space-y-4">
                    {/* Hook Display */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
                      <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" /> Opening Hook
                      </div>
                      <p className="text-xs text-zinc-200 leading-relaxed italic">
                        &ldquo;{quizData.hook}&rdquo;
                      </p>
                    </div>

                    {/* Compile trigger */}
                    <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <div className="text-xs font-bold text-zinc-200">Video Content Ready</div>
                        <div className="text-[9px] text-zinc-500">Fast rendering profile (approx 45s).</div>
                      </div>
                      <button
                        onClick={renderVideo}
                        disabled={generatingVideo || videoStatus?.status === "processing"}
                        className="bg-zinc-50 hover:bg-zinc-200 text-zinc-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-2 active:scale-[0.98] transition-all"
                      >
                        {generatingVideo ? (
                          <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <><Play className="w-3 h-3 fill-zinc-950" /> Render Video</>
                        )}
                      </button>
                    </div>

                    {/* Rendering Telemetry */}
                    {(videoStatus?.status === "processing" || videoStatus?.status === "queued" || videoStatus?.status === "completed") && (
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> FFmpeg Telemetry
                          </div>
                          <div className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                            {videoStatus.status}
                          </div>
                        </div>

                        {videoStatus.status !== "completed" ? (
                          <div className="flex flex-col items-center justify-center p-4 border border-zinc-800/80 rounded bg-zinc-900">
                            <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin mb-2" />
                            <div className="text-xs font-semibold text-zinc-300">Rendering Video Pipeline</div>
                            <div className="w-full bg-zinc-800 rounded-full h-1 mt-3 overflow-hidden">
                              <div className="bg-emerald-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.min(100, (elapsedSeconds / 45) * 100)}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-4 items-center p-3 border border-emerald-500/20 rounded bg-emerald-500/5">
                            {videoStatus.output?.videoUrl && (
                              <div className="w-20 shrink-0 rounded overflow-hidden border border-zinc-800 bg-black aspect-[9/16]">
                                <video src={videoStatus.output.videoUrl} muted autoPlay loop className="w-full h-full object-cover" />
                              </div>
                            )}
                            <div className="space-y-2">
                              <div className="text-xs font-bold text-zinc-100">Render Successful</div>
                              <a href={videoStatus.output?.videoUrl} download className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] font-bold py-1.5 px-3 rounded border border-zinc-700">
                                <Download className="w-3 h-3" /> Download MP4
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
