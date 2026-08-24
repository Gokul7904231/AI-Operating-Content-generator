import fs from "fs";
import path from "path";

export interface AuditDiagnostic {
  type: "error" | "warning" | "info";
  category: "syntax" | "duplicate" | "naming" | "deprecated" | "missing" | "security" | "dependency";
  message: string;
  key?: string;
  value?: string;
}

export interface DoctorReport {
  timestamp: string;
  diagnostics: AuditDiagnostic[];
  envKeys: Record<string, string>;
  dependenciesStatus: Record<string, boolean>;
  securityAudit: {
    passed: boolean;
    issues: string[];
  };
}

class EnvironmentDoctorClass {
  private envFile = path.resolve(process.cwd(), ".env");

  audit(): DoctorReport {
    const report: DoctorReport = {
      timestamp: new Date().toISOString(),
      diagnostics: [],
      envKeys: {},
      dependenciesStatus: {},
      securityAudit: { passed: true, issues: [] }
    };

    // 1. Check dependencies
    this.checkDependencies(report);

    // 2. Read and Parse .env
    if (!fs.existsSync(this.envFile)) {
      report.diagnostics.push({
        type: "error",
        category: "missing",
        message: ".env file does not exist in the project root."
      });
      return report;
    }

    const raw = fs.readFileSync(this.envFile, "utf-8");
    const lines = raw.split(/\r?\n/);
    const parsedKeys = new Map<string, { val: string; lineNo: number }[]>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      // Check for malformed assignments
      if (!line.includes("=")) {
        report.diagnostics.push({
          type: "warning",
          category: "syntax",
          message: `Line ${i + 1} has a value but no '=' assignment: "${line}"`
        });
        continue;
      }

      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) continue;

      const key = match[1].trim();
      const val = match[2].trim();

      // Check malformed assignments like KEY=ANOTHER_KEY=VALUE
      if (val.includes("=")) {
        report.diagnostics.push({
          type: "error",
          category: "syntax",
          key,
          value: val,
          message: `Line ${i + 1} contains a malformed nested assignment: "${line}"`
        });
      }

      if (!parsedKeys.has(key)) {
        parsedKeys.set(key, []);
      }
      parsedKeys.get(key)!.push({ val, lineNo: i + 1 });
    }

    // 3. Evaluate Diagnostics
    for (const [key, occurrences] of parsedKeys.entries()) {
      const primary = occurrences[0];
      report.envKeys[key] = primary.val;

      // Duplicate keys check
      if (occurrences.length > 1) {
        report.diagnostics.push({
          type: "error",
          category: "duplicate",
          key,
          message: `Variable "${key}" is defined multiple times on lines: ${occurrences.map(o => o.lineNo).join(", ")}`
        });
      }

      // Wrong Variable Names check
      if (key === "Nvidia") {
        report.diagnostics.push({
          type: "error",
          category: "naming",
          key,
          message: `Variable "${key}" has the wrong name casing. It should be "NVIDIA_API_KEY".`
        });
      }

      // Deprecated check
      const deprecatedKeys = ["DEFAULT_LLM_PROVIDER", "WORKFLOW_VERSION", "ENGINE_VERSION"];
      if (deprecatedKeys.includes(key)) {
        report.diagnostics.push({
          type: "warning",
          category: "deprecated",
          key,
          message: `Variable "${key}" is deprecated and scheduled for deletion in Phase 3.`
        });
      }

      // Format format validation checks
      this.validateKeyPatterns(key, primary.val, report);
    }

    // 4. Check for missing variables
    const criticalKeys = [
      "GEMINI_API_KEY",
      "GROQ_API_KEY",
      "OPENROUTER_API_KEY",
      "POLLINATIONS_API_KEY",
      "FIREBASE_PROJECT_ID",
      "FIREBASE_PRIVATE_KEY",
      "FIREBASE_CLIENT_EMAIL"
    ];

    for (const ck of criticalKeys) {
      if (!parsedKeys.has(ck) || (parsedKeys.has(ck) && !parsedKeys.get(ck)![0].val)) {
        report.diagnostics.push({
          type: "error",
          category: "missing",
          key: ck,
          message: `Critical configuration key "${ck}" is missing or empty.`
        });
      }
    }

    // 5. Security audit
    this.runSecurityChecks(report);

    return report;
  }

  private validateKeyPatterns(key: string, val: string, report: DoctorReport) {
    if (!val) return;

    if (key.includes("GEMINI") && !val.startsWith("AIza")) {
      report.diagnostics.push({
        type: "warning",
        category: "naming",
        key,
        message: `Google Gemini API Key format mismatch. Expected prefix: "AIza"`
      });
    }

    if (key.includes("GROQ") && !val.startsWith("gsk_")) {
      report.diagnostics.push({
        type: "warning",
        category: "naming",
        key,
        message: `Groq API Key format mismatch. Expected prefix: "gsk_"`
      });
    }

    if (key.includes("NVIDIA") && !val.startsWith("nvapi-")) {
      report.diagnostics.push({
        type: "warning",
        category: "naming",
        key,
        message: `NVIDIA NIM API Key format mismatch. Expected prefix: "nvapi-"`
      });
    }

    if (key.includes("OPENROUTER") && !val.startsWith("sk-")) {
      report.diagnostics.push({
        type: "warning",
        category: "naming",
        key,
        message: `OpenRouter API Key format mismatch. Expected prefix: "sk-"`
      });
    }

    if (key.includes("HUGGINGFACE") && !val.startsWith("hf_")) {
      report.diagnostics.push({
        type: "warning",
        category: "naming",
        key,
        message: `HuggingFace token format mismatch. Expected prefix: "hf_"`
      });
    }
  }

  private checkDependencies(report: DoctorReport) {
    const pkgFile = path.resolve(process.cwd(), "package.json");
    if (!fs.existsSync(pkgFile)) return;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      
      const required = ["better-sqlite3", "sharp", "lucide-react", "zod", "zustand"];
      for (const req of required) {
        const has = !!deps[req];
        report.dependenciesStatus[req] = has;
        if (!has) {
          report.diagnostics.push({
            type: "error",
            category: "dependency",
            message: `Required dependency package "${req}" is missing in package.json.`
          });
        }
      }
    } catch {}
  }

  private runSecurityChecks(report: DoctorReport) {
    const key = report.envKeys["INTERNAL_API_SECRET_KEY"];
    if (key === "CHANGE_ME_IN_PRODUCTION" || key === "supersecretkey123") {
      report.securityAudit.passed = false;
      report.securityAudit.issues.push("INTERNAL_API_SECRET_KEY is using unsafe default values.");
      report.diagnostics.push({
        type: "warning",
        category: "security",
        key: "INTERNAL_API_SECRET_KEY",
        message: "API Internal Secret Key is insecure. Change in production configurations."
      });
    }

    const fireKey = report.envKeys["FIREBASE_PRIVATE_KEY"];
    if (fireKey && !fireKey.includes("BEGIN PRIVATE KEY")) {
      report.securityAudit.passed = false;
      report.securityAudit.issues.push("FIREBASE_PRIVATE_KEY format appears invalid.");
      report.diagnostics.push({
        type: "error",
        category: "security",
        key: "FIREBASE_PRIVATE_KEY",
        message: "Firebase Private Key is malformed or invalid."
      });
    }
  }
}

export const EnvironmentDoctor = new EnvironmentDoctorClass();
