"use client";

import React from "react";
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
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-amber-500/30 overflow-x-hidden">
      {/* 1. Navbar */}
      <Navbar />

      {/* 2. Hero Section (Includes Living Ambient Background + Real 9:16 Video Showcase) */}
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

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}
