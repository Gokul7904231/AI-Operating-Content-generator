"use client";

import React, { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Play, Pause, Volume2, VolumeX } from "lucide-react";
import HeroBackgroundCanvas from "./HeroBackgroundCanvas";

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
            <div className={`inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#e8e8ed] text-xs font-text text-[#1d1d1f] shadow-xs reveal ${mounted ? "visible" : ""}`}>
              <span className="w-2 h-2 rounded-full bg-[#0071e3] animate-pulse" />
              <span className="text-[#86868b] font-medium">CATEGORY:</span>
              <span className="text-[#1d1d1f] font-semibold tracking-wide">PRODUCTION OPERATING SYSTEM</span>
            </div>

            {/* Main Headline */}
            <h1 className={`text-4xl sm:text-6xl lg:text-[72px] font-bold text-[#1d1d1f] font-display tracking-[-0.035em] leading-[1.04] reveal reveal-d1 ${mounted ? "visible" : ""}`}>
              YOUR IDEA. <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071e3] via-sky-600 to-indigo-600 font-bold">
                INTO PRODUCTION.
              </span>
            </h1>

            {/* Supporting Copy */}
            <p className={`text-lg sm:text-xl font-text text-[#6e6e73] max-w-2xl leading-relaxed tracking-apple-body reveal reveal-d2 ${mounted ? "visible" : ""}`}>
              ShortForge is an autonomous production system for short-form video.
              Give the factory a concept — the system orchestrates scripting, visual synthesis, voice timing, and compliance into a finished short.
            </p>

            {/* Action Buttons */}
            <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-5 pt-2 reveal reveal-d3 ${mounted ? "visible" : ""}`}>
              <Link
                href="/login"
                className="px-9 py-4 rounded-2xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-base font-semibold tracking-wide transition-[transform,background-color,box-shadow] duration-160 ease-out shadow-xl shadow-sky-500/20 flex items-center justify-center gap-3 min-h-[52px] active:scale-[0.97]"
              >
                <span>START CREATING</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              <a
                href="#how-it-works"
                className="px-8 py-4 rounded-2xl bg-white hover:bg-[#f2f2f7] text-[#1d1d1f] border border-[#e8e8ed] font-text text-base font-medium transition-[transform,background-color,border-color] duration-160 ease-out flex items-center justify-center gap-2.5 min-h-[52px] active:scale-[0.98] shadow-xs"
              >
                <span>SEE HOW IT WORKS</span>
              </a>
            </div>

            {/* Production Promise Pills */}
            <div className={`grid grid-cols-3 gap-4 sm:gap-6 p-5 sm:p-6 bg-white rounded-2xl border border-[#e8e8ed] font-text text-xs text-[#6e6e73] shadow-xs reveal reveal-d4 ${mounted ? "visible" : ""}`}>
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
            <div className={`relative w-full max-w-[320px] sm:max-w-[350px] aspect-[9/16] rounded-[36px] bg-[#1a1a1e] border-4 border-[#2c2c30] p-2.5 shadow-2xl shadow-black/25 group reveal reveal-d2 ${mounted ? "visible" : ""}`}>
              {/* Subtle outer frame highlight */}
              <div className="absolute inset-0 rounded-[32px] border border-white/10 pointer-events-none" />

              {/* Video Player Container */}
              <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  src="/demo-short.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Translucent Overlay Badge */}
                <div className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-text text-white/90 flex items-center gap-2 z-20 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium tracking-wide">REAL SHORTFORGE RENDER</span>
                </div>

                {/* Playback Controls Overlay */}
                <div className="absolute bottom-3.5 right-3.5 flex items-center gap-2 z-20">
                  <button
                    onClick={togglePlay}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-colors cursor-pointer active:scale-90"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={toggleMute}
                    className="p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white transition-colors cursor-pointer active:scale-90"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Bottom Caption */}
              <div className="mt-2 text-center">
                <p className="text-[11px] font-text text-zinc-400">
                  Topic: "Quantum Computing Decryption" · Rendered by ShortForge Pipeline
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
