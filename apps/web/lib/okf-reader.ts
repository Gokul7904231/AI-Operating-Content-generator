/**
 * OKF Reader
 *
 * Programmatic introspection utility for the Open Knowledge Format (.okf) layer.
 * Caches markdown content in RAM to avoid frequent disk access.
 * Exposes search, list, read, and summarize helper methods for AI agents.
 */

import fs from "fs";
import path from "path";

interface CacheEntry {
  content: string;
  timestamp: number;
}

class OKFReaderClass {
  private baseDir = path.resolve(process.cwd(), ".okf");
  private cache = new Map<string, CacheEntry>();
  private cacheTTL = 300000; // 5 minutes

  /**
   * Reads an OKF file, resolving from RAM cache if valid.
   */
  read(docPath: string): string {
    const cached = this.cache.get(docPath);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.content;
    }

    const absolutePath = path.join(this.baseDir, docPath);
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`[OKFReader] Document not found: ${docPath} at ${absolutePath}`);
    }

    const content = fs.readFileSync(absolutePath, "utf-8");
    this.cache.set(docPath, { content, timestamp: Date.now() });
    return content;
  }

  /**
   * Recursively lists all available document relative paths under .okf/.
   */
  list(dir = ""): string[] {
    const targetDir = path.join(this.baseDir, dir);
    if (!fs.existsSync(targetDir)) return [];

    const results: string[] = [];
    const listDir = (currentPath: string, relativePrefix: string) => {
      const entries = fs.readdirSync(currentPath, { withFileTypes: true });
      for (const entry of entries) {
        const rel = relativePrefix ? `${relativePrefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          listDir(path.join(currentPath, entry.name), rel);
        } else if (entry.name.endsWith(".md")) {
          results.push(rel);
        }
      }
    };

    listDir(targetDir, dir);
    return results;
  }

  /**
   * Searches for a literal query query string inside all OKF files.
   * Returns list of matching file names.
   */
  search(query: string): string[] {
    const docs = this.list();
    const matches: string[] = [];
    const cleanQuery = query.toLowerCase();

    for (const doc of docs) {
      try {
        const content = this.read(doc).toLowerCase();
        if (content.includes(cleanQuery)) {
          matches.push(doc);
        }
      } catch {
        // Skip inaccessible files
      }
    }

    return matches;
  }

  /**
   * Extracts a brief context summary of the requested document (e.g. title + first paragraph).
   */
  summarize(docPath: string): string {
    const raw = this.read(docPath);
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    
    const title = lines.find((l) => l.startsWith("#"))?.replace(/^#+\s*/, "") ?? docPath;
    const body = lines.find((l) => !l.startsWith("#") && !l.startsWith("`") && !l.startsWith("-")) ?? "No content summary.";

    return `Document: ${title}\nPreview: ${body.slice(0, 180)}...`;
  }

  /**
   * Helper to clear the RAM cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export const OKFReader = new OKFReaderClass();
