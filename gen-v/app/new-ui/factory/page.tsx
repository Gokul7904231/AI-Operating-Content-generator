"use client";

import React, { useState } from "react";
import { TopNav } from "@/components/new-ui/TopNav";
import { Sidebar } from "@/components/new-ui/Sidebar";
import { Panel } from "@/components/new-ui/Panel";
import { Input, Select } from "@/components/new-ui/Input";
import { Button } from "@/components/new-ui/Button";
import { VideoViewport } from "@/components/new-ui/VideoViewport";
import { CommandPalette } from "@/components/new-ui/CommandPalette";
import { Sparkles, Layers, Sliders, Play, Plus, Trash2 } from "lucide-react";

export default function FactoryPipelinePage() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [prompt, setPrompt] = useState("Why traditional software is being replaced by AI operating systems");
  const [engine, setEngine] = useState("gemini-2.5-flash");
  const [ratio, setRatio] = useState("9:16");

  const [scenes, setScenes] = useState([
    { id: 1, text: "Traditional software is officially dying.", duration: "3s" },
    { id: 2, text: "Instead of complex dashboards, developers build AI agents.", duration: "4s" },
    { id: 3, text: "FactoryOS orchestrates the entire pipeline automatically.", duration: "5s" },
  ]);

  return (
    <div className="flex h-screen w-full bg-[#070708] text-zinc-100 overflow-hidden font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <TopNav title="Factory Pipeline Editor" onOpenCommand={() => setCmdOpen(true)} />

        <main className="flex-1 overflow-y-auto p-6 space-y-6 nle-scroll">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7 Columns: Script & Scene Timeline Builder */}
            <div className="lg:col-span-7 space-y-6">
              <Panel title="01 — Concept & Script Prompt">
                <div className="space-y-4">
                  <Input
                    label="Target Video Topic / URL Concept"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter topic..."
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Select label="LLM Hook Generator" value={engine} onChange={(e) => setEngine(e.target.value)}>
                      <option value="gemini-2.5-flash">Google Gemini 2.5 Flash</option>
                      <option value="openai-gpt4o">OpenAI GPT-4o</option>
                      <option value="groq-llama3">Groq Llama 3 70B</option>
                    </Select>

                    <Select label="Output Aspect Ratio" value={ratio} onChange={(e) => setRatio(e.target.value)}>
                      <option value="9:16">9:16 (Vertical Short)</option>
                      <option value="16:9">16:9 (Horizontal NLE)</option>
                    </Select>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="primary" size="md">
                      <Sparkles className="w-4 h-4" /> Synthesize Script & Scenes
                    </Button>
                  </div>
                </div>
              </Panel>

              <Panel
                title="02 — NLE Scene Timeline Track"
                action={
                  <Button variant="ghost" size="sm">
                    <Plus className="w-3.5 h-3.5" /> Add Scene
                  </Button>
                }
              >
                <div className="space-y-3">
                  {scenes.map((sc, idx) => (
                    <div
                      key={sc.id}
                      className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-[4px] flex items-center justify-between gap-3 group hover:border-zinc-700 transition-colors"
                    >
                      <span className="font-mono text-xs text-amber-500 font-semibold">
                        [SCENE 0{idx + 1}]
                      </span>
                      <p className="text-xs text-zinc-200 flex-1 truncate">{sc.text}</p>
                      <span className="font-mono text-xs text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded">
                        {sc.duration}
                      </span>
                      <button className="text-zinc-600 hover:text-red-400 p-1 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            {/* Right 5 Columns: NLE Viewport */}
            <div className="lg:col-span-5">
              <Panel title="03 — Live Viewport Render">
                <VideoViewport
                  title="Pipeline Scene Composite"
                  timecode="00:00:12:00"
                  codec="H.264 / 1080x1920"
                  fps={30}
                />
              </Panel>
            </div>
          </div>
        </main>
      </div>

      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  );
}
