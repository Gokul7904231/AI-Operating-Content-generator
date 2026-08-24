import fs from "fs";
import path from "path";
import os from "os";

export class TempManagerClass {
  private baseDir: string;

  constructor() {
    // 1. Check if user configured TEMP_DIR
    if (process.env.TEMP_DIR) {
      this.baseDir = path.resolve(process.env.TEMP_DIR);
    } else {
      // 2. Identify safe local root, escaping cloud sync folders (OneDrive, Dropbox, etc.)
      const cwd = process.cwd();
      if (this.isSynchronizedPath(cwd)) {
        // Redirect to a local machine temp directory outside of the project folder
        this.baseDir = path.join(os.tmpdir(), "ShortFactory", "temp");
      } else {
        this.baseDir = path.join(cwd, "data", "temp");
      }
    }

    this.ensureDir(this.baseDir);
  }

  /**
   * Checks if the directory is inside a cloud-synchronized folder that might lock files or add latency
   */
  private isSynchronizedPath(dirPath: string): boolean {
    const lower = dirPath.toLowerCase();
    return (
      lower.includes("onedrive") ||
      lower.includes("dropbox") ||
      lower.includes("google drive") ||
      lower.includes("googledrive") ||
      lower.includes("icloud") ||
      lower.includes("nextcloud") ||
      lower.includes("owncloud")
    );
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Resolves and allocates a safe temporary folder for the specified job
   */
  getTempDir(jobId: string, subFolder?: string): string {
    const jobDir = path.join(this.baseDir, jobId);
    const targetDir = subFolder ? path.join(jobDir, subFolder) : jobDir;
    this.ensureDir(targetDir);
    return targetDir;
  }

  /**
   * Asynchronously deletes a job temporary directory
   */
  async cleanup(jobId: string): Promise<void> {
    const jobDir = path.join(this.baseDir, jobId);
    if (fs.existsSync(jobDir)) {
      await fs.promises.rm(jobDir, { recursive: true, force: true });
    }
  }

  /**
   * Asynchronously removes older job temporary files based on a TTL in hours
   */
  async cleanupAllOlderThan(hours: number): Promise<void> {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    try {
      if (!fs.existsSync(this.baseDir)) return;
      
      const jobs = fs.readdirSync(this.baseDir);
      for (const job of jobs) {
        const jobPath = path.join(this.baseDir, job);
        const stat = fs.statSync(jobPath);
        if (stat.mtimeMs < cutoff) {
          await fs.promises.rm(jobPath, { recursive: true, force: true });
        }
      }
    } catch (err: any) {
      console.error(`[TempManager] Cleanup failed: ${err.message}`);
    }
  }

  /**
   * Gets the root directory managed by this instance
   */
  getBaseDir(): string {
    return this.baseDir;
  }
}

export const TempManager = new TempManagerClass();
export default TempManager;
