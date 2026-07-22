/**
 * Prompt Registry
 *
 * Centralizes prompt templates and versions under the prompts/ folder.
 * Supports token substitution (e.g. {{topic}}) and version resolution.
 * Allows engines to specify a simple slug (e.g. "hook:v1") rather than hardcoding file paths.
 */

import fs from "fs";
import path from "path";

import { MetricsDB } from "../lib/queue-db";

class PromptRegistryClass {
  private baseDir = path.resolve(process.cwd(), "prompts");
  private memoryPrompts = new Map<string, string>();

  /**
   * Register a custom prompt in memory.
   */
  registerMemoryPrompt(slug: string, content: string): void {
    this.memoryPrompts.set(slug, content);
  }

  /**
   * Remove a custom prompt from memory.
   */
  deleteMemoryPrompt(slug: string): void {
    this.memoryPrompts.delete(slug);
  }

  /**
   * Resolve a prompt version and load its template content.
   *
   * @param slug - In format "type:version" e.g. "hook:v1"
   * @returns Template string content
   */
  getPrompt(slug: string): string {
    if (this.memoryPrompts.has(slug)) {
      return this.memoryPrompts.get(slug)!;
    }

    let [type, version] = slug.split(":");
    if (!type || !version) {
      throw new Error(`[PromptRegistry] Invalid slug format: "${slug}". Expected "type:version".`);
    }

    // Resolve A/B auto-optimization from SQLite analytics
    if (version === "auto") {
      version = MetricsDB.getBestPromptVersion(type);
      console.log(`[PromptRegistry] Auto-resolving prompt for type "${type}" to version "${version}" based on performance metrics.`);
    }

    const resolvedPath = path.join(this.baseDir, type, `${version}.md`);
    if (!fs.existsSync(resolvedPath)) {
      // Fallback: search for .txt if .md doesn't exist
      const fallbackPath = path.join(this.baseDir, type, `${version}.txt`);
      if (!fs.existsSync(fallbackPath)) {
        throw new Error(`[PromptRegistry] Prompt template not found for slug "${slug}" (resolved: ${version}) at ${resolvedPath}`);
      }
      return fs.readFileSync(fallbackPath, "utf-8");
    }

    return fs.readFileSync(resolvedPath, "utf-8");
  }

  /**
   * Render a prompt template by replacing double curly brackets.
   *
   * @param slug - e.g. "hook:v1"
   * @param variables - Variables to substitute
   */
  render(slug: string, variables: Record<string, any> = {}): string {
    let template = this.getPrompt(slug);

    for (const [key, value] of Object.entries(variables)) {
      const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      template = template.replace(pattern, String(value));
    }

    return template;
  }

  /**
   * Helper to list all available versions for a prompt type.
   */
  listVersions(type: string): string[] {
    const dir = path.join(this.baseDir, type);
    if (!fs.existsSync(dir)) return [];
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
      .map((f) => f.replace(/\.(md|txt)$/, ""));
  }
  /**
   * Helper to list all registered prompt slugs (both file-based and memory-cached).
   */
  getAllPrompts(): string[] {
    const list: string[] = Array.from(this.memoryPrompts.keys());
    try {
      if (fs.existsSync(this.baseDir)) {
        const types = fs.readdirSync(this.baseDir).filter((f) =>
          fs.statSync(path.join(this.baseDir, f)).isDirectory()
        );
        for (const type of types) {
          const versions = this.listVersions(type);
          for (const ver of versions) {
            list.push(`${type}:${ver}`);
          }
        }
      }
    } catch {}
    return list;
  }
}

export const PromptRegistry = new PromptRegistryClass();
