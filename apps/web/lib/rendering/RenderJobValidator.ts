import { RenderJob } from "./RenderQueueManager";

export interface RenderJobValidationResult {
  valid: boolean;
  errors: string[];
}

export class RenderJobValidator {
  private static ALLOWED_ASPECT_RATIOS = new Set(["9:16", "16:9", "1:1"]);
  private static ALLOWED_OUTPUT_FORMATS = new Set(["mp4", "webm"]);

  static validate(job: Partial<RenderJob>): RenderJobValidationResult {
    const errors: string[] = [];

    if (!job.jobId || typeof job.jobId !== "string") {
      errors.push("Missing or invalid jobId");
    }

    if (!job.tenantId || typeof job.tenantId !== "string") {
      errors.push("Missing or invalid tenantId");
    }

    if (!job.userId || typeof job.userId !== "string") {
      errors.push("Missing or invalid userId");
    }

    const aspectRatio = job.aspectRatio || "9:16";
    if (!this.ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      errors.push(`Invalid aspectRatio '${aspectRatio}'. Must be 9:16, 16:9, or 1:1`);
    }

    const fmt = job.output?.format;
    if (fmt && !this.ALLOWED_OUTPUT_FORMATS.has(fmt)) {
      errors.push(`Invalid output format '${fmt}'. Must be mp4 or webm`);
    }

    // FFmpeg command injection protection: reject arbitrary shell characters in topic or custom flags
    const shellInjectionPattern = /[;&|`$<>]/;
    if (job.topic && shellInjectionPattern.test(job.topic)) {
      errors.push("Invalid topic: potential shell command injection detected");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
