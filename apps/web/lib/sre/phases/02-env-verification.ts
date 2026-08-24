/**
 * Phase 02 — Environment Verification
 * Deep .env audit: missing, duplicate, malformed, wrong naming, security issues.
 */

import fs from "fs";
import path from "path";
import { EnvVerificationResult, EnvIssue } from "../types";

const KEY_PREFIX_MAP: Record<string, { prefix: string; description: string }> = {
  GEMINI_API_KEY:       { prefix: "AIza",    description: "Google Gemini key" },
  GROQ_API_KEY:         { prefix: "gsk_",    description: "Groq key" },
  OPENROUTER_API_KEY:   { prefix: "sk-or-",  description: "OpenRouter key" },
  HUGGINGFACE_API_KEY:  { prefix: "hf_",     description: "HuggingFace token" },
  REPLICATE_API_TOKEN:  { prefix: "r8_",     description: "Replicate token" },
  ELEVENLABS_API_KEY:   { prefix: "sk_",     description: "ElevenLabs key" },
  POLLINATIONS_API_KEY: { prefix: "sk_",     description: "Pollinations key" },
  FIREWORKS_API_KEY:    { prefix: "fw_",     description: "Fireworks key" },
  CEREBRAS_API_KEY:     { prefix: "csk-",    description: "Cerebras key" },
  VOYAGE_API_KEY:       { prefix: "pa-",     description: "Voyage AI key" },
  JINA_API_KEY:         { prefix: "jina_",   description: "Jina AI key" },
  COHERE_API_KEY:       { prefix: "cohere_", description: "Cohere key" },
  DEEPSEEK_API_KEY:     { prefix: "sk-",     description: "DeepSeek key" },
};

const WRONG_NAMING_MAP: Record<string, string> = {
  "Nvidia":          "NVIDIA_API_KEY",
  "nvidia_key":      "NVIDIA_API_KEY",
  "GEMINI_KEY":      "GEMINI_API_KEY",
  "OPENAI_API_KEY":  "OPENROUTER_API_KEY (if using OpenRouter)",
};

const CRITICAL_KEYS = [
  "GEMINI_API_KEY", "GROQ_API_KEY", "OPENROUTER_API_KEY",
  "FIREBASE_PROJECT_ID", "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL",
];

const DEPRECATED_KEYS = [
  "DEFAULT_LLM_PROVIDER", "WORKFLOW_VERSION", "ENGINE_VERSION",
  "PROMPT_VERSION", "STORAGE_VERSION", "PUBLISHER_VERSION",
  "RUNTIME_VERSION", "OKF_VERSION", "RENDERER_VERSION",
];

const INSECURE_VALUES = ["CHANGE_ME_IN_PRODUCTION", "supersecretkey123", "test", "12345", "password", "secret"];

