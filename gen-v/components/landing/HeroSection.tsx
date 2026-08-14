"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Play, Pause, Volume2, VolumeX, Sparkles, Layers, ShieldCheck } from "lucide-react";
import HeroBackgroundCanvas from "./HeroBackgroundCanvas";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center pt-36 pb-28 overflow-hidden select-none bg-[#f5f5f7]">
      {/* Living Ambient Production Background */}
      <HeroBackgroundCanvas />

      {/* Hero Radial Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[550px] bg-sky-500/10 rounded-full blur-[160px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          
          {/* Left Column: Positioning & Headlines */}
          <div className="lg:col-span-7 space-y-8 text-left">
            
            {/* Frontier Category Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#e8e8ed] text-xs font-text text-[#1d1d1f] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-pulse" />
              <span className="text-[#86868b] font-medium">CATEGORY:</span>
              <span className="text-[#1d1d1f] font-semibold tracking-wide">PRODUCTION OPERATING SYSTEM</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-apple-hero font-semibold text-[#1d1d1f] font-display">
              YOUR IDEA. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071e3] via-sky-600 to-indigo-600 font-semibold">
                INTO PRODUCTION.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className="text-lg sm:text-xl font-text text-[#6e6e73] max-w-2xl leading-relaxed tracking-apple-body">
              FactoryOS is an autonomous production system for short-form video.
              Give the factory a concept — the system orchestrates scripting, visual synthesis, voice timing, and compliance into a finished short.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-5 pt-2">
              <Link
                href="/login"
                /* Recipe: RECIPES.md #FeedbackPress - Tactile scale(0.97) press feedback */
                className="px-9 py-4 rounded-2xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-base font-semibold tracking-wide transition-[transform,background-color] duration-160 ease-out shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 min-h-[52px] active:scale-[0.97]"
              >
                <span>START CREATING</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <a
                href="#how-it-works"
                className="px-8 py-4 rounded-2xl bg-white hover:bg-[#f2f2f7] text-[#1d1d1f] border border-[#e8e8ed] font-text text-base font-medium transition-[transform,background-color,border-color] duration-160 ease-out flex items-center justify-center gap-2.5 min-h-[52px] active:scale-[0.98] shadow-sm"
              >
                <span>SEE HOW IT WORKS</span>
              </a>
            </div>

            {/* Minimal Production Promise Pills */}
            <div className="pt-8 border-t border-[#e8e8ed] grid grid-cols-3 gap-6 p-6 sm:p-7 bg-white rounded-2xl border border-[#e8e8ed] font-text text-xs text-[#6e6e73] shadow-sm">
              <div>
                <span className="block text-[#86868b] text-[10px] uppercase tracking-wider mb-1 font-bold">INPUT</span>
                <span className="font-semibold text-[#1d1d1f] text-xs sm:text-sm">Natural Brief / Idea</span>
              </div>
              <div>
                <span className="block text-[#86868b] text-[10px] uppercase tracking-wider mb-1 font-bold">EXECUTION</span>
                <span className="font-semibold text-[#1d1d1f] text-xs sm:text-sm">Autonomous Factory</span>
              </div>
              <div>
                <span className="block text-[#86868b] text-[10px] uppercase tracking-wider mb-1 font-bold">OUTPUT</span>
                <span className="font-semibold text-[#1d1d1f] text-xs sm:text-sm">Rendered 9:16 Short</span>
              </div>
            </div>

          </div>

          {/* Right Column: Real 9:16 Vertical Video Showcase */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-full max-w-[310px] sm:max-w-[340px] aspect-[9/16] rounded-2xl bg-zinc-950 border border-zinc-800 p-2 shadow-2xl shadow-black/80 group">
              {/* Outer frame glow */}
              <div className="absolute inset-0 rounded-2xl border border-amber-500/20 pointer-events-none group-hover:border-amber-500/40 transition-colors" />

              {/* Video Player Container */}
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  src="/demo-short.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Minimal Overlay Badge */}
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-zinc-950/80 backdrop-blur-sm border border-zinc-800 text-[10px] font-mono text-zinc-300 flex items-center gap-1.5 z-20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL FACTORYOS RENDER
                </div>

                {/* Playback Controls Overlay */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-md bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 transition-colors"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-md bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800 text-zinc-300 transition-colors"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Bottom Caption */}
              <div className="mt-2 text-center">
                <p className="text-[11px] font-mono text-zinc-500">
                  Topic: "Quantum Computing Decryption" · Rendered by FactoryOS Pipeline
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
