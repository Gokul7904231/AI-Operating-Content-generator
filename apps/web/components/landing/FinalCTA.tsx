"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function FinalCTA() {
  return (
    <section className="py-40 lg:py-52 bg-[#f5f5f7] border-t border-[#e8e8ed] select-none relative overflow-hidden flex flex-col justify-center">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-sky-500/10 rounded-full blur-[180px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-12 text-center space-y-10 relative z-10" data-reveal>
        <div className="space-y-6">
          <span className="px-4 py-2 rounded-full bg-white border border-[#e8e8ed] text-xs font-text text-[#0071e3] font-semibold uppercase tracking-wider shadow-xs inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759] animate-pulse" /> QUIZ SHORTS — LIVE NOW · OTHER FORMATS COMING SOON
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-[#1d1d1f] font-display tracking-[-0.035em] leading-[1.04]">
            START CREATING <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0071e3] to-indigo-600">QUIZ SHORTS</span>
          </h2>
          <p className="text-lg sm:text-xl font-text text-[#6e6e73] max-w-2xl mx-auto tracking-apple-body">
            Start with Quiz Shorts — live today. Give the factory a topic and get a finished 9:16 short. Facts, Stories & more are coming soon.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Link
            href="/login"
            className="px-10 py-5 rounded-2xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-lg font-semibold tracking-wide transition-[transform,background-color,box-shadow] duration-160 ease-out shadow-2xl shadow-sky-500/20 flex items-center gap-3.5 min-h-[60px] active:scale-[0.97]"
          >
            <span>START CREATING</span>
            <ArrowRight className="w-6 h-6" />
          </Link>
        </div>
      </div>
    </section>
  );
}
