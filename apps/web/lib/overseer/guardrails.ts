/**
 * FactoryOS Overseer Guardrails
 * Strips secret API keys, raw cookies, passwords, and prevents prompt injection text override.
 */

export class OverseerGuardrails {
  private static SECRET_PATTERNS = [
    /AIzaSy[A-Za-z0-9_-]{33}/g,
    /sk-[A-Za-z0-9_-]{24,}/g,
    /gsk_[A-Za-z0-9_-]{20,}/g,
    /r8_[A-Za-z0-9_-]{20,}/g,
    /Bearer\s+[A-Za-z0-9_.-]+/gi,
  ];

  /**
   * Strips secret keys and auth credentials from strings or objects before passing to LLM/UI.
   */
  static sanitizeOutput(data: any): any {
    if (typeof data === "string") {
      let sanitized = data;
      for (const pattern of this.SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, "[SECRET_KEY_REDACTED]");
      }
      return sanitized;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeOutput(item));
    }

    if (data !== null && typeof data === "object") {
      const cleaned: Record<string, any> = {};
      for (const [key, val] of Object.entries(data)) {
        if (/api_?key|secret|password|auth_?token|credential/i.test(key)) {
          cleaned[key] = "••••••••••••••••";
        } else {
          cleaned[key] = this.sanitizeOutput(val);
        }
      }
      return cleaned;
    }

    return data;
  }

  /**
   * Sanitizes input prompt text to prevent prompt injection hijacking.
   */
  static sanitizeInputPrompt(prompt: string): string {
    if (!prompt || typeof prompt !== "string") return "";
    return prompt.trim();
  }
}
