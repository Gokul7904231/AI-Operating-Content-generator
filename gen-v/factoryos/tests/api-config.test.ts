import { describe, it, expect } from "vitest";
import { ApiConfigManager } from "../../lib/api-config/api-config-manager";
import { encrypt, decrypt } from "../../lib/providers/crypto";

describe("FactoryOS — API & Local AI Configuration Control Center Suite", () => {
  it("01: Discovers all cataloged Cloud and Local AI providers", async () => {
    const providers = await ApiConfigManager.getProviders();
    expect(providers.length).toBeGreaterThan(10);

    const gemini = providers.find(p => p.id === "gemini");
    expect(gemini).toBeDefined();
    expect(gemini?.mode).toBe("cloud");

    const ollama = providers.find(p => p.id === "ollama_local");
    expect(ollama).toBeDefined();
    expect(ollama?.mode).toBe("local");
  });

  it("02: Enforces that Local AI runtimes do NOT require API keys", async () => {
    const providers = await ApiConfigManager.getProviders();
    const ollama = providers.find(p => p.id === "ollama_local");

    expect(ollama?.primary.hasKey).toBe(true);
    expect(ollama?.primary.maskedKey).toBe("LOCAL_NO_KEY_REQUIRED");
    expect(ollama?.primary.endpoint).toBe("http://localhost:11434");
  });

  it("03: Encrypts API keys with AES-256-GCM and never returns raw secrets", async () => {
    const rawSecret = "sk-test-secret-key-123456789";
    const encrypted = encrypt(rawSecret);

    expect(encrypted).not.toBe(rawSecret);
    expect(encrypted.startsWith("gcm:")).toBe(true);
    expect(decrypt(encrypted)).toBe(rawSecret);

    // Verify Manager masks keys
    const providers = await ApiConfigManager.getProviders();
    const gemini = providers.find(p => p.id === "gemini");
    expect(gemini?.primary.maskedKey).not.toBe(rawSecret);
  });

  it("04: Resolves environment variable fallbacks (.env continuity)", async () => {
    process.env.GEMINI_API_KEY = "AIzaSy_mock_env_gemini_key";
    const credential = await ApiConfigManager.resolveProvider("gemini");

    expect(credential).toBeDefined();
    expect(credential.apiKey).toBe("AIzaSy_mock_env_gemini_key");
    expect(credential.isLocal).toBe(false);
  });

  it("05: Resolves Local AI base URL without requiring API key", async () => {
    const credential = await ApiConfigManager.resolveProvider("ollama_local");

    expect(credential.isLocal).toBe(true);
    expect(credential.apiKey).toBe("");
    expect(credential.endpoint).toContain("http://localhost:11434");
  });
});
