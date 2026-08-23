"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  RefreshCw, Server, Cpu, Laptop, ExternalLink, Eye, EyeOff, 
  ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Sparkles
} from "lucide-react";
import { 
  ApiProviderConfig, 
  ApiConfigSummary, 
  DiscoveredModel 
} from "@/lib/api-config/api-config-store";

export default function ApiAndLocalAiConfigurationPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState("VIEWER");
  const [summary, setSummary] = useState<ApiConfigSummary | null>(null);
  const [providers, setProviders] = useState<ApiProviderConfig[]>([]);

  // Top Segmented Switch: "Local AI" vs "API providers"
  const [topTab, setTopTab] = useState<"local" | "providers">("providers");

  // Selected Cloud Provider in API Providers tab
  const [selectedCloudProviderId, setSelectedCloudProviderId] = useState<string>("gemini");

  // Selected Local Provider in Local AI tab
  const [selectedLocalProviderId, setSelectedLocalProviderId] = useState<string>("ollama_local");

  // Provider Form State
  const [formState, setFormState] = useState<Record<string, {
    apiKey: string;
    endpoint: string;
    model: string;
    maxTokens: string;
    customUrlActive: boolean;
    showKey: boolean;
  }>>({});

  // Dynamic Models Discovery Cache
  const [modelsCache, setModelsCache] = useState<Record<string, DiscoveredModel[]>>({});
  const [discoveringModels, setDiscoveringModels] = useState<Record<string, boolean>>({});
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [memoryModelOpen, setMemoryModelOpen] = useState(false);

  // Connection Test State
  const [testStatus, setTestStatus] = useState<Record<string, {
    testing: boolean;
    success?: boolean;
    error?: string;
    message?: string;
    latencyMs?: number;
  }>>({});

  // Overseer Test Modal State
  const [overseerTestResult, setOverseerTestResult] = useState<any>(null);
  const [testingOverseer, setTestingOverseer] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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

        // Initialize form state for each provider
        const initialForms: any = {};
        for (const p of data.providers) {
          initialForms[p.id] = {
            apiKey: "",
            endpoint: p.primary.endpoint || p.defaultBaseUrl || "",
            model: p.primary.model || (p.mode === "local" ? "qwen2.5-coder" : "gemini-3.7-flash"),
            maxTokens: p.primary.maxTokens ? String(p.primary.maxTokens) : "8192",
            customUrlActive: Boolean(p.primary.customEndpoint),
            showKey: false,
          };
        }
        setFormState(initialForms);

        // Auto-discover models for default selected cloud provider (Gemini)
        discoverModelsForProvider("gemini", initialForms.gemini?.endpoint, "");
        // Auto-discover models for default local provider (Ollama)
        discoverModelsForProvider("ollama_local", initialForms.ollama_local?.endpoint, "");
      }
    } catch (err) {
      console.error("Failed to fetch API provider configuration:", err);
    } finally {
      setLoading(false);
    }
  };

  // Cloud Providers (for API providers tab)
  const cloudProviders = useMemo(() => {
    return providers.filter(p => p.mode === "cloud");
  }, [providers]);

  // Local AI Providers (for Local AI tab)
  const localProviders = useMemo(() => {
    return providers.filter(p => p.mode === "local");
  }, [providers]);

  // Active provider depending on active top tab
  const activeProviderId = topTab === "local" ? selectedLocalProviderId : selectedCloudProviderId;
  const activeProvider = useMemo(() => {
    return providers.find(p => p.id === activeProviderId) || (topTab === "local" ? localProviders[0] : cloudProviders[0]);
  }, [providers, activeProviderId, topTab, localProviders, cloudProviders]);

  const currentForm = formState[activeProvider?.id || ""] || {
    apiKey: "",
    endpoint: activeProvider?.defaultBaseUrl || "",
    model: activeProvider?.primary?.model || "",
    maxTokens: "8192",
    customUrlActive: false,
    showKey: false,
  };

  const updateCurrentForm = (field: string, value: any) => {
    if (!activeProvider?.id) return;
    setFormState(prev => ({
      ...prev,
      [activeProvider.id]: {
        ...prev[activeProvider.id],
        [field]: value,
      },
    }));
  };

  // Discover Models dynamically
  const discoverModelsForProvider = async (providerId: string, endpoint?: string, apiKey?: string) => {
    setDiscoveringModels(prev => ({ ...prev, [providerId]: true }));
    try {
      const p = providers.find(item => item.id === providerId);
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discover_models",
          providerId,
          payload: {
            endpoint: endpoint || formState[providerId]?.endpoint || p?.defaultBaseUrl,
            apiKey: apiKey !== undefined ? apiKey : formState[providerId]?.apiKey,
            mode: p?.mode,
          },
        }),
      });
      const data = await res.json();
      if (data.success && data.models) {
        setModelsCache(prev => ({ ...prev, [providerId]: data.models }));
      }
    } catch {
      // Keep existing cache
    } finally {
      setDiscoveringModels(prev => ({ ...prev, [providerId]: false }));
    }
  };

  // Handle Provider Selection
  const handleSelectCloudProvider = (id: string) => {
    setSelectedCloudProviderId(id);
    setModelDropdownOpen(false);
    if (!modelsCache[id]) {
      const p = providers.find(item => item.id === id);
      discoverModelsForProvider(id, p?.primary.endpoint || p?.defaultBaseUrl, formState[id]?.apiKey);
    }
  };

  const handleSelectLocalProvider = (id: string) => {
    setSelectedLocalProviderId(id);
    setModelDropdownOpen(false);
    if (!modelsCache[id]) {
      const p = providers.find(item => item.id === id);
      discoverModelsForProvider(id, p?.primary.endpoint || p?.defaultBaseUrl);
    }
  };

  // Run Test Connection
  const handleTestConnection = async (targetId?: string) => {
    const pId = targetId || activeProvider?.id;
    if (!pId) return;

    const p = providers.find(item => item.id === pId) || activeProvider;
    const form = formState[pId] || currentForm;

    setTestStatus(prev => ({ ...prev, [pId]: { testing: true } }));
    try {
      const res = await fetch("/api/settings/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: pId,
          apiKey: form.apiKey,
          baseUrl: form.endpoint,
          mode: p?.mode,
          localType: p?.primary.localProviderType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus(prev => ({
          ...prev,
          [pId]: {
            testing: false,
            success: true,
            message: data.message || `Connected. Replied in ${data.latencyMs} ms — 'ok'`,
            latencyMs: data.latencyMs,
          },
        }));
        // Auto refresh models after successful test
        discoverModelsForProvider(pId, form.endpoint, form.apiKey);
      } else {
        setTestStatus(prev => ({
          ...prev,
          [pId]: {
            testing: false,
            success: false,
            error: data.error || "Connection failed",
          },
        }));
      }
    } catch {
      setTestStatus(prev => ({
        ...prev,
        [pId]: {
          testing: false,
          success: false,
          error: "Connection timed out or network error",
        },
      }));
    }
  };

  // Run Test with Overseer (End-to-End Cognitive Test)
  const handleTestWithOverseer = async () => {
    setTestingOverseer(true);
    setOverseerTestResult(null);
    try {
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "test_with_overseer",
          payload: { testPrompt: "How many floors do we have?" },
        }),
      });
      const data = await res.json();
      setOverseerTestResult(data);
    } catch (err: any) {
      setOverseerTestResult({ success: false, error: err.message });
    } finally {
      setTestingOverseer(false);
    }
  };

  // Save Configuration
  const handleSaveConfig = async () => {
    if (!activeProvider) return;
    setSaveMessage("Saving...");
    try {
      const res = await fetch("/api/settings/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_config",
          providerId: activeProvider.id,
          payload: {
            apiKey: currentForm.apiKey,
            endpoint: currentForm.endpoint,
            model: currentForm.model,
            maxTokens: currentForm.maxTokens,
            enabled: true,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveMessage("✓ Configuration saved securely.");
        setTimeout(() => setSaveMessage(null), 3500);
        fetchProviders();
      } else {
        setSaveMessage(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setSaveMessage(`Error: ${err.message}`);
    }
  };

  const defaultModelsForProvider = activeProvider?.mode === "local" ? [
    { id: "qwen2.5-coder", name: "qwen2.5-coder", source: "Local Runtime", capabilities: ["Local Inference", "Zero Cost"] },
    { id: "deepseek-r1:8b", name: "deepseek-r1:8b", source: "Local Runtime", capabilities: ["Reasoning", "Zero Cost"] },
    { id: "llama3.2", name: "llama3.2", source: "Local Runtime", capabilities: ["Chat", "Zero Cost"] },
  ] : [
    { id: "gemini-3.7-flash", name: "Gemini 3.7 Flash (gemini-3.7-flash)", source: "From your account", capabilities: ["Text", "Vision", "JSON"] },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", source: "From your account", capabilities: ["Text", "Vision"] },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", source: "From your account", capabilities: ["Complex Reasoning"] },
  ];

  const discoveredModelList = (activeProvider?.id && modelsCache[activeProvider.id]) 
    ? modelsCache[activeProvider.id] 
    : defaultModelsForProvider;

  const currentTest = activeProvider?.id ? testStatus[activeProvider.id] : undefined;

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8 animate-fadeIn text-slate-800 dark:text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              API & Local AI Control Center
            </span>
            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
              ShortFactory Command Center
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mt-2 text-slate-900 dark:text-white">
            API & Local AI Configuration
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
            Manage primary providers, Ollama / LM Studio local runtimes, model discovery, credentials, and service health.
          </p>
        </div>

        <button
          onClick={fetchProviders}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Discovered</p>
            <p className="text-2xl font-bold mt-1 text-slate-900 dark:text-white">{summary.totalProviders}</p>
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/20 shadow-sm">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Connected</p>
            <p className="text-2xl font-bold mt-1 text-emerald-700 dark:text-emerald-300">{summary.connectedCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20 shadow-sm">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Degraded</p>
            <p className="text-2xl font-bold mt-1 text-amber-700 dark:text-amber-300">{summary.degradedCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Not Configured</p>
            <p className="text-2xl font-bold mt-1 text-slate-700 dark:text-slate-300">{summary.notConfiguredCount}</p>
          </div>
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20 shadow-sm">
            <p className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Local AI Runtimes</p>
            <p className="text-2xl font-bold mt-1 text-blue-700 dark:text-blue-300">{summary.localCount}</p>
          </div>
        </div>
      )}

      {/* Top Segmented Switch: Local AI | API providers */}
      <div className="flex justify-center my-6">
        <div className="flex items-center p-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 max-w-md w-full shadow-inner">
          <button
            onClick={() => setTopTab("local")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200 text-center ${
              topTab === "local"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            Local AI
          </button>
          <button
            onClick={() => setTopTab("providers")}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all duration-200 text-center ${
              topTab === "providers"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            API providers
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LOCAL AI RUNTIMES & EXACT IMG 2 CONFIGURATION                       */}
      {/* ========================================================================= */}
      {topTab === "local" && (
        <div className="space-y-8">
          {/* Quick Local AI Runtime Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {localProviders.map(lp => {
              const isSelected = lp.id === selectedLocalProviderId;
              const testItem = testStatus[lp.id];
              const IconComp = lp.id.includes("ollama") ? Laptop : lp.id.includes("lm") ? Server : Cpu;

              return (
                <div 
                  key={lp.id} 
                  className={`p-5 rounded-2xl border transition-all duration-200 bg-white dark:bg-slate-900 shadow-sm space-y-3.5 ${
                    isSelected 
                      ? "border-blue-500 ring-2 ring-blue-500/20 shadow-md" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <IconComp className={`w-5 h-5 ${lp.id.includes("ollama") ? "text-blue-500" : lp.id.includes("lm") ? "text-indigo-500" : "text-emerald-500"}`} />
                      <h3 className="font-semibold text-base text-slate-900 dark:text-white">{lp.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                      ● READY
                    </span>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500 font-mono">Base URL:</p>
                    <p className="text-xs font-mono font-medium text-slate-700 dark:text-slate-300 truncate">
                      {formState[lp.id]?.endpoint || lp.defaultBaseUrl}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-slate-500">Active Model:</p>
                    <span className="inline-block mt-0.5 px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-800 rounded font-mono font-medium text-slate-800 dark:text-slate-200">
                      {formState[lp.id]?.model || lp.primary.model || "qwen2.5-coder"}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleSelectLocalProvider(lp.id)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition ${
                        isSelected 
                          ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" 
                          : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90"
                      }`}
                    >
                      Configure
                    </button>
                    <button
                      onClick={() => handleTestConnection(lp.id)}
                      disabled={testItem?.testing}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                    >
                      {testItem?.testing ? "..." : "Test"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Configuration Form (Matching Exact Image 2 Contents) */}
          {activeProvider && (
            <div className="p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
              {/* Header with Provider Title & Test button on top right */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeProvider.name}
                  </h2>
                  <span className="text-slate-400 text-sm cursor-help" title={activeProvider.description}>ⓘ</span>
                </div>

                <div className="flex items-center gap-3">
                  {currentTest?.testing ? (
                    <span className="text-xs font-mono text-blue-600 animate-pulse">
                      Testing connection...
                    </span>
                  ) : currentTest?.success ? (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {currentTest.message || `Connected. Replied in ${currentTest.latencyMs} ms — 'ok'`}
                    </span>
                  ) : currentTest?.error ? (
                    <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-medium">
                      {currentTest.error}
                    </span>
                  ) : null}

                  <button
                    onClick={() => handleTestConnection()}
                    disabled={currentTest?.testing}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition shadow-sm"
                  >
                    {currentTest?.testing ? "Testing..." : "Test"}
                  </button>
                </div>
              </div>

              {/* Form Fields Matching Image 2 */}
              <div className="space-y-5 max-w-3xl">
                {/* Provider Preset Dropdown */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Provider preset
                  </label>
                  <div className="relative">
                    <select
                      value={activeProvider.id}
                      onChange={(e) => handleSelectLocalProvider(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {localProviders.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* Base URL with "Customize URL" button */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Base URL <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => updateCurrentForm("customUrlActive", !currentForm.customUrlActive)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium"
                    >
                      {currentForm.customUrlActive ? "Use default URL" : "Customize URL"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={currentForm.endpoint}
                    readOnly={!currentForm.customUrlActive}
                    onChange={(e) => updateCurrentForm("endpoint", e.target.value)}
                    placeholder="http://127.0.0.1:11434"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 ${
                      currentForm.customUrlActive ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300"
                    } text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                  />
                  <p className="text-xs text-slate-400 mt-1">Change this only if you use a proxy or compatible gateway.</p>
                </div>

                {/* Max tokens (optional) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max tokens (optional)
                  </label>
                  <input
                    type="text"
                    value={currentForm.maxTokens}
                    onChange={(e) => updateCurrentForm("maxTokens", e.target.value)}
                    placeholder="8192"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Maximum response length. Leave blank to use the model default.</p>
                </div>

                {/* Model * dropdown with loaded models count */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model <span className="text-rose-500">*</span>
                  </label>

                  <div
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-slate-400"
                  >
                    <span className="font-mono">{currentForm.model || "qwen2.5-coder"}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {modelDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl space-y-2 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search models..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                      {discoveredModelList
                        .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                        .map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              updateCurrentForm("model", m.id);
                              setModelDropdownOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{m.name}</p>
                              <p className="text-[11px] font-mono text-slate-400">{m.id} · {m.source}</p>
                            </div>
                            <div className="flex gap-1">
                              {m.capabilities?.map(c => (
                                <span key={c} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1.5">
                    ✓ Loaded {discoveredModelList.length} models from your account.
                  </p>
                </div>

                {/* Expandable Memory model & Advanced Configuration */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMemoryModelOpen(!memoryModelOpen)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600"
                  >
                    {memoryModelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Memory model & Advanced Configuration
                  </button>

                  {memoryModelOpen && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                      <p className="text-xs text-slate-500">
                        Configure local context compression, creative memory cache, and high-performance quantized weights.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span>Free-First Cost Policy Enforcement</span>
                        <span className="font-semibold text-emerald-600">STRICT $0 LOCAL INFERENCE</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons: Save Configuration & Test with Overseer */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSaveConfig}
                    className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={handleTestWithOverseer}
                    disabled={testingOverseer}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    {testingOverseer ? "Testing with Overseer..." : "Test with Overseer"}
                  </button>
                  {saveMessage && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {saveMessage}
                    </span>
                  )}
                </div>

                {/* Overseer Test Modal / Result Display */}
                {overseerTestResult && (
                  <div className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-2">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Overseer Cognitive Test Result:</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Prompt: "{overseerTestResult.testPrompt}"</p>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">Response: {overseerTestResult.answer}</p>
                    <p className="text-[11px] text-slate-500">Intent: {overseerTestResult.intent} · Source: {overseerTestResult.sourceUsed}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: API PROVIDERS (MATCHING OPEN DESIGN EXACT CHIPS & FORM)            */}
      {/* ========================================================================= */}
      {topTab === "providers" && (
        <div className="space-y-8">
          {/* Provider Chips Grid (Matching Open Design layout) */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 p-4 rounded-2xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-200/80 dark:border-slate-800/80">
            {cloudProviders.map(p => {
              const isSelected = p.id === selectedCloudProviderId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectCloudProvider(p.id)}
                  className={`px-4 py-2 text-xs md:text-sm font-medium rounded-full transition-all duration-150 border ${
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm font-semibold scale-105"
                      : "bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                  }`}
                >
                  {p.name}
                </button>
              );
            })}
          </div>

          {/* Provider Configuration Panel (Matching Screenshot layout) */}
          {activeProvider && (
            <div className="p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-6">
              {/* Header with Title, Status & Test Button */}
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeProvider.name}
                  </h2>
                  <span className="text-slate-400 text-sm cursor-help" title={activeProvider.description}>ⓘ</span>
                </div>

                <div className="flex items-center gap-3">
                  {currentTest?.testing ? (
                    <span className="text-xs font-mono text-blue-600 animate-pulse">
                      Testing connection...
                    </span>
                  ) : currentTest?.success ? (
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                      {currentTest.message || `Connected. Replied in ${currentTest.latencyMs} ms — 'ok'`}
                    </span>
                  ) : currentTest?.error ? (
                    <span className="text-xs font-mono text-rose-600 dark:text-rose-400 font-medium">
                      {currentTest.error}
                    </span>
                  ) : null}

                  <button
                    onClick={() => handleTestConnection()}
                    disabled={currentTest?.testing}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition shadow-sm"
                  >
                    {currentTest?.testing ? "Testing..." : "Test"}
                  </button>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-5 max-w-3xl">
                {/* Provider Preset */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Provider preset
                  </label>
                  <div className="relative">
                    <select
                      value={activeProvider.id}
                      onChange={(e) => handleSelectCloudProvider(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                    >
                      {cloudProviders.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                  </div>
                </div>

                {/* API Key Field */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    API key <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <input
                        type={currentForm.showKey ? "text" : "password"}
                        value={currentForm.apiKey}
                        onChange={(e) => updateCurrentForm("apiKey", e.target.value)}
                        placeholder="••••••••••••••••••••••••••••••••••••"
                        className="w-full pl-3.5 pr-16 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => updateCurrentForm("showKey", !currentForm.showKey)}
                        className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white font-medium"
                      >
                        {currentForm.showKey ? "Hide" : "Show"}
                      </button>
                    </div>

                    {activeProvider.getKeyUrl && (
                      <a
                        href={activeProvider.getKeyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                      >
                        Get key <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Stored locally on this device.</p>
                </div>

                {/* Base URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Base URL <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => updateCurrentForm("customUrlActive", !currentForm.customUrlActive)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 font-medium"
                    >
                      {currentForm.customUrlActive ? "Use default URL" : "Customize URL"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={currentForm.endpoint}
                    readOnly={!currentForm.customUrlActive}
                    onChange={(e) => updateCurrentForm("endpoint", e.target.value)}
                    className={`w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 ${
                      currentForm.customUrlActive ? "bg-white dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-800/50 text-slate-500"
                    } text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono`}
                  />
                  <p className="text-xs text-slate-400 mt-1">Change this only if you use a proxy or compatible gateway.</p>
                </div>

                {/* Max Tokens */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max tokens (optional)
                  </label>
                  <input
                    type="text"
                    value={currentForm.maxTokens}
                    onChange={(e) => updateCurrentForm("maxTokens", e.target.value)}
                    placeholder="8192"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <p className="text-xs text-slate-400 mt-1">Maximum response length. Leave blank to use the model default.</p>
                </div>

                {/* Model Searchable Dropdown */}
                <div className="relative">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Model <span className="text-rose-500">*</span>
                  </label>

                  <div
                    onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex items-center justify-between cursor-pointer hover:border-slate-400"
                  >
                    <span className="font-mono">{currentForm.model || "Select a model..."}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </div>

                  {modelDropdownOpen && (
                    <div className="absolute z-20 w-full mt-1.5 p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl space-y-2 max-h-64 overflow-y-auto">
                      <input
                        type="text"
                        value={modelSearch}
                        onChange={(e) => setModelSearch(e.target.value)}
                        placeholder="Search models..."
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 font-mono"
                      />
                      {discoveredModelList
                        .filter(m => m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()))
                        .map(m => (
                          <div
                            key={m.id}
                            onClick={() => {
                              updateCurrentForm("model", m.id);
                              setModelDropdownOpen(false);
                            }}
                            className="p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-white">{m.name}</p>
                              <p className="text-[11px] font-mono text-slate-400">{m.id} · {m.source}</p>
                            </div>
                            <div className="flex gap-1">
                              {m.capabilities?.map(c => (
                                <span key={c} className="px-1.5 py-0.5 text-[10px] bg-slate-200 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1.5">
                    ✓ Loaded {discoveredModelList.length} models from your account.
                  </p>
                </div>

                {/* Expandable Memory Model Section */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setMemoryModelOpen(!memoryModelOpen)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600"
                  >
                    {memoryModelOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    Memory model & Advanced Configuration
                  </button>

                  {memoryModelOpen && (
                    <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-3">
                      <p className="text-xs text-slate-500">
                        Configure specialized models for context compression, creative memory, and audio continuity.
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span>Free-First Cost Policy Enforcement</span>
                        <span className="font-semibold text-emerald-600">STRICT $0 DEFAULT</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSaveConfig}
                    className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition shadow-sm"
                  >
                    Save Configuration
                  </button>
                  <button
                    onClick={handleTestWithOverseer}
                    disabled={testingOverseer}
                    className="px-4 py-2.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
                  >
                    {testingOverseer ? "Testing with Overseer..." : "Test with Overseer"}
                  </button>
                  {saveMessage && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      {saveMessage}
                    </span>
                  )}
                </div>

                {/* Overseer Test Modal / Result Display */}
                {overseerTestResult && (
                  <div className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/30 space-y-2">
                    <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Overseer Cognitive Test Result:</p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-mono">Prompt: "{overseerTestResult.testPrompt}"</p>
                    <p className="text-xs font-medium text-slate-900 dark:text-white">Response: {overseerTestResult.answer}</p>
                    <p className="text-[11px] text-slate-500">Intent: {overseerTestResult.intent} · Source: {overseerTestResult.sourceUsed}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
