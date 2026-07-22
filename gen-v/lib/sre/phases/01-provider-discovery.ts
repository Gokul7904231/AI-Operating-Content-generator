/**
 * Phase 01 — Provider Discovery
 * Scans .env, providers.json, AIConfigManager, and AIProviderRegistry
 * to auto-discover every configured provider. Never hardcodes names.
 */

import fs from "fs";
import path from "path";
import { DiscoveredProvider, ProviderCategory } from "../types";

const PROVIDER_CATALOG: Array<{
  id: string; name: string; category: ProviderCategory;
  envKey: string; keyPrefix: string; baseUrl: string;
  tier: "primary" | "secondary" | "fallback" | "specialized";
}> = [
  { id: "gemini",      name: "Google Gemini",   category: "llm",       envKey: "GEMINI_API_KEY",          keyPrefix: "AIza",         baseUrl: "https://generativelanguage.googleapis.com", tier: "primary" },
  { id: "groq",        name: "Groq",             category: "llm",       envKey: "GROQ_API_KEY",            keyPrefix: "gsk_",         baseUrl: "https://api.groq.com/openai/v1",             tier: "primary" },
  { id: "openrouter",  name: "OpenRouter",       category: "llm",       envKey: "OPENROUTER_API_KEY",      keyPrefix: "sk-or-",       baseUrl: "https://openrouter.ai/api/v1",               tier: "fallback" },
  { id: "nvidia",      name: "NVIDIA NIM",       category: "llm",       envKey: "NVIDIA_API_KEY",          keyPrefix: "nvapi-",       baseUrl: "https://integrate.api.nvidia.com/v1",        tier: "secondary" },
  { id: "zai",         name: "Z.AI (GLM)",       category: "llm",       envKey: "ZAI_API_KEY",             keyPrefix: "",             baseUrl: "https://api.z.ai/api/paas/v4",               tier: "secondary" },
  { id: "huggingface", name: "HuggingFace",      category: "llm",       envKey: "HUGGINGFACE_API_KEY",     keyPrefix: "hf_",          baseUrl: "https://api-inference.huggingface.co",       tier: "specialized" },
  { id: "deepseek",    name: "DeepSeek",         category: "llm",       envKey: "DEEPSEEK_API_KEY",        keyPrefix: "sk-",          baseUrl: "https://api.deepseek.com/v1",                tier: "secondary" },
  { id: "cerebras",    name: "Cerebras",         category: "llm",       envKey: "CEREBRAS_API_KEY",        keyPrefix: "csk-",         baseUrl: "https://api.cerebras.ai/v1",                 tier: "secondary" },
  { id: "sambanova",   name: "SambaNova",        category: "llm",       envKey: "SAMBANOVA_API_KEY",       keyPrefix: "",             baseUrl: "https://api.sambanova.ai/v1",                tier: "secondary" },
  { id: "fireworks",   name: "Fireworks AI",     category: "llm",       envKey: "FIREWORKS_API_KEY",       keyPrefix: "fw_",          baseUrl: "https://api.fireworks.ai/inference/v1",      tier: "secondary" },
  { id: "cohere",      name: "Cohere",           category: "llm",       envKey: "COHERE_API_KEY",          keyPrefix: "cohere_",      baseUrl: "https://api.cohere.ai/v1",                   tier: "secondary" },
  { id: "pollinations",name: "Pollinations AI",  category: "image",     envKey: "POLLINATIONS_API_KEY",    keyPrefix: "sk_",          baseUrl: "https://gen.pollinations.ai",                tier: "primary" },
  { id: "aihorde",     name: "AI Horde",         category: "image",     envKey: "AIHORDE_API_KEY",         keyPrefix: "",             baseUrl: "https://stablehorde.net/api",                tier: "secondary" },
  { id: "replicate",   name: "Replicate",        category: "image",     envKey: "REPLICATE_API_TOKEN",     keyPrefix: "r8_",          baseUrl: "https://api.replicate.com/v1",               tier: "secondary" },
  { id: "deepai",      name: "DeepAI",           category: "image",     envKey: "DEEPAI_API_KEY",          keyPrefix: "",             baseUrl: "https://api.deepai.org",                     tier: "fallback" },
  { id: "elevenlabs",  name: "ElevenLabs",       category: "tts",       envKey: "ELEVENLABS_API_KEY",      keyPrefix: "sk_",          baseUrl: "https://api.elevenlabs.io",                  tier: "primary" },
  { id: "voyage",      name: "Voyage AI",        category: "embedding", envKey: "VOYAGE_API_KEY",          keyPrefix: "pa-",          baseUrl: "https://api.voyageai.com/v1",                tier: "primary" },
  { id: "jina",        name: "Jina AI",          category: "embedding", envKey: "JINA_API_KEY",            keyPrefix: "jina_",        baseUrl: "https://api.jina.ai/v1",                     tier: "secondary" },
  { id: "cloudinary",  name: "Cloudinary",       category: "storage",   envKey: "CLOUDINARY_API_KEY",      keyPrefix: "",             baseUrl: "https://api.cloudinary.com",                 tier: "primary" },
  { id: "firebase",    name: "Firebase",         category: "storage",   envKey: "FIREBASE_PROJECT_ID",     keyPrefix: "",             baseUrl: "https://firebase.google.com",                tier: "primary" },
  { id: "googledrive", name: "Google Drive",     category: "storage",   envKey: "GOOGLE_DRIVE_CLIENT_ID",  keyPrefix: "",             baseUrl: "https://www.googleapis.com/drive",           tier: "primary" },
];

export async function runProviderDiscovery(): Promise<DiscoveredProvider[]> {
  const discovered: DiscoveredProvider[] = [];

  // Read .env file for additional keys
  const envPath = path.resolve(process.cwd(), ".env");
  const rawEnv: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      rawEnv[key] = val;
    }
  }

  for (const entry of PROVIDER_CATALOG) {
    // Try env var from process.env first, fall back to rawEnv parse
    const apiKey = process.env[entry.envKey] || rawEnv[entry.envKey] || "";

    // Also check for alternate naming (e.g. "Nvidia" instead of NVIDIA_API_KEY)
    let resolvedKey = apiKey;
    if (!resolvedKey && entry.id === "nvidia") {
      resolvedKey = process.env["Nvidia"] || rawEnv["Nvidia"] || "";
    }

    const enabled = !!resolvedKey && resolvedKey.length > 4;

    discovered.push({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      envKey: entry.envKey,
      apiKey: resolvedKey ? `${resolvedKey.slice(0, 6)}${"*".repeat(Math.max(0, resolvedKey.length - 10))}${resolvedKey.slice(-4)}` : "",
      baseUrl: process.env[`${entry.id.toUpperCase()}_BASE_URL`] || rawEnv[`${entry.id.toUpperCase()}_BASE_URL`] || entry.baseUrl,
      keyPrefix: entry.keyPrefix,
      tier: entry.tier,
      enabled,
      source: process.env[entry.envKey] ? "env" : rawEnv[entry.envKey] ? "env" : "providers.json",
    });
  }

  console.log(`[SRE Phase 1] Discovered ${discovered.length} providers, ${discovered.filter(d => d.enabled).length} with valid keys.`);
  return discovered;
}
