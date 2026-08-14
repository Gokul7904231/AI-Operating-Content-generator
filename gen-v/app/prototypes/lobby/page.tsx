"use client";

import React from "react";
import FactoryChrome from "@/components/lobby/FactoryChrome";
import ProductionCommand from "@/components/lobby/ProductionCommand";
import FactoryFloorMap from "@/components/lobby/FactoryFloorMap";
import ActiveProductions from "@/components/lobby/ActiveProductions";
import FactoryHealthOverseer from "@/components/lobby/FactoryHealthOverseer";
import FactoryCommsStream from "@/components/lobby/FactoryCommsStream";
import FloorDrawer from "@/components/lobby/FloorDrawer";
import OverseerDrawer from "@/components/lobby/OverseerDrawer";
import AttentionDrawer from "@/components/lobby/AttentionDrawer";

export default function FactoryOSLobbyPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-amber-500/30">
      {/* Region A: Factory Chrome (Top Navbar) */}
      <FactoryChrome />

      {/* Main Control Tower Content Container */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-16">
        
        {/* Top Operational Status & Attention Banner */}
        <FactoryHealthOverseer />

        {/* Region B: Production Command (Hero Interaction) */}
        <ProductionCommand />

        {/* Region C: Live Factory Floor Map (Spatial Floors 01-07) */}
        <FactoryFloorMap />

        {/* Grid for Active Productions & Comms Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Region D: Active Productions (7 Cols on Large Screens) */}
          <div className="lg:col-span-7">
            <ActiveProductions />
          </div>

          {/* Region E: Comms Stream (5 Cols on Large Screens) */}
          <div className="lg:col-span-5">
            <FactoryCommsStream />
          </div>
        </div>

      </main>

      {/* Contextual Drawers & Inspection Modals */}
      <FloorDrawer />
      <OverseerDrawer />
      <AttentionDrawer />
    </div>
  );
}
