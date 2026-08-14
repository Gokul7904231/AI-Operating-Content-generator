"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { Input, Select } from "@/components/new-ui/Input";
import { Button } from "@/components/new-ui/Button";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Cpu, CheckCircle2, Server, Save } from "lucide-react";

export default function EnginesPage() {
  const [cmdOpen, setCmdOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="AI Engines & Provider Configuration" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll max-w-5xl">
          <Panel title="LLM Hook Generator Provider">
            <div className="space-y-4">
              <Select label="Active LLM Engine">
                <option value="gemini">Google Gemini 2.5 Flash (Recommended)</option>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="groq">Groq Llama 3 70B</option>
              </Select>
              <Input label="Google GenAI API Key" type="password" value="••••••••••••••••••••••••" readOnly />
            </div>
          </Panel>

          <Panel title="Voice Synthesis Engine">
            <div className="space-y-4">
              <Select label="Active TTS Engine">
                <option value="edge-tts">@travisvn/edge-tts (Local Edge Engine)</option>
                <option value="elevenlabs">ElevenLabs Neural Voice</option>
              </Select>
              <Input label="Default Voice Model" value="en-US-ChristopherNeural" />
            </div>
          </Panel>

          <Panel title="FFmpeg Hardware Renderer Configuration">
            <div className="space-y-4">
              <Select label="Encoder Profile">
                <option value="h264_nvenc">NVIDIA NVENC H.264 (Hardware Accelerated)</option>
                <option value="libx264">CPU Software x264</option>
              </Select>
              <Input label="Worker Heartbeat Interval" value="5000ms" mono />
            </div>
          </Panel>

          <div className="flex justify-end">
            <Button variant="primary" size="md">
              <Save className="w-4 h-4" /> Save Engine Configuration
            </Button>
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
