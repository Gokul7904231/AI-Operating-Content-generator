"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { Input } from "@/components/new-ui/Input";
import { Button } from "@/components/new-ui/Button";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Settings, Key, Shield, Save } from "lucide-react";

export default function SettingsPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="System & Integration Settings" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll max-w-5xl">
          <Panel title="Internal Secret & Authentication Keys">
            <div className="space-y-4">
              <Input label="INTERNAL_API_SECRET_KEY" type="password" value="••••••••••••••••••••••••" readOnly mono />
              <Input label="Firebase Admin Credentials" value="ai-shorts-factory-7aa50-firebase-adminsdk.json" readOnly mono />
            </div>
          </Panel>

          <Panel title="Cloudinary Storage & CDN Config">
            <div className="space-y-4">
              <Input label="Cloudinary Cloud Name" value="dhy3b1n" readOnly />
              <Input label="Media Folder Path" value="factoryos/shorts-renders" />
            </div>
          </Panel>

          <div className="flex justify-end">
            <Button variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Settings
            </Button>
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
