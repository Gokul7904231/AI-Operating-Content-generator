"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Film,
  Sparkles,
  Play,
  ArrowRight,
  Zap,
  Cpu,
  Layers,
  Share2,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/new-ui/Button";

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Idea & Hook Synthesis",
    desc: "Enter a high-concept topic or URL. The Hook LLM crafts an viral 3-second visual opener and script.",
  },
  {
    step: "02",
    title: "Scene RAG Indexing",
    desc: "Automatically queries stock media libraries and vector assets to match every sentence with high-impact footage.",
  },
  {
    step: "03",
    title: "Voice-Over & Audio Sync",
    desc: "Synthesizes ultra-natural Edge TTS audio narration synchronized with precision word timestamps.",
  },
  {
    step: "04",
    title: "FFmpeg Hardware Encoding",
    desc: "Composites 9:16 vertical 1080x1920 video layers, animated captions, and audio peak normalization.",
  },
  {
    step: "05",
    title: "Multi-Platform Publishing",
    desc: "Pushes final rendered MP4s directly to TikTok, YouTube Shorts, and Instagram Reels queues.",
  },
];

const SHOWCASE_VIDEOS = [
  {
    id: 1,
    title: "The 3-Second Brain Hack",
    views: "1.4M",
    engagement: "9.2%",
    timecode: "00:00:15:00",
    tags: ["Psychology", "Viral Short"],
  },
  {
    id: 2,
    title: "Why AI Workflows Are Exploding",
    views: "890K",
    engagement: "11.4%",
    timecode: "00:00:18:12",
    tags: ["Tech", "FactoryOS AI"],
  },
  {
    id: 3,
    title: "How Space Startups Build Fast",
    views: "2.1M",
    engagement: "8.7%",
    timecode: "00:00:12:24",
    tags: ["Engineering", "Documentary"],
  },
];

