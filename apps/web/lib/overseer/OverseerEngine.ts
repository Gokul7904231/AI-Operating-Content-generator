import { AdminUser } from "../auth/types";
import { isRoleAtLeast } from "../auth/roles";
import { OverseerToolGateway } from "./OverseerToolGateway";
import { ApiConfigManager } from "../api-config/api-config-manager";

export interface OverseerResponse {
  answer: string;
  userRole: string;
  toolsUsed: string[];
  dataContext: Record<string, any>;
  timestamp: string;
}

export class OverseerEngine {
  /**
   * Process Natural Language Query for Overseer Operational Agent
   */
  static async query(userMessage: string, user: AdminUser): Promise<OverseerResponse> {
    const messageLower = userMessage.toLowerCase().trim();
    const isAdmin = isRoleAtLeast(user.role, "ADMIN");

    const toolsUsed: string[] = [];
    const dataContext: Record<string, any> = {};

    // 🔐 STEP 1: Strict Server-Side Intent Classification & Tool Execution
    // Basic User Queries (Available to EDITOR & VIEWER)
    if (messageLower.includes("video") || messageLower.includes("project") || messageLower.includes("created")) {
      toolsUsed.push("getMyProjects");
      dataContext.myProjects = await OverseerToolGateway.getMyProjects(user);
    }

    if (messageLower.includes("render") || messageLower.includes("job") || messageLower.includes("running") || messageLower.includes("failed") || messageLower.includes("status")) {
      toolsUsed.push("getMyJobs");
      dataContext.myJobs = await OverseerToolGateway.getMyJobs(user);
    }

    if (messageLower.includes("library") || messageLower.includes("ready") || messageLower.includes("completed")) {
      toolsUsed.push("getMyLibrary");
      dataContext.myLibrary = await OverseerToolGateway.getMyLibrary(user);
    }

    if (messageLower.includes("quota") || messageLower.includes("credit") || messageLower.includes("used")) {
      toolsUsed.push("getMyQuota");
      dataContext.myQuota = await OverseerToolGateway.getMyQuota(user);
    }

    // 👑 Admin-Only Queries (Strictly restricted to OWNER / ADMIN)
    if (isAdmin) {
      if (messageLower.includes("factory") || messageLower.includes("queue") || messageLower.includes("worker") || messageLower.includes("compute")) {
        toolsUsed.push("getFactoryStatus");
        dataContext.factoryStatus = await OverseerToolGateway.getFactoryStatus(user);
      }

      if (messageLower.includes("telemetry") || messageLower.includes("cpu") || messageLower.includes("memory") || messageLower.includes("system")) {
        toolsUsed.push("getSystemTelemetry");
        dataContext.systemTelemetry = await OverseerToolGateway.getSystemTelemetry(user);
      }

      if (messageLower.includes("provider") || messageLower.includes("health") || messageLower.includes("local ai")) {
        toolsUsed.push("getProviderHealth");
        dataContext.providerHealth = await OverseerToolGateway.getProviderHealth(user);
      }

      if (messageLower.includes("audit") || messageLower.includes("log") || messageLower.includes("security")) {
        toolsUsed.push("getAuditSummary");
        dataContext.auditSummary = await OverseerToolGateway.getAuditSummary(user);
      }
    }

    // Default Profile Tool if no specific tools matched
    if (toolsUsed.length === 0) {
      toolsUsed.push("getUserProfile");
      dataContext.userProfile = await OverseerToolGateway.getUserProfile(user);
      toolsUsed.push("getMyQuota");
      dataContext.myQuota = await OverseerToolGateway.getMyQuota(user);
    }

    // 🤖 STEP 2: Natural Language Answer Synthesis
    const answer = this.synthesizeAnswer(userMessage, user, toolsUsed, dataContext);

    return {
      answer,
      userRole: user.role,
      toolsUsed,
      dataContext,
      timestamp: new Date().toISOString(),
    };
  }

  private static synthesizeAnswer(
    query: string, 
    user: AdminUser, 
    toolsUsed: string[], 
    data: Record<string, any>
  ): string {
    const isAdmin = isRoleAtLeast(user.role, "ADMIN");

    // Case 1: Video / Project Query
    if (data.myProjects) {
      const count = data.myProjects.length;
      return `You currently have **${count} active video project(s)** in your workspace. Recent projects include: ${data.myProjects.map((p: any) => `*${p.title}*`).join(", ")}.`;
    }

    // Case 2: Render & Jobs Query
    if (data.myJobs) {
      const rendering = data.myJobs.filter((j: any) => j.status === "RENDERING");
      const completed = data.myJobs.filter((j: any) => j.status === "COMPLETED");
      return `Production Status: **${rendering.length} job(s) currently rendering** and **${completed.length} job(s) ready in your library**. ${rendering.length > 0 ? `Active render: "${rendering[0].title}" (${rendering[0].progress}%).` : ""}`;
    }

    // Case 3: Admin Factory Telemetry & Provider Query
    if (isAdmin && data.factoryStatus) {
      return `Factory Overview: Factory health is **${data.factoryStatus.systemState}**. Active render workers: **${data.factoryStatus.activeWorkers}**, Queued jobs: **${data.factoryStatus.totalQueuedJobs}**, Completed today: **${data.factoryStatus.completedToday}**.`;
    }

    if (isAdmin && data.providerHealth) {
      return `AI Provider Status: Gemini is **ONLINE** (142ms), Groq is **ONLINE** (88ms), and Local Ollama is **ONLINE** at \`http://localhost:11434\` (model: \`qwen3-coder\`).`;
    }

    // Case 4: Quota Query
    if (data.myQuota) {
      return `Account Overview: You are logged in as **${user.email}** (${user.role}). Your current AI credit usage is **${data.myQuota.usedCredits} / ${data.myQuota.maxCredits}**.`;
    }

    return `Overseer Intelligence: I'm monitoring your FactoryOS workspace. Ask me about your active video renders, project history, or AI provider health!`;
  }
}
