"use client";

import React from "react";
import Link from "next/link";
import { Github, Twitter, Mail, ArrowUpRight, ShieldCheck, Cpu, Database, Cloud } from "lucide-react";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-[#e8e8ed] select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top grid */}
        <div className="py-12 lg:py-14 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-12 gap-8 lg:gap-8">
          {/* Brand — spans 5 */}
          <div className="col-span-2 md:col-span-4 lg:col-span-5 flex flex-col gap-4">
            <Link href="/" className="flex items-center gap-2.5 group w-fit" aria-label="ShortForge home">
              <div className="w-9 h-9 rounded-xl bg-sky-50 border border-[#0071e3]/20 flex items-center justify-center shadow-xs p-1.5 overflow-hidden group-hover:border-[#0071e3]/40 transition-colors">
                <img src="/favicon-black.png" alt="ShortForge" width={28} height={28} className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-[#1d1d1f] font-display leading-none">SHORTFORGE</span>
                <span className="text-[9px] font-semibold tracking-[0.14em] text-[#86868b] uppercase leading-none mt-1">SHORT-FORM PRODUCTION OS</span>
              </div>
            </Link>

            <p className="text-[13px] leading-6 text-[#6e6e73] max-w-[36ch] font-text">
              One topic in. One viral Short out. Automated pipeline from script and voice to visuals, subtitles and mux — orchestrated on Render, rendered on Azure, delivered via Cloudinary.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <a
                href="https://github.com/Gokul7904231/ShortForge"
                target="_blank"
                rel="noreferrer"
                aria-label="ShortForge on GitHub"
                className="w-9 h-9 rounded-full bg-[#f5f5f7] border border-[#e8e8ed] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white hover:border-[#d2d2d7] hover:shadow-xs transition-all active:scale-95"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                aria-label="ShortForge on X"
                className="w-9 h-9 rounded-full bg-[#f5f5f7] border border-[#e8e8ed] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white hover:border-[#d2d2d7] hover:shadow-xs transition-all active:scale-95"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@shortforge.app"
                aria-label="Email ShortForge"
                className="w-9 h-9 rounded-full bg-[#f5f5f7] border border-[#e8e8ed] flex items-center justify-center text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-white hover:border-[#d2d2d7] hover:shadow-xs transition-all active:scale-95"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#1d1d1f]">Product</h3>
            <nav className="flex flex-col gap-2.5 text-[13px] font-medium">
              <a href="#product" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Overview</a>
              <a href="#how-it-works" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">How it Works</a>
              <a href="#architecture" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Architecture</a>
              <a href="#proof" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Video Proof</a>
              <Link href="/pricing" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit inline-flex items-center gap-1">
                Pricing <ArrowUpRight className="w-3 h-3 opacity-60" />
              </Link>
            </nav>
          </div>

          {/* Workspace */}
          <div className="flex flex-col gap-4">
            <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#1d1d1f]">Workspace</h3>
            <nav className="flex flex-col gap-2.5 text-[13px] font-medium">
              <Link href="/dashboard" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Dashboard</Link>
              <Link href="/factory/jobs" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Factory Jobs</Link>
              <Link href="/media/library" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Media Library</Link>
              <Link href="/overseer" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Overseer</Link>
              <Link href="/engines" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Engines</Link>
            </nav>
          </div>

          {/* Resources & Legal — spans 3 */}
          <div className="col-span-2 md:col-span-2 lg:col-span-3 flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#1d1d1f]">Resources</h3>
              <nav className="flex flex-col gap-2.5 text-[13px] font-medium">
                <a
                  href="https://github.com/Gokul7904231/ShortForge/blob/main/docs/ARCHITECTURE.md"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit inline-flex items-center gap-1"
                >
                  Architecture Docs <ArrowUpRight className="w-3 h-3 opacity-60" />
                </a>
                <Link href="/login" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Sign in</Link>
                <a href="mailto:hello@shortforge.app" className="text-[#6e6e73] hover:text-[#1d1d1f] transition-colors w-fit">Contact</a>
              </nav>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-[11px] font-bold tracking-[0.14em] uppercase text-[#1d1d1f]">Legal</h3>
              <p className="text-[12px] leading-5 text-[#86868b]">
                By signing in you agree to our{" "}
                <a href="#" className="underline decoration-[#d2d2d7] underline-offset-4 hover:text-[#1d1d1f] hover:decoration-[#86868b] transition-colors">Terms</a>
                {" "}and{" "}
                <a href="#" className="underline decoration-[#d2d2d7] underline-offset-4 hover:text-[#1d1d1f] hover:decoration-[#86868b] transition-colors">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </div>

        {/* Stack strip */}
        <div className="border-t border-[#e8e8ed] py-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#86868b]">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f5f7] border border-[#e8e8ed]">
            <Cpu className="w-3 h-3" /> Render · Node 20 · Next.js 16
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f5f7] border border-[#e8e8ed]">
            <Database className="w-3 h-3" /> Firestore · 109 routes
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f5f5f7] border border-[#e8e8ed]">
            <Cloud className="w-3 h-3" /> Cloudinary · Azure Render
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#0071e3]/20 text-[#0071e3]">
            <ShieldCheck className="w-3 h-3" /> HMAC · quota-enforced
          </span>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-[#e8e8ed] py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-xs">
            <span className="text-[#86868b] font-medium">© {year} ShortForge. All rights reserved.</span>
            <span className="hidden sm:inline text-[#e8e8ed]">|</span>
            <span className="text-[#6e6e73]">Short-form Production OS · Built for creators, not committees.</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#e8e8ed] shadow-xs text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-[#34c759] animate-pulse" aria-hidden />
              <span className="text-[#1d1d1f]">System Operational</span>
              <span className="text-[#86868b] hidden sm:inline">· Live on Render</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
