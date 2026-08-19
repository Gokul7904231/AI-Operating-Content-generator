"use client";

import React, { useState, useEffect } from "react";
import { 
  Network, ShieldAlert, Sparkles, Sliders, CheckCircle2, 
  AlertTriangle, RefreshCw, Plus, ArrowUp, ArrowDown, Trash2, 
  Search, Lock, Server, Cpu, Terminal, Check, X, Globe, Laptop, 
  Bot, Mic, Volume2, ShieldCheck
} from "lucide-react";
import { ApiProviderConfig, ApiCredential, ApiConfigSummary, ProviderCategory } from "@/lib/api-config/api-config-store";

export default function ApiConfigurationControlCenterPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("VIEWER");
  const [summary, setSummary] = useState<ApiConfigSummary | null>(null);
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Connection Test & Discovery State
  const [testResults, setTestResults] = useState<Record<string, { testing: boolean; success?: boolean; error?: string; latencyMs?: number }>>({});
  const [discoveredModels, setDiscoveredModels] = useState<Record<string, string[]>>({});
  const [discovering, setDiscovering] = useState<Record<string, boolean>>({});

  // Local Connection Modal State
  const [showConnectLocalModal, setShowConnectLocalModal] = useState(false);
  const [localForm, setLocalForm] = useState({
    name: "Ollama (Local AI)",
    localProviderType: "ollama" as any,
    endpoint: "http://localhost:11434",
    model: "qwen3-coder",
    allowCloudFallback: false,
  });

  const [showAddFallbackModal, setShowAddFallbackModal] = useState<string | null>(null);
  const [fallbackForm, setFallbackForm] = useState({ name: "", apiKey: "", endpoint: "", mode: "cloud" as any, localProviderType: "ollama" as any, model: "" });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ providerId: string; fallbackId: string; name: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/api");
      const data = await res.json();
      if (data.success) {
        setIsAdmin(data.isAdmin);
        setUserRole(data.userRole);
        setSummary(data.summary);
        setProviders(data.providers);
      }
    } catch (err) {
      console.error("Failed to fetch API provider configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  // Discover Models for Local Provider
  const handleDiscoverModels = async (providerId: string, endpoint: string, localProviderType: string) => {
    setDiscovering(prev => ({ ...prev, [providerId]: true }));
    try {
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discover_models",
          payload: { endpoint, localProviderType },
        }),
      });
      const data = await res.json();
      if (data.success && data.models) {
        const modelNames = data.models.map((m: any) => m.name || m.id);
        setDiscoveredModels(prev => ({ ...prev, [providerId]: modelNames }));
      }
    } catch {
      console.log("Model discovery failed for endpoint:", endpoint);
    } finally {
      setDiscovering(prev => ({ ...prev, [providerId]: false }));
    }
  };

  // Connection Test Handler
  const handleTestConnection = async (providerId: string, credentialId: string, apiKey?: string, endpoint?: string, mode?: string, localProviderType?: string) => {
    setTestResults(prev => ({ ...prev, [credentialId]: { testing: true } }));
    try {
      const res = await fetch("/api/settings/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, apiKey, baseUrl: endpoint, mode, localType: localProviderType }),
      });
      const data = await res.json();
      setTestResults(prev => ({
        ...prev,
        [credentialId]: { testing: false, success: data.success, error: data.error, latencyMs: data.latencyMs },
      }));
    } catch {
      setTestResults(prev => ({
        ...prev,
        [credentialId]: { testing: false, success: false, error: "Network error during test." },
      }));
    }
  };

  // Primary API Update Handler
  const handleUpdatePrimary = async (providerId: string, data: { apiKey?: string; endpoint?: string; model?: string; localProviderType?: any }) => {
    try {
      setSaveStatus("Saving primary configuration...");
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_primary",
          providerId,
          payload: data,
        }),
      });
      const resData = await res.json();
      if (!resData.success) throw new Error(resData.error);
      setSaveStatus("Primary API saved successfully!");
      setTimeout(() => setSaveStatus(null), 2500);
      fetchProviders();
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
      setSaveStatus(null);
    }
  };

  // Toggle Cloud Fallback Policy
  const handleToggleCloudFallback = async (providerId: string, allowCloudFallback: boolean) => {
    if (allowCloudFallback) {
      const confirmAction = confirm("CONFIRMATION: Enabling cloud fallback means if local inference fails, FactoryOS will switch to paid cloud API providers. Continue?");
      if (!confirmAction) return;
    }

    try {
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_cloud_fallback",
          providerId,
          payload: { allowCloudFallback },
        }),
      });
      const data = await res.json();
      if (data.success) fetchProviders();
    } catch (err: any) {
      alert(`Policy update failed: ${err.message}`);
    }
  };

  // Filtered Providers
  const filteredProviders = providers.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedCategory === "all") return matchesSearch;
    if (selectedCategory === "local_ai") return matchesSearch && p.mode === "local";
    return matchesSearch && p.category === selectedCategory;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24 select-none font-text text-[#1d1d1f] dark:text-zinc-100">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e8ed] dark:border-zinc-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-[#0071e3]/10 text-[#0071e3] dark:text-[#3894ff] font-semibold text-xs rounded-full border border-[#0071e3]/20 flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5" /> API & Local AI Control Center
            </span>
            {!isAdmin && (
              <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 font-semibold text-[10px] rounded-md border border-amber-500/20 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Admin Config Only
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-apple-headline font-display mt-2">
            API & Local AI Configuration
          </h1>
          <p className="text-xs sm:text-sm text-[#6e6e73] dark:text-zinc-400 mt-1">
            Manage primary providers, Ollama / LM Studio local runtimes, model discovery, credentials, and service health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowConnectLocalModal(true)}
              className="px-4 py-2.5 rounded-xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5" /> + Connect Local Model
            </button>
          )}
          <button 
            onClick={fetchProviders}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-[#e8e8ed] dark:border-zinc-700 text-[#1d1d1f] dark:text-zinc-100 font-semibold text-xs flex items-center gap-2 hover:bg-[#f2f2f7] dark:hover:bg-zinc-700 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh Status
          </button>
        </div>
      </div>

      {/* RBAC Read-Only Alert Banner for Non-Admins */}
      {!isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-700 dark:text-amber-300">
          <ShieldAlert className="w-5 h-5 flex-shrink-0" />
          <span>
            Global API provider configurations can only be created, edited, or reordered by system <strong>Administrators (OWNER / ADMIN)</strong>. You are currently viewing service health metrics.
          </span>
        </div>
      )}

      {/* 1. 📊 Top System Status Summary Banner */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Total Discovered</span>
            <span className="text-3xl font-black font-display block mt-1">{summary.totalProviders}</span>
            <span className="text-[11px] text-[#86868b] mt-0.5 block">Cataloged Services</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Connected</span>
            <span className="text-3xl font-black font-display text-emerald-600 dark:text-emerald-400 block mt-1">{summary.connectedCount}</span>
            <span className="text-[11px] text-[#86868b] mt-0.5 block">Primary Active</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Degraded</span>
            <span className="text-3xl font-black font-display text-amber-600 dark:text-amber-400 block mt-1">{summary.degradedCount}</span>
            <span className="text-[11px] text-[#86868b] mt-0.5 block">Fallback Active</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
            <span className="text-[10px] font-bold text-[#86868b] uppercase tracking-wider block">Not Configured</span>
            <span className="text-3xl font-black font-display text-[#86868b] block mt-1">{summary.notConfiguredCount}</span>
            <span className="text-[11px] text-[#86868b] mt-0.5 block">Missing Keys</span>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-2xl p-5 shadow-xs col-span-2 lg:col-span-1">
            <span className="text-[10px] font-bold text-[#0071e3] dark:text-[#3894ff] uppercase tracking-wider block">Local AI Runtimes</span>
            <span className="text-3xl font-black font-display text-[#0071e3] dark:text-[#3894ff] block mt-1">{summary.localCount}</span>
            <span className="text-[11px] text-[#86868b] mt-0.5 block">Ollama / LM Studio</span>
          </div>
        </div>
      )}

      {/* 2. 🔍 Search & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-[#e8e8ed] dark:border-zinc-800 pb-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search providers & runtimes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white dark:bg-zinc-900 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-xs outline-none focus:border-[#0071e3] text-[#1d1d1f] dark:text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: "All" },
            { id: "llm", label: "AI / LLM" },
            { id: "local_ai", label: "Local AI" },
            { id: "image", label: "Image" },
            { id: "voice", label: "Voice" },
            { id: "storage", label: "Storage" },
            { id: "rendering", label: "Rendering" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedCategory(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === tab.id
                  ? "bg-[#1d1d1f] dark:bg-zinc-100 text-white dark:text-zinc-900"
                  : "bg-[#f2f2f7] dark:bg-zinc-800 text-[#6e6e73] dark:text-zinc-400 hover:text-[#1d1d1f] dark:hover:text-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. 🃏 Provider Cards Grid */}
      <div className="space-y-6">
        {filteredProviders.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-3xl p-12 text-center text-xs text-[#86868b]">
            No providers found matching your filter criteria.
          </div>
        ) : (
          filteredProviders.map((provider) => {
            const isLocal = provider.mode === "local";
            const primary = provider.primary;
            const primaryTest = testResults[primary.id] || { testing: false };
            const availableModels = discoveredModels[provider.id] || [];

            return (
              <div 
                key={provider.id} 
                className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-6"
              >
                {/* Card Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e8ed] dark:border-zinc-800/80 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-[#f2f2f7] dark:bg-zinc-800 text-[#6e6e73] dark:text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                        {provider.category}
                      </span>
                      {isLocal ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3] dark:text-[#3894ff] font-bold text-[10px] flex items-center gap-1 border border-[#0071e3]/20">
                          <Laptop className="w-3 h-3" /> LOCAL AI RUNTIME
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 border border-emerald-500/20">
                          <Globe className="w-3 h-3" /> CLOUD PROVIDER
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold font-display text-[#1d1d1f] dark:text-zinc-100 mt-1">{provider.name}</h3>
                    <p className="text-xs text-[#86868b]">{provider.description}</p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#86868b]">Enabled</span>
                      <input
                        type="checkbox"
                        checked={provider.enabled}
                        onChange={(e) => {
                          fetch("/api/settings/api", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "toggle_provider", providerId: provider.id, payload: { enabled: e.target.checked } }),
                          }).then(() => fetchProviders());
                        }}
                        className="w-4 h-4 accent-[#0071e3] cursor-pointer"
                      />
                    </div>
                  )}
                </div>

                {/* ★ PRIMARY CONNECTION SECTION */}
                <div className="bg-[#f5f5f7] dark:bg-zinc-950/60 border border-[#0071e3]/30 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-[#0071e3] text-white font-bold text-[10px] rounded-md uppercase tracking-wider flex items-center gap-1 shadow-xs">
                        {isLocal ? "★ PRIMARY LOCAL CONNECTION" : "★ PRIMARY API KEY"}
                      </span>
                      {primary.status === "connected" ? (
                        <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Connected
                        </span>
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Key / Endpoint Required
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleTestConnection(provider.id, primary.id, undefined, primary.endpoint, primary.mode, primary.localProviderType)}
                      disabled={primaryTest.testing}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-[#d2d2d7] dark:border-zinc-700 font-semibold text-xs hover:bg-[#f2f2f7] dark:hover:bg-zinc-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${primaryTest.testing ? "animate-spin" : ""}`} />
                      <span>{primaryTest.testing ? "Testing..." : "Test Connection"}</span>
                    </button>
                  </div>

                  {/* Test Result Message Badge */}
                  {primaryTest.success !== undefined && (
                    <div className={`p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                      primaryTest.success 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400" 
                        : "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                    }`}>
                      {primaryTest.success ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      <span>{primaryTest.success ? `Connection successful (${primaryTest.latencyMs}ms)` : primaryTest.error}</span>
                    </div>
                  )}

                  {/* Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {!isLocal ? (
                      <div className="space-y-1 sm:col-span-2">
                        <label className="font-semibold text-[#6e6e73] dark:text-zinc-400 text-[11px]">Primary API Key (Secret)</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="password"
                            readOnly={!isAdmin}
                            placeholder={primary.hasKey ? primary.maskedKey : "Enter primary API key..."}
                            id={`key_input_${provider.id}`}
                            className="flex-1 bg-white dark:bg-zinc-900 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2 outline-none focus:border-[#0071e3] font-mono text-[#1d1d1f] dark:text-zinc-100"
                          />
                          {isAdmin && (
                            <button
                              onClick={() => {
                                const input = document.getElementById(`key_input_${provider.id}`) as HTMLInputElement;
                                if (input && input.value) {
                                  handleUpdatePrimary(provider.id, { apiKey: input.value });
                                  input.value = "";
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-semibold cursor-pointer transition-all shadow-xs"
                            >
                              Save Key
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <label className="font-semibold text-[#6e6e73] dark:text-zinc-400 text-[11px]">Local Endpoint (No API Key Required)</label>
                          <input
                            type="text"
                            readOnly={!isAdmin}
                            defaultValue={primary.endpoint}
                            id={`endpoint_input_${provider.id}`}
                            className="w-full bg-white dark:bg-zinc-900 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2 outline-none focus:border-[#0071e3] font-mono text-[#1d1d1f] dark:text-zinc-100"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="font-semibold text-[#6e6e73] dark:text-zinc-400 text-[11px]">Selected Primary Model</label>
                            {isAdmin && (
                              <button
                                onClick={() => handleDiscoverModels(provider.id, primary.endpoint || "", primary.localProviderType || "ollama")}
                                className="text-[10px] text-[#0071e3] font-semibold hover:underline cursor-pointer"
                              >
                                {discovering[provider.id] ? "Discovering..." : "Discover Installed Models"}
                              </button>
                            )}
                          </div>
                          
                          {availableModels.length > 0 ? (
                            <select
                              defaultValue={primary.model}
                              onChange={(e) => {
                                const endpointInput = document.getElementById(`endpoint_input_${provider.id}`) as HTMLInputElement;
                                handleUpdatePrimary(provider.id, { endpoint: endpointInput?.value, model: e.target.value });
                              }}
                              className="w-full bg-white dark:bg-zinc-900 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2 outline-none font-mono text-[#1d1d1f] dark:text-zinc-100 cursor-pointer"
                            >
                              {availableModels.map(m => (
                                <option key={m} value={m}>{m}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              defaultValue={primary.model || "qwen3-coder"}
                              id={`model_input_${provider.id}`}
                              className="w-full bg-white dark:bg-zinc-900 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2 outline-none font-mono text-[#1d1d1f] dark:text-zinc-100"
                            />
                          )}
                        </div>

                        {/* Cloud Fallback Safety Switch */}
                        <div className="sm:col-span-2 pt-2 border-t border-[#e8e8ed] dark:border-zinc-800 flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-[#1d1d1f] dark:text-zinc-100 block text-xs">Allow Cloud Fallback (Failover)</span>
                            <span className="text-[10px] text-[#86868b]">If local model fails, switch to paid cloud API providers (Disabled by default)</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              provider.allowCloudFallback ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"
                            }`}>
                              {provider.allowCloudFallback ? "LOCAL → CLOUD FALLBACK" : "LOCAL ONLY"}
                            </span>
                            {isAdmin && (
                              <input
                                type="checkbox"
                                checked={provider.allowCloudFallback}
                                onChange={(e) => handleToggleCloudFallback(provider.id, e.target.checked)}
                                className="w-4 h-4 accent-[#0071e3] cursor-pointer"
                              />
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* 4. 💻 Connect Local Model Modal */}
      {showConnectLocalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-[#e8e8ed] dark:border-zinc-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#e8e8ed] dark:border-zinc-800 pb-3">
              <h3 className="font-bold text-sm text-[#1d1d1f] dark:text-zinc-100 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#0071e3]" /> Connect Local Model
              </h3>
              <button onClick={() => setShowConnectLocalModal(false)} className="text-[#86868b] hover:text-[#1d1d1f]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdatePrimary("ollama_local", { endpoint: localForm.endpoint, model: localForm.model, localProviderType: localForm.localProviderType });
              setShowConnectLocalModal(false);
            }} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-[#6e6e73] dark:text-zinc-400">Connection Type</label>
                <select
                  value={localForm.localProviderType}
                  onChange={(e) => {
                    const type = e.target.value as any;
                    const defaultUrl = type === "ollama" ? "http://localhost:11434" : type === "lm-studio" ? "http://localhost:1234/v1" : "http://localhost:8000/v1";
                    setLocalForm({ ...localForm, localProviderType: type, endpoint: defaultUrl });
                  }}
                  className="w-full bg-[#f2f2f7] dark:bg-zinc-800 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2.5 outline-none font-medium text-[#1d1d1f] dark:text-zinc-100 cursor-pointer"
                >
                  <option value="ollama">Ollama (http://localhost:11434)</option>
                  <option value="lm-studio">LM Studio (http://localhost:1234/v1)</option>
                  <option value="openai-compatible">OpenAI-Compatible Local Server</option>
                  <option value="custom">Custom Local Endpoint</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#6e6e73] dark:text-zinc-400">Endpoint URL</label>
                <input
                  type="text"
                  required
                  value={localForm.endpoint}
                  onChange={(e) => setLocalForm({ ...localForm, endpoint: e.target.value })}
                  className="w-full bg-[#f2f2f7] dark:bg-zinc-800 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2.5 outline-none font-mono text-[#1d1d1f] dark:text-zinc-100"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#6e6e73] dark:text-zinc-400">Model Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. qwen3-coder, llama3:8b"
                  value={localForm.model}
                  onChange={(e) => setLocalForm({ ...localForm, model: e.target.value })}
                  className="w-full bg-[#f2f2f7] dark:bg-zinc-800 border border-[#d2d2d7] dark:border-zinc-700 rounded-xl px-3.5 py-2.5 outline-none font-mono text-[#1d1d1f] dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#e8e8ed] dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowConnectLocalModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#f2f2f7] dark:bg-zinc-800 text-[#6e6e73] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0071e3] hover:bg-[#0066cc] text-white font-semibold cursor-pointer"
                >
                  Connect Local Model
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
