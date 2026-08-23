"use client";

import { useQuery } from "@tanstack/react-query";
import CreatorEmptyState from "@/components/creator/CreatorEmptyState";
import { useState } from "react";
import { FolderOpen, Search, Image as ImageIcon, Music, Film, FileText, Trash2, HardDrive, RefreshCw } from "lucide-react";

interface AssetFile {
  name: string;
  type: "image" | "audio" | "video" | "json" | "other";
  sizeKb: number;
  updatedAt: string;
  path: string;
}

export default function AssetsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<"all" | "image" | "audio" | "video">("all");

  const { data, isLoading, refetch } = useQuery<{ assets: AssetFile[] }>({
    queryKey: ["media-assets"],
    queryFn: async () => {
      const r = await fetch("/api/library/list");
      if (!r.ok) return { assets: [] };
      const res = await r.json();
      // Real assets only — no dummy data (P0-9 / no fake state)
      const items: any[] = res.assets ?? res.files ?? res.items ?? [];
      if (!Array.isArray(items) || items.length === 0) return { assets: [] };
      return {
        assets: items.map((it: any) => ({
          name: it.name ?? it.fileName ?? it.publicId ?? "asset",
          type: (it.type ?? (String(it.mimeType ?? "").startsWith("video/") ? "video" : String(it.mimeType ?? "").startsWith("image/") ? "image" : String(it.mimeType ?? "").startsWith("audio/") ? "audio" : "other")) as AssetFile["type"],
          sizeKb: Math.round(((it.sizeBytes ?? it.bytes ?? (it.sizeKb != null ? it.sizeKb * 1024 : undefined) ?? 0) as number) / 1024),
          updatedAt: it.updatedAt ?? it.createdAt ?? new Date().toISOString(),
          path: it.path ?? it.publicId ?? it.fileName ?? "",
        })),
      };
    }
  });

  const assets = data?.assets ?? [];
  const totalSize = assets.reduce((sum, a) => sum + a.sizeKb, 0);

  const filtered = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === "all" || a.type === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case "image": return <ImageIcon className="w-4 h-4 text-pink-400" />;
      case "audio": return <Music className="w-4 h-4 text-cyan-400" />;
      case "video": return <Film className="w-4 h-4 text-rose-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Media Assets</h1>
          <p className="text-sm text-zinc-500 mt-1">Explore generated images, voiceover audio tracks, and temporary render cache</p>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800 text-zinc-300 text-xs hover:bg-zinc-700 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-zinc-500" />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Total Cached Size</div>
            <div className="text-lg font-bold text-zinc-200 mt-0.5">{(totalSize / 1024).toFixed(2)} MB</div>
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4 flex items-center gap-3">
          <FolderOpen className="w-5 h-5 text-zinc-500" />
          <div>
            <div className="text-xs text-zinc-500 uppercase tracking-widest">Total Asset Count</div>
            <div className="text-lg font-bold text-zinc-200 mt-0.5">{assets.length} items</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
          <input
            type="text"
            placeholder="Filter files by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900/60 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
          />
        </div>
        <div className="flex gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-850">
          {(["all", "image", "audio", "video"] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${activeCategory === cat ? "bg-zinc-850 text-emerald-400" : "text-zinc-400 hover:text-zinc-200"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <CreatorEmptyState
          title="No assets yet"
          description="No generated assets were found. Create a video — images, audio and cache will appear here."
          primaryAction={{ label: "Create Video" }}
          secondaryAction={{ label: "Go to Library", href: "/media/library" }}
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-600">
                  <th className="text-left px-5 py-3 font-medium">Name</th>
                  <th className="text-left px-5 py-3 font-medium">Type</th>
                  <th className="text-left px-5 py-3 font-medium">Size</th>
                  <th className="text-left px-5 py-3 font-medium">Path</th>
                  <th className="text-left px-5 py-3 font-medium">Last Modified</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => (
                  <tr key={asset.name} className="border-b border-zinc-800/50 hover:bg-zinc-900/40">
                    <td className="px-5 py-3 flex items-center gap-2">
                      {getIcon(asset.type)}
                      <span className="font-medium text-zinc-300 truncate max-w-[200px]" title={asset.name}>
                        {asset.name}
                      </span>
                    </td>
                    <td className="px-5 py-3 capitalize text-zinc-500">{asset.type}</td>
                    <td className="px-5 py-3 font-mono">
                      {asset.sizeKb > 1024 ? `${(asset.sizeKb / 1024).toFixed(2)} MB` : `${asset.sizeKb.toFixed(0)} KB`}
                    </td>
                    <td className="px-5 py-3 font-mono text-zinc-600 truncate max-w-[250px]" title={asset.path}>
                      {asset.path}
                    </td>
                    <td className="px-5 py-3 text-zinc-500 font-mono">
                      {new Date(asset.updatedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button className="p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors" title="Delete Asset">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
