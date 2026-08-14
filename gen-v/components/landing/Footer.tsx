"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#f5f5f7] border-t border-[#e8e8ed] py-12 select-none font-text text-xs text-[#86868b]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Brand */}
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-white border border-[#0071e3]/30 flex items-center justify-center shadow-xs p-0.5 overflow-hidden">
            <img src="/favicon-black.png" alt="FactoryOS Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-bold text-[#1d1d1f] font-display">FACTORYOS</span>
          <span className="text-[#e8e8ed]">|</span>
          <span className="text-[#86868b] font-medium">SHORT-FORM PRODUCTION OS</span>
        </div>

        {/* Center: System Status Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#e8e8ed] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#34c759]" />
          <span className="text-[#1d1d1f] font-medium">SYSTEM STATUS: OPERATIONAL</span>
        </div>

        {/* Right: Links & Copyright */}
        <div className="flex items-center gap-6 font-medium">
          <Link href="/login" className="hover:text-[#1d1d1f] transition-colors">
            Sign In
          </Link>
          <a href="#product" className="hover:text-[#1d1d1f] transition-colors">
            Product
          </a>
          <a href="#architecture" className="hover:text-[#1d1d1f] transition-colors">
            Architecture
          </a>
          <span className="text-[#86868b]">© 2026 FactoryOS</span>
        </div>

      </div>
    </footer>
  );
}
