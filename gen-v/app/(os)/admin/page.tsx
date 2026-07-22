"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Terminal as ConsoleIcon, 
  Settings, 
  Play, 
  Activity, 
  Send, 
  HelpCircle,
  Network,
  LayoutTemplate,
  ToggleLeft,
  ToggleRight,
  ShieldCheck,
  ChevronDown
} from "lucide-react";
import { EventBus } from "@/ai/event-bus";

interface Blueprint {
  niche: string;
  systemPrompt: string;
}

export default function AdminPage() {
  const [commandInput, setCommandInput] = useState("");
  const [factoryActive, setFactoryActive] = useState(true);
  const [logs, setLogs] = useState<Array<{ time: string; type: string; msg: string }>>([
    { time: "16:20:01", type: "INFO", msg: "ShortFactory OS control panel initialized." },
    { time: "16:20:05", type: "SUCCESS", msg: "Telemetry logger online. Listening on EventBus..." }
  ]);

  // System blueprint states
  const [niche, setNiche] = useState("Geography & Travel");
  const [systemPrompt, setSystemPrompt] = useState(
    "You are an expert short-form video scriptwriter specializing in geographical facts and regional banter. Keep hook engagement score >= 8.0."
  );

  // Command Execution Mutation
  const executeCommand = useMutation({
    mutationFn: async (command: string) => {
      // Simulate command processing or forward to backend AI prompt router
      const timestamp = new Date().toTimeString().split(" ")[0];
      setLogs((prev) => [...prev, { time: timestamp, type: "EXEC", msg: `Command received: "${command}"` }]);
      
      await new Promise((resolve) => setTimeout(resolve, 800));

      let response = "Command compiled successfully.";
      if (command.toLowerCase().includes("local")) {
        response = "System state updated: Switched routing profiles to Local Mode.";
      } else if (command.toLowerCase().includes("generate")) {
        response = "Triggered batch generation pipeline. Job ID: job_autogen_182a";
      } else if (command.toLowerCase().includes("benchmark")) {
        response = "Launching model suite benchmark. Target: Llama-3 / Claude-3.5.";
      }

      return { timestamp, msg: response };
    },
    onSuccess: (data) => {
      setLogs((prev) => [...prev, { time: data.timestamp, type: "SUCCESS", msg: data.msg }]);
      setCommandInput("");
    }
  });

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    executeCommand.mutate(commandInput);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-900 pb-4">
        <h2 className="text-sm font-bold text-zinc-50 tracking-tight">OS Command Center</h2>
        <p className="text-xs text-zinc-500 mt-1">Direct terminal control, system prompt blueprints, and live event loops.</p>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Command & Configuration Forms */}
        <div className="xl:col-span-7 space-y-6">
          {/* Natural Language Prompt Command Bar */}
          <div className="bg-zinc-900 border border-zinc-900 rounded-xl p-6 space-y-4">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
              <ConsoleIcon className="w-4 h-4 text-emerald-400" />
              AI Command Prompt
            </h3>
            
            <form onSubmit={handleSendCommand} className="flex gap-2">
              <input
                type="text"
                placeholder='Ask OS to execute tasks: "Switch to Local Mode", "Generate 20 history videos", "Benchmark Claude"...'
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                className="flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-150 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={executeCommand.isPending}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 rounded-lg text-xs font-bold flex items-center gap-1.5 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                Run
              </button>
            </form>
          </div>

          {/* Prompt Blueprints Form */}
          <div className="bg-zinc-900 border border-zinc-900 rounded-xl p-6 space-y-5">
            <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-850 pb-4">
              <LayoutTemplate className="w-4 h-4 text-indigo-400" />
              Niche Prompt Blueprints
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Niche Category</label>
                <select
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Technology & Coding">Technology & Coding</option>
                  <option value="History & Lore">History & Lore</option>
                  <option value="Geography & Travel">Geography & Travel</option>
                  <option value="Finance & Crypto">Finance & Crypto</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">System Instructions</label>
              <textarea
                rows={4}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-150 focus:border-emerald-500 focus:outline-none resize-none font-mono"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] text-zinc-500">Draft saved locally</span>
              <button 
                onClick={() => {
                  const timestamp = new Date().toTimeString().split(" ")[0];
                  setLogs((prev) => [...prev, { time: timestamp, type: "INFO", msg: `Saved prompt blueprint: ${niche}` }]);
                }}
                className="px-3.5 py-2 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 rounded-lg text-xs font-bold text-zinc-200"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Pipeline Controller */}
          <div className="bg-zinc-900 border border-zinc-900 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Automated Generation Worker</h4>
              <p className="text-[10px] text-zinc-500 mt-1">If enabled, queue workers run background task scheduling loops.</p>
            </div>

            <button
              onClick={() => {
                setFactoryActive(!factoryActive);
                const timestamp = new Date().toTimeString().split(" ")[0];
                setLogs((prev) => [...prev, { time: timestamp, type: "INFO", msg: `Cron worker status set to: ${!factoryActive ? "ACTIVE" : "PAUSED"}` }]);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${
                factoryActive 
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                  : "bg-zinc-950 text-zinc-500 border-zinc-850"
              }`}
            >
              {factoryActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              <span>{factoryActive ? "Worker Active" : "Worker Paused"}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Console Telemetry Logger */}
        <div className="xl:col-span-5 flex flex-col h-[550px] bg-zinc-900 border border-zinc-900 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-850 bg-zinc-900/50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <ConsoleIcon className="w-4 h-4 text-zinc-400" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">EventBus Live Feed</span>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-zinc-950 font-mono text-[10px] leading-relaxed text-zinc-400 space-y-2 terminal-scroll">
            {logs.map((log, index) => (
              <div key={index} className="flex gap-2 items-start">
                <span className="text-zinc-650 shrink-0 select-none">[{log.time}]</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase shrink-0 ${
                  log.type === "SUCCESS" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  log.type === "EXEC" ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                  "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}>
                  {log.type}
                </span>
                <span>{log.msg}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
