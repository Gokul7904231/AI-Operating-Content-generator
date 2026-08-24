"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

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
      className={`fixed top-0 left-0 right-0 z-50 transition-[background-color,border-color,box-shadow,padding] duration-200 ease-out select-none ${
        scrolled
          ? "bg-white/85 backdrop-blur-xl border-b border-[#e8e8ed] py-3 shadow-xs"
          : "bg-transparent py-5"
      }`}
      data-od-id="navbar"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Official ShortForge Brand Logo */}
        <Link
          href="/"
          className="brand flex items-center gap-2.5 group min-h-[44px]"
          data-od-id="brand-logo"
          aria-label="ShortForge home"
        >
          <div className="brand-icon w-8 h-8 rounded-lg bg-sky-50/80 border border-[#0071e3]/30 flex items-center justify-center shadow-xs group-hover:border-[#0071e3] group-hover:scale-105 transition-[border-color,transform] duration-200 p-1 overflow-hidden">
            <img
              src="/favicon-black.png"
              alt="ShortForge Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="brand-name text-sm font-bold tracking-apple-headline text-[#1d1d1f] font-display">
              SHORTFORGE
            </span>
            <span className="brand-tag text-[9px] font-text text-[#86868b] tracking-wider uppercase -mt-0.5 font-semibold">
              SHORT-FORM PRODUCTION OS
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav
          className="nav-links hidden md:flex items-center gap-8 text-xs font-text font-medium tracking-apple-body"
          aria-label="Primary navigation"
          data-od-id="primary-nav"
        >
          <a
            href="#product"
            className="nav-link text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center relative after:absolute after:left-0 after:right-0 after:bottom-2 after:h-[2px] after:rounded-[2px] after:bg-[#0071e3] after:scale-x-0 after:origin-left after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Product
          </a>
          <a
            href="#how-it-works"
            className="nav-link text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center relative after:absolute after:left-0 after:right-0 after:bottom-2 after:h-[2px] after:rounded-[2px] after:bg-[#0071e3] after:scale-x-0 after:origin-left after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            How It Works
          </a>
          <a
            href="#architecture"
            className="nav-link text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center relative after:absolute after:left-0 after:right-0 after:bottom-2 after:h-[2px] after:rounded-[2px] after:bg-[#0071e3] after:scale-x-0 after:origin-left after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Architecture
          </a>
          <a
            href="#proof"
            className="nav-link text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center relative after:absolute after:left-0 after:right-0 after:bottom-2 after:h-[2px] after:rounded-[2px] after:bg-[#0071e3] after:scale-x-0 after:origin-left after:transition-transform after:duration-200 hover:after:scale-x-100"
          >
            Video Proof
          </a>
          <Link
            href="/pricing"
            className="nav-link text-[#6e6e73] hover:text-[#1d1d1f] transition-colors min-h-[44px] flex items-center relative after:absolute after:left-0 after:right-0 after:bottom-2 after:h-[2px] after:rounded-[2px] after:bg-[#0071e3] after:scale-x-0 after:origin-left after:transition-transform after:duration-200 hover:after:scale-x-100 font-semibold"
          >
            Pricing & Plans
          </Link>
        </nav>

        {/* CTAs with tactile Emil-style feedback */}
        <div className="nav-cta flex items-center gap-3">
          <Link
            href="/login"
            className="btn-signin px-3.5 py-1.5 rounded-lg text-xs font-text font-medium text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-[#f2f2f7] border border-transparent hover:border-[#e8e8ed] transition-[colors,border-color] duration-160 min-h-[44px] flex items-center active:scale-[0.98]"
            data-od-id="nav-signin"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="btn-nav-create px-4 py-1.5 rounded-lg bg-[#0071e3] hover:bg-[#0066cc] text-white font-text text-xs font-semibold tracking-wide transition-[transform,background-color] duration-160 ease-out shadow-xs flex items-center gap-1.5 min-h-[44px] active:scale-[0.97]"
            data-od-id="nav-start-creating"
          >
            <span>START CREATING</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
