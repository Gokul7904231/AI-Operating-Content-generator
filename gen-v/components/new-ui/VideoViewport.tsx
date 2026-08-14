"use client";

import React, { useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, RotateCcw } from "lucide-react";

interface VideoViewportProps {
  src?: string;
  title?: string;
  aspectRatio?: "9:16" | "16:9";
  timecode?: string;
  codec?: string;
  fps?: number;
}

export function VideoViewport({
  src,
  title = "Rendered Preview",
  aspectRatio = "9:16",
  timecode = "00:00:14:12",
  codec = "H.264 / 1080x1920",
  fps = 30,
}: VideoViewportProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  return (
    <div className="relative bg-black border border-zinc-800 rounded-[6px] overflow-hidden flex flex-col items-center justify-center group shadow-2xl">
      {/* Telemetry Header Badge */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <span className="px-2 py-0.5 bg-zinc-950/80 border border-zinc-800 text-[10px] font-mono text-zinc-400 rounded">
          {codec} • {fps}FPS
        </span>
        <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-[10px] font-mono text-amber-400 rounded">
          {timecode}
        </span>
      </div>

      {/* Media Canvas Container */}
      <div
        className={`w-full relative flex items-center justify-center bg-black ${
          aspectRatio === "9:16" ? "max-w-[320px] aspect-[9/16] my-4" : "w-full aspect-video"
        }`}
      >
        {src ? (
          <video
            src={src}
            className="w-full h-full object-cover rounded-[4px]"
            loop
            muted={isMuted}
          />
        ) : (
          <div className="w-full h-full bg-zinc-950 border border-zinc-900 rounded-[4px] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-amber-500">
              <Play className="w-5 h-5 fill-amber-500 ml-0.5" />
            </div>
            <p className="text-xs font-mono text-zinc-400 uppercase tracking-wider">{title}</p>
            <p className="text-[11px] text-zinc-600 mt-1">Short-Form Video Engine Ready</p>
          </div>
        )}
      </div>

      {/* Floating Translucent Transport Scrubber Bar */}
      <div className="w-full bg-zinc-950/90 border-t border-zinc-800/80 p-3 flex flex-col gap-2 backdrop-blur-md">
        {/* Scrubber Progress Track */}
        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden cursor-pointer relative group/scrubber">
          <div className="h-full bg-amber-500 w-1/3 relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-amber-400 rounded-full shadow-sm opacity-0 group-hover/scrubber:opacity-100 transition-opacity" />
          </div>
        </div>

        {/* Transport Actions */}
        <div className="flex items-center justify-between text-zinc-400">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-1.5 hover:bg-zinc-800 hover:text-zinc-100 rounded text-amber-500 transition-colors"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-amber-500" />}
            </button>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 hover:bg-zinc-800 hover:text-zinc-100 rounded transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <span className="text-xs font-mono text-zinc-400 ml-1">00:04 / 00:14</span>
          </div>

          <div className="flex items-center gap-2">
            <button className="p-1.5 hover:bg-zinc-800 hover:text-zinc-100 rounded transition-colors">
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button className="p-1.5 hover:bg-zinc-800 hover:text-zinc-100 rounded transition-colors">
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
