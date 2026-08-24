"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Network, X } from "lucide-react";

interface NewProviderFormProps {
  onDismiss?: () => void;
  isModal?: boolean;
}

export default function NewProviderForm({ onDismiss, isModal = false }: NewProviderFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Form fields
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [modelEndpoint, setModelEndpoint] = useState("/chat/completions");
  const [headersJson, setHeadersJson] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const addMutation = useMutation({
    mutationFn: async (newProvider: any) => {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProvider),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to register provider");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-providers-dynamic"] });
      handleClose();
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  const handleClose = () => {
    if (onDismiss) {
      onDismiss();
    } else if (isModal) {
      router.back();
    } else {
      router.push("/ai/providers");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!id.trim() || !name.trim() || !baseUrl.trim()) {
      setErrorMsg("Unique ID, Display Name, and Base URL are required fields.");
      return;
    }

    let parsedHeaders = {};
    if (headersJson.trim()) {
      try {
        parsedHeaders = JSON.parse(headersJson);
      } catch {
        setErrorMsg("Optional Headers must be valid JSON.");
        return;
      }
    }

    addMutation.mutate({
      id: id.trim().toLowerCase().replace(/\s+/g, "-"),
      name: name.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      modelEndpoint: modelEndpoint.trim(),
      optionalHeaders: parsedHeaders,
    });
  };

  const formContent = (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-850 bg-zinc-950/40">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Register Custom AI Provider</h3>
        </div>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 rounded hover:bg-zinc-850 text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 flex-1 overflow-y-auto max-h-[70vh] text-xs">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400">
            {errorMsg}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Unique ID</label>
            <input
              type="text"
              required
              placeholder="e.g. together-ai"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 focus:outline-none focus:border-zinc-700"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Display Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Together AI"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-355 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Base URL</label>
          <input
            type="url"
            required
            placeholder="e.g. https://api.together.xyz/v1"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-355 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Model Endpoint</label>
          <input
            type="text"
            required
            placeholder="/chat/completions"
            value={modelEndpoint}
            onChange={(e) => setModelEndpoint(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-355 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">API Key / Token</label>
          <input
            type="password"
            placeholder="Paste bearer token..."
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-355 focus:outline-none focus:border-zinc-700"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Optional Headers (JSON format)</label>
          <textarea
            placeholder='e.g. { "X-Title": "ShortFactory" }'
            rows={2}
            value={headersJson}
            onChange={(e) => setHeadersJson(e.target.value)}
            className="px-3 py-2 rounded-lg border border-zinc-800 bg-zinc-950 text-zinc-350 font-mono focus:outline-none focus:border-zinc-700 resize-none"
          />
        </div>

        <div className="pt-4 border-t border-zinc-850 flex items-center justify-end gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-lg border border-zinc-800 hover:bg-zinc-800 text-zinc-400 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={addMutation.isPending}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-zinc-950 transition-colors disabled:opacity-50"
          >
            {addMutation.isPending ? "Registering..." : "Save Provider"}
          </button>
        </div>
      </form>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          onClick={handleClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in cursor-pointer" 
        />
        <div className="relative z-10 w-full max-w-md animate-modal-scale-in">
          {formContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {formContent}
    </div>
  );
}
