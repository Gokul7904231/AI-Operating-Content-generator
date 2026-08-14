"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Play, Layers } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,padding] duration-200 ease-out select-none ${
        scrolled 
          ? "bg-white/90 backdrop-blur-xl border-b border-[#e8e8ed] py-3 shadow-sm" 
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 group min-h-[44px]">
          <div className="w-8 h-8 rounded-lg bg-sky-50 border border-[#0071e3]/30 flex items-center justify-center shadow-sm group-hover:border-[#0071e3] transition-colors p-1 overflow-hidden">
            <img src="/favicon-black.png" alt="FactoryOS Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-apple-headline text-[#1d1d1f] font-display">
              FACTORYOS
            </span>
            <span className="text-[9px] font-text text-[#86868b] tracking-wider uppercase -mt-0.5 font-semibold">
              SHORT-FORM PRODUCTION OS
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-text font-medium tracking-apple-body">
          <a href="#product" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center">
            Product
          </a>
          <a href="#how-it-works" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center">
            How It Works
          </a>
          <a href="#architecture" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center">
            Architecture
          </a>
          <a href="#proof" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center">
            Video Proof
          </a>
        </nav>

        {/* CTAs */}
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-3.5 py-1.5 rounded-lg text-xs font-text font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] border border-transparent hover:border-[#e8e8ed] transition-[colors,border-color] duration-160 min-h-[44px] flex items-center"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="px-4 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-xs font-semibold tracking-wide transition-[transform,background-color] duration-160 ease-out shadow-sm flex items-center gap-1.5 min-h-[44px] active:scale-[0.97]"
          >
            <span>START CREATING</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

      </div>
    </header>
  );
}