export default function PublicLobbyPage() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-400">
      {/* 01 — Minimalist Header */}
      <header className="h-16 w-full max-w-7xl mx-auto px-6 flex items-center justify-between border-b border-zinc-900/80">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Film className="w-4 h-4" />
          </div>
          <span className="font-bold text-base text-zinc-100 tracking-tight">
            Factory<span className="text-amber-500">OS</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              <Lock className="w-3.5 h-3.5" /> Admin Sign In
            </Button>
          </Link>
          <Link href="/new-ui/dashboard">
            <Button variant="primary" size="sm">
              <span>Start Creating</span>
              <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 01 — HERO SECTION */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20 md:py-28 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono rounded-full">
            <Sparkles className="w-3.5 h-3.5" /> FactoryOS Pro v1.0 • NLE Production OS
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.08]">
            The AI Production Operating System for <span className="text-amber-500">Short-Form Video</span>
          </h1>

          <p className="text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            FactoryOS transforms raw concepts, URLs, and scripts into fully rendered 9:16 vertical video assets — complete with voice-over, scene RAG, and animated captions.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-4">
            <Link href="/new-ui/dashboard">
              <Button variant="primary" size="lg">
                <span>Start Creating Now</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="#story">
              <Button variant="secondary" size="lg">
                <Play className="w-4 h-4 fill-zinc-300" />
                <span>Watch FactoryOS Pipeline</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Hero Video Viewport Box */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[320px] aspect-[9/16] bg-black border border-zinc-800 rounded-[8px] overflow-hidden shadow-2xl relative group nle-glass-edge">
            <div className="absolute top-3 left-3 z-20 px-2 py-0.5 bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded">
              H.264 • 1080x1920 • 30FPS
            </div>

            <div className="w-full h-full bg-gradient-to-b from-zinc-950 via-zinc-900 to-black p-6 flex flex-col justify-between relative">
              <div className="pt-10">
                <span className="text-[10px] font-mono text-amber-500 uppercase tracking-widest">
                  LIVE DEMO OUTPUT
                </span>
                <h3 className="text-lg font-bold text-zinc-100 mt-1">
                  Why 90% of Creators Use AI Pipelines
                </h3>
              </div>

              <div className="w-14 h-14 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mx-auto my-auto group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-amber-400 ml-1" />
              </div>

              <div className="p-3 bg-zinc-950/90 border border-zinc-800 rounded text-xs font-mono text-zinc-400 flex items-center justify-between">
                <span>00:00:14:12</span>
                <span className="text-emerald-400 font-semibold">100% RENDERED</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 02 — PRODUCT STORY (Interactive Pipeline Step Reveal) */}
      <section id="story" className="w-full bg-zinc-950/60 border-y border-zinc-900/80 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">
              AUTOMATED MANUFACTURING
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100">
              Idea $\rightarrow$ Script $\rightarrow$ Scene $\rightarrow$ Voice $\rightarrow$ Render $\rightarrow$ Publish
            </h2>
            <p className="text-sm text-zinc-400">
              Observe how FactoryOS orchestrates LLM scriptwriters, TTS voice actors, and FFmpeg render nodes in real-time.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Interactive Step Controls */}
            <div className="lg:col-span-5 space-y-2">
              {PIPELINE_STEPS.map((step, idx) => (
                <div
                  key={step.step}
                  onClick={() => setActiveStep(idx)}
                  className={`p-4 rounded-[6px] border cursor-pointer transition-all ${
                    activeStep === idx
                      ? "bg-zinc-900 border-amber-500/50 text-zinc-100 shadow-md"
                      : "bg-zinc-950/40 border-zinc-800/60 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded ${
                        activeStep === idx
                          ? "bg-amber-500/20 text-amber-400 font-semibold"
                          : "bg-zinc-900 text-zinc-600"
                      }`}
                    >
                      {step.step}
                    </span>
                    <h3 className="text-sm font-semibold">{step.title}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Interactive Step Detail Canvas */}
            <div className="lg:col-span-7 bg-zinc-900/80 border border-zinc-800 rounded-[6px] p-6 nle-glass-edge">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-4">
                <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">
                  STAGE {PIPELINE_STEPS[activeStep].step} EXECUTION
                </span>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE PIPELINE
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">
                {PIPELINE_STEPS[activeStep].title}
              </h3>
              <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                {PIPELINE_STEPS[activeStep].desc}
              </p>

              <div className="p-4 bg-black border border-zinc-800 rounded font-mono text-xs text-zinc-400 space-y-2">
                <p className="text-zinc-500">// Engine Telemetry Log</p>
                <p className="text-amber-400">
                  Executing: {PIPELINE_STEPS[activeStep].title}...
                </p>
                <p className="text-zinc-300">
                  Latency: 142ms • Status: OPTIMAL • Threads: 8
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 03 — REAL OUTPUT GALLERY */}
      <section className="w-full max-w-7xl mx-auto px-6 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="text-xs font-mono text-amber-500 uppercase tracking-widest">
              GENERATED OUTPUTS
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-100 mt-1">
              Production Showcase
            </h2>
          </div>
          <p className="text-xs font-mono text-zinc-500">
            Real short-form assets generated by FactoryOS engine nodes
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SHOWCASE_VIDEOS.map((video) => (
            <div
              key={video.id}
              className="bg-zinc-900/60 border border-zinc-800 rounded-[6px] p-4 group hover:border-zinc-700 transition-colors nle-glass-edge"
            >
              <div className="w-full aspect-[9/16] bg-black rounded border border-zinc-900 relative overflow-hidden mb-4 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-amber-400 ml-0.5" />
                </div>
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-zinc-950/80 text-[10px] font-mono text-zinc-400 rounded">
                  {video.timecode}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-zinc-200 mb-2">{video.title}</h3>
              <div className="flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>{video.views} Views</span>
                <span className="text-amber-400">{video.engagement} Engagement</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 04 — FINAL CTA */}
      <section className="w-full bg-zinc-950 border-t border-zinc-900/80 py-20 text-center">
        <div className="max-w-3xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-100">
            Ready to Automate Your Short-Form Production?
          </h2>
          <p className="text-sm md:text-base text-zinc-400">
            Join creators and growth engineering teams generating high-performing vertical videos with FactoryOS.
          </p>
          <div className="pt-4 flex justify-center gap-4">
            <Link href="/new-ui/dashboard">
              <Button variant="primary" size="lg">
                <span>Launch FactoryOS Command Center</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full border-t border-zinc-900 py-6 px-6 text-center text-xs font-mono text-zinc-600">
        FactoryOS Pro v1.0 • Built with Apple Craft, Final Cut Pro NLE Architecture & Linear Precision
      </footer>
    </div>
  );
}
