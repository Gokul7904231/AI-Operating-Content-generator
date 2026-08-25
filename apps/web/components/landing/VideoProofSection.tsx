"use client";

import React, { useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Film } from "lucide-react";

export default function VideoProofSection() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
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
            Below is an actual short-form video produced end-to-end by the ShortForge pipeline from a raw natural language brief.
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
                  "Create a fast-paced German Quiz short with vocabulary challenges, multiple-choice options, countdown timer, and native pronunciation."
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
                    <p className="font-semibold text-[#1d1d1f] mt-0.5">German Quiz · Timestamps</p>
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
                <div 
                  onClick={togglePlay}
                  className="relative w-full h-full rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-pointer select-none"
                >
                  <video
                    ref={videoRef}
                    src="/german-quiz.mp4"
                    poster="/german-quiz-poster.jpg"
                    preload="metadata"
                    loop
                    muted={isMuted}
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onVolumeChange={(e) => setIsMuted(e.currentTarget.muted)}
                    className="w-full h-full object-cover"
                  />

                  {/* Play Overlay Button */}
                  {!isPlaying && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white transition-opacity group-hover:bg-black/30 pointer-events-none">
                      <div className="w-14 h-14 rounded-full bg-[#0071e3] text-white flex items-center justify-center shadow-lg transform transition-transform group-hover:scale-105">
                        <Play className="w-6 h-6 fill-white ml-1" />
                      </div>
                    </div>
                  )}

                  {/* Controls when playing or hovering */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={togglePlay}
                      className="p-2 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-md transition-all cursor-pointer active:scale-90"
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={toggleMute}
                      className="p-2 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-md transition-all cursor-pointer active:scale-90"
                      title={isMuted ? "Unmute Sound" : "Mute Sound"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
