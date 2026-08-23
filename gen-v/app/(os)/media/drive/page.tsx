"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import CreatorEmptyState from "@/components/creator/CreatorEmptyState";
import {
  Cloud,
  HardDrive,
  Search,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  Copy,
  Play,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
  FolderOpen,
  ChevronRight,
  Filter,
  SortDesc,
  Wifi,
  WifiOff,
  Activity,
  Database,
  Zap,
  Video,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DriveFile {
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  url?: string;
  viewLink?: string;
  downloadLink?: string;
  folderId?: string;
  folderName?: string;
  provider: string;
}

interface DriveStatus {
  health: {
    state: string;
    reachable: boolean;
    credentialsOk: boolean;
    folderExists: boolean;
    uploadPermission: boolean;
    latencyMs: number;
    usedBytes: number;
    quotaBytes: number;
    error?: string;
  };
  stats: {
    totalUploaded: number;
    pendingCleanup: number;
    storageUsedGB: string | null;
    storageQuotaGB: string | null;
  };
  telemetry: any[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (!bytes) return "—";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "< 1 hour ago";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "emerald",
}: {
  icon: React.ComponentType<any>;
  label: string;
  value: string | number;
  sub?: string;
  color?: "emerald" | "sky" | "amber" | "rose";
}) {
  const colors = {
    emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    sky:     "text-sky-400 bg-sky-400/10 border-sky-400/20",
    amber:   "text-amber-400 bg-amber-400/10 border-amber-400/20",
    rose:    "text-rose-400 bg-rose-400/10 border-rose-400/20",
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{label}</div>
        <div className="text-lg font-bold text-zinc-100 leading-none mt-0.5">{value}</div>
        {sub && <div className="text-[10px] text-zinc-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function HealthBadge({ state }: { state?: string }) {
  if (!state) return null;
  const map: Record<string, { label: string; cls: string; icon: React.ComponentType<any> }> = {
    ONLINE:     { label: "Online", cls: "text-emerald-400 bg-emerald-400/10", icon: Wifi },
    OFFLINE:    { label: "Offline", cls: "text-rose-400 bg-rose-400/10", icon: WifiOff },
    AUTH_FAILED:{ label: "Auth Failed", cls: "text-amber-400 bg-amber-400/10", icon: AlertCircle },
    DEGRADED:   { label: "Degraded", cls: "text-amber-400 bg-amber-400/10", icon: AlertCircle },
    INITIALIZING:{ label: "Starting", cls: "text-sky-400 bg-sky-400/10", icon: Zap },
  };
  const cfg = map[state] ?? { label: state, cls: "text-zinc-400 bg-zinc-800", icon: Activity };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${cfg.cls}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function VideoCard({
  file,
  onDelete,
  onCopy,
}: {
  file: DriveFile;
  onDelete: (file: DriveFile) => void;
  onCopy: (url: string) => void;
}) {
  const isVideo = file.mimeType.startsWith("video/");

  return (
    <div className="group bg-zinc-900/60 border border-zinc-800/50 rounded-xl overflow-hidden hover:border-zinc-700 transition-all duration-300">
      {/* Thumbnail / Preview area */}
      <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
        {isVideo ? (
          <>
            <Video className="w-10 h-10 text-zinc-700" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent" />
            <div className="absolute bottom-2 left-2">
              <span className="text-[9px] font-bold text-zinc-400 bg-black/60 px-1.5 py-0.5 rounded">
                MP4
              </span>
            </div>
          </>
        ) : (
          <FolderOpen className="w-8 h-8 text-zinc-700" />
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          {file.viewLink && (
            <a
              href={file.viewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-9 h-9 rounded-full bg-white/10 backdrop-blur hover:bg-white/20 flex items-center justify-center transition-colors"
              title="Open in Drive"
            >
              <Play className="w-4 h-4 text-white fill-white" />
            </a>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 space-y-2">
        <div>
          <h4 className="text-xs font-semibold text-zinc-200 truncate leading-snug" title={file.fileName}>
            {file.fileName}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-500 font-mono">
            <span>{fmtBytes(file.sizeBytes)}</span>
            <span>·</span>
            <span>{timeAgo(file.createdAt)}</span>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-1.5 pt-1">
          {/* Download */}
          <a
            href={file.downloadLink ?? file.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-semibold text-zinc-300 transition-colors"
            title="Download"
          >
            <Download className="w-3 h-3" />
            Download
          </a>

          {/* Open in Drive */}
          {file.viewLink && (
            <a
              href={file.viewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-sky-400 transition-colors"
              title="Open in Drive"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Copy link */}
          <button
            onClick={() => onCopy(file.viewLink ?? file.url ?? "")}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-emerald-400 transition-colors"
            title="Copy link"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => onDelete(file)}
            className="w-7 h-7 flex items-center justify-center bg-zinc-800 hover:bg-rose-500/20 rounded-lg text-zinc-500 hover:text-rose-400 transition-colors"
            title="Move to trash"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────

function DeleteModal({
  file,
  onConfirm,
  onCancel,
  deleting,
}: {
  file: DriveFile;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Move to Trash?</h3>
            <p className="text-xs text-zinc-400 mt-1">
              This will move <span className="text-zinc-200 font-medium">"{file.fileName}"</span> to the Drive trash. It can be restored within 30 days.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold text-rose-400 transition-colors disabled:opacity-50"
          >
            {deleting ? "Trashing…" : "Move to Trash"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function DriveMediaPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "size" | "name">("date");
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimer = useRef<NodeJS.Timeout | null>(null);

  // ── Fetch drive status ───────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch("/api/drive/status");
      if (res.ok) setStatus(await res.json());
    } catch {
      // non-fatal
    } finally {
      setStatusLoading(false);
    }
  }, []);

  // ── Fetch files ──────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: "100",
        mimeType: "video/",
        ...(q ? { query: q } : {}),
      });
      const res = await fetch(`/api/drive/list?${params}`);
      if (!res.ok) throw new Error(`Failed to load Drive files: ${res.status}`);
      const data = await res.json();
      setFiles(data.files ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchFiles();
  }, [fetchStatus, fetchFiles]);

  // ── Debounced search ─────────────────────────────────────────────────────
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchFiles(v || undefined), 500);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/drive/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: deleteTarget.fileId }),
      });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.fileId !== deleteTarget.fileId));
      setDeleteTarget(null);
      fetchStatus();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  // ── Copy link ─────────────────────────────────────────────────────────────
  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sorted = [...files].sort((a, b) => {
    if (sortBy === "date") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "size") return b.sizeBytes - a.sizeBytes;
    return a.fileName.localeCompare(b.fileName);
  });

  const health = status?.health;
  const stats = status?.stats;

  return (
    <div className="space-y-6 pb-12">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-900">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Cloud className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-50 tracking-tight">Google Drive</h1>
            <p className="text-[10px] text-zinc-500 mt-0.5">Storage Provider · Service Account</p>
          </div>
          {health && <HealthBadge state={health.state} />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchFiles(search || undefined); fetchStatus(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-emerald-400 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <a
            href="/api/drive/cleanup"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 hover:text-rose-400 transition-colors"
            title="Trigger cleanup manually"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Run Cleanup
          </a>
        </div>
      </div>

      {/* ── Stats Grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Database}
          label="Storage Used"
          value={stats?.storageUsedGB ? `${stats.storageUsedGB} GB` : (statusLoading ? "…" : "—")}
          sub={stats?.storageQuotaGB ? `of ${stats.storageQuotaGB} GB` : undefined}
          color="sky"
        />
        <StatCard
          icon={Cloud}
          label="Total Uploaded"
          value={stats?.totalUploaded ?? (statusLoading ? "…" : 0)}
          sub="videos on Drive"
          color="emerald"
        />
        <StatCard
          icon={Clock}
          label="Pending Cleanup"
          value={stats?.pendingCleanup ?? (statusLoading ? "…" : 0)}
          sub="files expire soon"
          color={stats?.pendingCleanup ? "amber" : "emerald"}
        />
        <StatCard
          icon={Activity}
          label="Latency"
          value={health?.latencyMs ? `${health.latencyMs}ms` : (statusLoading ? "…" : "—")}
          sub="last health check"
          color={health?.latencyMs && health.latencyMs > 2000 ? "amber" : "emerald"}
        />
      </div>

      {/* ── Health Detail Bar ──────────────────────────────────────────────── */}
      {health && (
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-3 flex flex-wrap gap-4 text-[10px] font-semibold">
          <Check label="Reachable" ok={health.reachable} />
          <Check label="Credentials OK" ok={health.credentialsOk} />
          <Check label="Folder Exists" ok={health.folderExists} />
          <Check label="Upload Permission" ok={health.uploadPermission} />
          {health.error && (
            <span className="text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> {health.error}
            </span>
          )}
        </div>
      )}

      {/* ── Search + Sort bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            id="drive-search"
            type="text"
            placeholder="Search files on Drive…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-zinc-800 bg-zinc-900/60 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-900/50 border border-zinc-800 rounded-lg flex-shrink-0">
          {(["date", "size", "name"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sortBy === s ? "bg-zinc-950 text-emerald-400" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <div>
            <span className="font-bold">Error: </span>{error}
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Copied toast ──────────────────────────────────────────────────── */}
      {copied && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-zinc-950 text-xs font-bold rounded-xl shadow-lg animate-in slide-in-from-bottom-2">
          <CheckCircle className="w-4 h-4" /> Link copied!
        </div>
      )}

      {/* ── File Grid ────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Files · {sorted.length} results
          </h2>
          <span className="text-[10px] text-zinc-600 font-mono">
            Root: {process.env.NEXT_PUBLIC_DRIVE_FOLDER_LABEL ?? "ShortFactory Drive"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl animate-pulse h-52" />
            ))
          ) : sorted.length === 0 ? (
            <CreatorEmptyState
              title={search ? "No matching files" : "No Drive files yet"}
              description={search ? "Try a different search term." : "Your delivered videos will appear here once Drive sync completes. Create a video to get started."}
              primaryAction={{ label: "Create Video" }}
              secondaryAction={{ label: "Go to Library", href: "/media/library" }}
            />
          ) : (
            sorted.map((file) => (
              <VideoCard
                key={file.fileId}
                file={file}
                onDelete={setDeleteTarget}
                onCopy={handleCopy}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Telemetry section ─────────────────────────────────────────────── */}
      {status?.telemetry && status.telemetry.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
            Recent Telemetry
          </h2>
          <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl overflow-hidden">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-left">
                  <th className="px-4 py-2">Operation</th>
                  <th className="px-4 py-2">Duration</th>
                  <th className="px-4 py-2">Size</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {status.telemetry.slice(0, 10).map((t: any, i: number) => (
                  <tr key={i} className="border-b border-zinc-900 hover:bg-zinc-800/30">
                    <td className="px-4 py-2 text-sky-400">{t.operation}</td>
                    <td className="px-4 py-2 text-zinc-300">{t.durationMs}ms</td>
                    <td className="px-4 py-2 text-zinc-400">{t.sizeBytes ? fmtBytes(t.sizeBytes) : "—"}</td>
                    <td className="px-4 py-2">
                      {t.success ? (
                        <span className="text-emerald-400">✓ OK</span>
                      ) : (
                        <span className="text-rose-400">✗ Failed</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-zinc-600">{fmtDate(t.recordedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      {deleteTarget && (
        <DeleteModal
          file={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: health check item
// ─────────────────────────────────────────────────────────────────────────────

function Check({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`flex items-center gap-1 ${ok ? "text-emerald-400" : "text-rose-400"}`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}
