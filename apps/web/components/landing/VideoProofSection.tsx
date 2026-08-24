"use client";

import React, { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Film } from "lucide-react";

export default function VideoProofSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
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
    <section
      id="proof"
      className="py-36 lg:py-44 bg-[#f5f5f7] border-t border-[#e8e8ed] select-none relative overflow-hidden min-h-[85vh] flex flex-col justify-center"
    >
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 space-y-16">
        {/* Section Header */}
        <div className="text-center space-y-5 max-w-4xl mx-auto" data-reveal>
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white border border-[#e8e8ed] text-xs font-text text-[#0071e3] shadow-xs">
            <Film className="w-4 h-4" />
            <span className="font-semibold tracking-wide">VERIFIED FACTORY OUTPUT</span>
          </div>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-apple-headline text-[#1d1d1f] font-display leading-[1.05]">
            This isn't an architectural concept. <br />
            <span className="text-[#0071e3] font-semibold">This system produces media.</span>
          </h2>
          <p className="text-base sm:text-lg font-text text-[#6e6e73] tracking-apple-body max-w-2xl mx-auto">
            Below is an actual short-form video produced end-to-end by the FactoryOS pipeline from a raw natural language brief.
          </p>
        </div>

        {/* Side-by-Side Showcase */}
        <div
          className="bg-white border border-[#e8e8ed] rounded-3xl p-8 sm:p-14 lg:p-16 relative overflow-hidden shadow-xl apple-card-hover"
          data-reveal
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Raw Prompt Brief Input details */}
            <div className="lg:col-span-7 space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-text uppercase text-[#86868b] font-bold tracking-wider">
                  INPUT BRIEF
                </span>
                <div className="p-4 bg-[#f5f5f7] border border-[#e8e8ed] rounded-2xl font-text text-xs text-[#1d1d1f] leading-relaxed shadow-xs">
                  "Create a 45-second retention-optimized short explaining quantum computing password decryption, using high-contrast visual prompts and authoritative voice narration."
                </div>
              </div>

              {/* Execution Pipeline Summary */}
              <div className="space-y-2">
                <span className="text-xs font-text uppercase text-[#86868b] font-bold tracking-wider">
                  FACTORY EXECUTION AUDIT
                </span>
                <div className="grid grid-cols-2 gap-3 font-text text-xs">
                  <div className="p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl shadow-xs">
                    <span className="text-[10px] text-[#86868b] uppercase font-bold">SCRIPT SYNTHESIS</span>
                    <p className="font-semibold text-[#1d1d1f] mt-0.5">60sec Word Timestamps</p>
                  </div>
                  <div className="p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl shadow-xs">
                    <span className="text-[10px] text-[#86868b] uppercase font-bold">VOICE MODEL</span>
                    <p className="font-semibold text-[#1d1d1f] mt-0.5">Marcus-HQ ElevenLabs</p>
                  </div>
                  <div className="p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl shadow-xs">
                    <span className="text-[10px] text-[#86868b] uppercase font-bold">RENDER ENGINE</span>
                    <p className="font-semibold text-[#1d1d1f] mt-0.5">FFmpeg + Remotion</p>
                  </div>
                  <div className="p-3 bg-[#f5f5f7] border border-[#e8e8ed] rounded-xl shadow-xs">
                    <span className="text-[10px] text-[#86868b] uppercase font-bold">COMPLIANCE SCORE</span>
                    <p className="font-bold text-[#34c759] mt-0.5">99.8% Passed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Rendered Media Player */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-[280px] sm:max-w-[310px] aspect-[9/16] bg-white border border-[#e8e8ed] rounded-2xl p-2 shadow-xl overflow-hidden group">
                <div className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    src="/demo-short.mp4"
                    loop
                    muted={isMuted}
                    playsInline
                    className="w-full h-full object-cover"
                  />

                  {/* Play Overlay Button */}
                  {!isPlaying && (
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white transition-opacity group-hover:bg-black/30 cursor-pointer active:scale-95"
                    >
                      <div className="w-14 h-14 rounded-full bg-[#0071e3] text-white flex items-center justify-center shadow-lg transform transition-transform hover:scale-105">
                        <Play className="w-6 h-6 fill-white ml-1" />
                      </div>
                    </button>
                  )}

                  {/* Controls when playing */}
                  {isPlaying && (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20">
                      <button
                        onClick={togglePlay}
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white text-[#1d1d1f] shadow-xs transition-colors cursor-pointer active:scale-90"
                      >
                        <Pause className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={toggleMute}
                        className="p-1.5 rounded-md bg-white/90 hover:bg-white text-[#1d1d1f] shadow-xs transition-colors cursor-pointer active:scale-90"
                      >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
