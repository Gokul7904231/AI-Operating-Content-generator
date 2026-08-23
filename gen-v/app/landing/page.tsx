"use client";

import React, { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ScrollProductionPipeline from "@/components/landing/ScrollProductionPipeline";
import SignatureSection from "@/components/landing/SignatureSection";
import FactoryDepthSection from "@/components/landing/FactoryDepthSection";
import FloorsNarrative from "@/components/landing/FloorsNarrative";
import VideoProofSection from "@/components/landing/VideoProofSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";

export default function PublicLandingPage() {
  // Emil Kowalski scroll-reveal observer
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const targets = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    targets.forEach((el) => {
      el.classList.add("reveal");
      observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f] font-text selection:bg-[#0071e3]/20 overflow-x-hidden">
      {/* 1. Navbar */}
      <Navbar />

      <main id="main">
        {/* 2. Hero Section (Living Ambient Background + Real 9:16 Video Showcase) */}
        <div id="product">
          <HeroSection />
        </div>

        {/* 3. Scroll Story: The Production Pipeline */}
        <ScrollProductionPipeline />

        {/* 4. Signature Section: "YOU DON'T OPERATE THE FACTORY" */}
        <SignatureSection />

        {/* 5. Operational Architecture: Implemented vs Evolving Roadmap */}
        <FactoryDepthSection />

        {/* 6. Production Pipeline Floors Narrative (Floors 01 - 07) */}
        <FloorsNarrative />

        {/* 7. Real Video Proof */}
        <VideoProofSection />

        {/* 8. Final High-Impact CTA */}
        <FinalCTA />
      </main>

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}