export async function runEnvVerification(): Promise<EnvVerificationResult> {
  const issues: EnvIssue[] = [];
  const providersDetected: string[] = [];
  const parsedKeys = new Map<string, { val: string; lineNo: number }[]>();

  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    issues.push({
      severity: "critical",
      category: "missing",
      key: ".env",
      message: ".env file not found in project root.",
      recommendation: "Create a .env file based on .env.example",
    });
    return { phase: 2, totalKeys: 0, validKeys: 0, issues, providersDetected, securityScore: 0 };
  }

  const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;

    // Check for wrong naming
    for (const [wrongName, correctName] of Object.entries(WRONG_NAMING_MAP)) {
      if (line.startsWith(wrongName + "=")) {
        issues.push({
          severity: "critical",
          category: "naming",
          key: wrongName,
          message: `Variable "${wrongName}" has the wrong name. Should be "${correctName}".`,
          recommendation: `Rename "${wrongName}" to "${correctName}" in .env`,
        });
      }
    }

    // No = sign
    if (!line.includes("=")) {
      issues.push({
        severity: "warning",
        category: "malformed",
        key: `line_${i + 1}`,
        message: `Line ${i + 1} has no '=' sign: "${line}"`,
        recommendation: "Ensure all entries follow KEY=VALUE format",
      });
      continue;
    }

    const eqIdx = line.indexOf("=");
    const key = line.slice(0, eqIdx).trim();
    const val = line.slice(eqIdx + 1).trim();

    // Detect nested assignment like GROQ_API_KEY=GROQ_MODEL=llama...
    const remainingAfterFirst = val;
    if (remainingAfterFirst.includes("=") && !remainingAfterFirst.startsWith("\"") && !remainingAfterFirst.startsWith("'")) {
      issues.push({
        severity: "critical",
        category: "malformed",
        key,
        message: `Line ${i + 1} contains a malformed nested assignment: "${line}"`,
        recommendation: `Split into separate lines: "${key}=<value>" and "OTHER_KEY=<value>"`,
      });
    }

    if (!parsedKeys.has(key)) parsedKeys.set(key, []);
    parsedKeys.get(key)!.push({ val, lineNo: i + 1 });
  }

  let validKeys = 0;

  for (const [key, occurrences] of parsedKeys.entries()) {
    const val = occurrences[0].val;

    // Duplicate detection
    if (occurrences.length > 1) {
      issues.push({
        severity: "critical",
        category: "duplicate",
        key,
        message: `"${key}" defined ${occurrences.length}x on lines: ${occurrences.map(o => o.lineNo).join(", ")}`,
        recommendation: `Remove duplicate entries. Keep only the latest value.`,
      });
    }

    // Blank value
    if (!val || val.length === 0) {
      issues.push({
        severity: "warning",
        category: "missing",
        key,
        message: `"${key}" is set but has an empty value.`,
        recommendation: `Fill in a valid value for "${key}" or remove the entry.`,
      });
    } else {
      validKeys++;
    }

    // Prefix validation
    const prefixCheck = KEY_PREFIX_MAP[key];
    if (prefixCheck && val && !val.startsWith(prefixCheck.prefix)) {
      issues.push({
        severity: "warning",
        category: "malformed",
        key,
        message: `"${key}" value does not start with expected prefix "${prefixCheck.prefix}" (${prefixCheck.description}).`,
        recommendation: `Verify this is a valid ${prefixCheck.description}. Expected format: ${prefixCheck.prefix}...`,
      });
    }

    // Deprecated
    if (DEPRECATED_KEYS.includes(key)) {
      issues.push({
        severity: "warning",
        category: "deprecated",
        key,
        message: `"${key}" is deprecated and may be removed in a future version.`,
        recommendation: `Remove "${key}" from .env if unused.`,
      });
    }

    // Insecure values
    if (key.includes("SECRET") || key.includes("PASSWORD") || key.includes("KEY")) {
      if (val && INSECURE_VALUES.some(bad => val.toLowerCase().includes(bad.toLowerCase()))) {
        issues.push({
          severity: "critical",
          category: "security",
          key,
          message: `"${key}" appears to use an unsafe default value.`,
          recommendation: `Replace with a strong, randomly generated secret.`,
        });
      }
    }

    // Provider detection
    if (key.includes("GEMINI")) providersDetected.push("gemini");
    if (key.includes("GROQ")) providersDetected.push("groq");
    if (key.includes("OPENROUTER")) providersDetected.push("openrouter");
    if (key.includes("NVIDIA") || key === "Nvidia") providersDetected.push("nvidia");
    if (key.includes("ZAI")) providersDetected.push("zai");
    if (key.includes("HUGGINGFACE")) providersDetected.push("huggingface");
    if (key.includes("ELEVENLABS")) providersDetected.push("elevenlabs");
    if (key.includes("POLLINATIONS")) providersDetected.push("pollinations");
  }

  // Missing critical keys
  for (const ck of CRITICAL_KEYS) {
    if (!parsedKeys.has(ck) || !parsedKeys.get(ck)![0].val) {
      issues.push({
        severity: "critical",
        category: "missing",
        key: ck,
        message: `Critical key "${ck}" is missing or empty.`,
        recommendation: `Add "${ck}" to your .env file.`,
      });
    }
  }

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const securityScore = Math.max(0, 100 - criticalCount * 15 - issues.filter(i => i.category === "security").length * 20);

  console.log(`[SRE Phase 2] Env verified. ${parsedKeys.size} keys, ${issues.length} issues (${criticalCount} critical).`);

  return {
    phase: 2,
    totalKeys: parsedKeys.size,
    validKeys,
    issues,
    providersDetected: [...new Set(providersDetected)],
    securityScore,
  };
}
