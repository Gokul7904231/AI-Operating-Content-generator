import fs from "fs";
import path from "path";
import { VideoArtifact } from "./ProductionJob";

export interface OutputValidationResult {
  valid: boolean;
  issues: string[];
}

export class OutputArtifactValidator {
  /**
   * Verifies that the generated video artifact exists on disk, has non-zero byte size,
   * matches valid video extension (.mp4, .webm, .mkv), and is assigned to the production job.
   */
  static validate(artifact?: VideoArtifact, jobId?: string): OutputValidationResult {
    const issues: string[] = [];

    if (!artifact) {
      return { valid: false, issues: ["Video artifact object is missing."] };
    }

    if (!artifact.filePath || typeof artifact.filePath !== "string") {
      issues.push("Video artifact file path is undefined or invalid.");
      return { valid: false, issues };
    }

    const resolvedPath = path.resolve(artifact.filePath);
    if (!fs.existsSync(resolvedPath)) {
      issues.push(`Artifact file does not exist at path: "${resolvedPath}"`);
      return { valid: false, issues };
    }

    try {
      const stats = fs.statSync(resolvedPath);
      if (stats.size === 0) {
        issues.push(`Artifact file is empty (0 bytes): "${resolvedPath}"`);
      }
    } catch (err: any) {
      issues.push(`Failed to read artifact stats: ${err?.message ?? err}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    if (![".mp4", ".webm", ".mkv", ".mov"].includes(ext)) {
      issues.push(`Invalid video file extension "${ext}". Expected .mp4, .webm, or .mkv.`);
    }

    if (artifact.durationSeconds <= 0) {
      issues.push(`Artifact reported invalid duration: ${artifact.durationSeconds} seconds.`);
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }
}
