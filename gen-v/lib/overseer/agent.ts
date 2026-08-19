import { AdminUser } from "../auth/types";
import { 
  AgentMode, ExecutionBudget, AgentStepTrace, 
  ConfirmationRequest, ContextualCard, OverseerMemory 
} from "./types";
import { OverseerToolRegistry } from "./tool-registry";
import { OverseerPermissions } from "./permissions";
import { OverseerGuardrails } from "./guardrails";
import { OverseerMemoryEngine } from "./memory";
import { SubAgentOrchestrator } from "./subagent-orchestrator";
import { OverseerAudit } from "./audit";

export interface AgentRunResponse {
  mode: AgentMode;
  userRole: string;
  answer: string;
  traces: AgentStepTrace[];
  confirmationRequest?: ConfirmationRequest;
  contextualCard?: ContextualCard;
  dataContext: Record<string, any>;
  timestamp: string;
}

export class OverseerAgent {
  private static DEFAULT_BUDGET: ExecutionBudget = {
    maxSteps: 10,
    maxToolCalls: 20,
    maxExecutionTimeMs: 15000,
  };

  /**
   * Main Autonomous Bounded Agent Loop
   */
  static async run(
    message: string, 
    user: AdminUser, 
    mode: AgentMode = "OPERATE",
    sessionContext?: Record<string, any>
  ): Promise<AgentRunResponse> {
    const startTime = Date.now();
    const cleanMessage = OverseerGuardrails.sanitizeInputPrompt(message);
    const messageLower = cleanMessage.toLowerCase();

    // 1. Update Short-Term & Session Memory
    OverseerMemoryEngine.addConversationMessage(user.uid, "user", cleanMessage);
    if (sessionContext) {
      OverseerMemoryEngine.updateSessionContext(user.uid, sessionContext);
    }

    const memory = OverseerMemoryEngine.getMemory(user.uid);
    const traces: AgentStepTrace[] = [];
    const dataContext: Record<string, any> = {};

    let confirmationRequest: ConfirmationRequest | undefined;
    let contextualCard: ContextualCard | undefined;
    let toolCallCount = 0;

    // 2. Select Tools for Current Role & Intent
    const availableTools = OverseerToolRegistry.getToolsForRole(user.role as any);

    // 3. Multi-Step Execution Loop
    // Scenario A: Action Request requiring confirmation (e.g. "Create a video about quantum computing")
    if (/create.*video|generate.*video|make.*short|create.*short/i.test(messageLower)) {
      const tool = availableTools.find(t => t.id === "createVideo");
      if (tool) {
        toolCallCount++;
        const topic = cleanMessage.replace(/create video|generate video|make a short|about/gi, "").trim() || "AI Innovations";

        if (tool.confirmationRequired) {
          confirmationRequest = {
            id: `conf_${Date.now()}`,
            toolId: tool.id,
            toolName: tool.name,
            riskLevel: tool.riskLevel,
            summary: `Create 30-second YouTube Short on "${topic}"`,
            payload: { topic, durationSeconds: memory.userPreferences.preferredDurationSeconds || 30 },
            status: "PENDING",
            timestamp: new Date().toISOString(),
          };

          traces.push({
            stepIndex: 1,
            toolName: tool.name,
            riskLevel: tool.riskLevel,
            status: "CONFIRMATION_REQUIRED",
            outputSummary: `Action requires user confirmation: Create Video Short on "${topic}".`,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }

    // Scenario B: Read Queries (Single or Parallel Sub-Agent Execution)
    if (!confirmationRequest) {
      if (mode === "RESEARCH" || messageLower.includes("research") || messageLower.includes("why")) {
        // Parallel Sub-Agents Orchestration
        const subAgentResults = await SubAgentOrchestrator.runParallelSubAgents(cleanMessage, user, mode);
        for (const res of subAgentResults) {
          toolCallCount += res.toolsUsed.length;
          dataContext[res.agentName] = res.data;
          traces.push({
            stepIndex: traces.length + 1,
            subAgentName: res.agentName,
            toolName: res.toolsUsed.join(", ") || "Analysis",
            riskLevel: "READ",
            status: "EXECUTED",
            outputSummary: res.findings,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Sequential Bounded Tool Execution
        for (const tool of availableTools) {
          if (toolCallCount >= this.DEFAULT_BUDGET.maxToolCalls) break;
          if (Date.now() - startTime > this.DEFAULT_BUDGET.maxExecutionTimeMs) break;

          if (tool.riskLevel === "READ" && this.shouldTriggerTool(messageLower, tool.id)) {
            try {
              OverseerPermissions.assertToolPermission(tool, user as any);
              toolCallCount++;
              const result = await tool.handler({}, { user: user as any, mode });
              dataContext[tool.id] = OverseerGuardrails.sanitizeOutput(result);

              traces.push({
                stepIndex: traces.length + 1,
                toolName: tool.name,
                riskLevel: tool.riskLevel,
                status: "EXECUTED",
                outputSummary: `Executed ${tool.name} successfully.`,
                timestamp: new Date().toISOString(),
              });
            } catch (err: any) {
              traces.push({
                stepIndex: traces.length + 1,
                toolName: tool.name,
                riskLevel: tool.riskLevel,
                status: "BLOCKED",
                outputSummary: `Tool execution blocked: ${err.message}`,
                timestamp: new Date().toISOString(),
              });
            }
          }
        }
      }
    }

    // Default READ tool if no specific tool matched
    if (traces.length === 0 && !confirmationRequest) {
      const defaultTool = availableTools.find(t => t.id === "getMyJobs") || availableTools.find(t => t.id === "getUserProfile");
      if (defaultTool) {
        const result = await defaultTool.handler({}, { user: user as any, mode });
        dataContext[defaultTool.id] = OverseerGuardrails.sanitizeOutput(result);
        traces.push({
          stepIndex: 1,
          toolName: defaultTool.name,
          riskLevel: defaultTool.riskLevel,
          status: "EXECUTED",
          outputSummary: `Checked workspace state.`,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 4. Generate Contextual UI Card where appropriate
    if (dataContext.getMyJobs && Array.isArray(dataContext.getMyJobs) && dataContext.getMyJobs.length > 0) {
      const activeJob = dataContext.getMyJobs.find((j: any) => j.status === "RENDERING") || dataContext.getMyJobs[0];
      contextualCard = {
        type: "ACTIVE_RENDER",
        title: activeJob.title || "Active Render",
        details: {
          status: activeJob.status,
          progress: activeJob.progress || 100,
          duration: activeJob.duration || "45s",
        },
      };
    }

    // 5. Synthesize Answer
    const answer = this.synthesizeAgentAnswer(cleanMessage, user, mode, dataContext, confirmationRequest);

    // Record audit event
    await OverseerAudit.logAction({
      userId: user.uid,
      role: user.role,
      toolId: traces[0]?.toolName || "query",
      toolName: traces[0]?.toolName || "AgentQuery",
      riskLevel: traces[0]?.riskLevel || "READ",
      action: mode,
      confirmationStatus: confirmationRequest ? "NOT_REQUIRED" : "NOT_REQUIRED",
      result: "SUCCESS",
    });

    return {
      mode,
      userRole: user.role,
      answer,
      traces,
      confirmationRequest,
      contextualCard,
      dataContext,
      timestamp: new Date().toISOString(),
    };
  }

  private static shouldTriggerTool(query: string, toolId: string): boolean {
    if (toolId === "getMyProjects" && (query.includes("project") || query.includes("created"))) return true;
    if (toolId === "getMyJobs" && (query.includes("render") || query.includes("job") || query.includes("running") || query.includes("status"))) return true;
    if (toolId === "getLibraryAssets" && (query.includes("library") || query.includes("ready") || query.includes("video"))) return true;
    if (toolId === "getUserQuota" && (query.includes("quota") || query.includes("credit"))) return true;
    if (toolId === "getFactoryHealth" && (query.includes("factory") || query.includes("health") || query.includes("queue"))) return true;
    if (toolId === "getSystemTelemetry" && (query.includes("telemetry") || query.includes("cpu") || query.includes("vram"))) return true;
    if (toolId === "webSearch" && (query.includes("research") || query.includes("trend"))) return true;
    return false;
  }

  private static synthesizeAgentAnswer(
    query: string,
    user: AdminUser,
    mode: AgentMode,
    data: Record<string, any>,
    confirmation?: ConfirmationRequest
  ): string {
    if (confirmation) {
      return `I can create that video for you. Please confirm the production details below.`;
    }

    if (data.getMyJobs) {
      const active = data.getMyJobs.filter((j: any) => j.status === "RENDERING");
      if (active.length > 0) {
        return `You have **${active.length} job(s) currently rendering**. Latest render: *"_${active[0].title}_"* is at **${active[0].progress}%**.`;
      }
      return `All render jobs are completed. You have **${data.getMyJobs.length} video(s)** ready in your library.`;
    }

    if (data.getFactoryHealth) {
      return `Factory Operational State: **${data.getFactoryHealth.systemState}**. Active Workers: **${data.getFactoryHealth.activeWorkers}**, Queue Depth: **${data.getFactoryHealth.queueDepth}**.`;
    }

    return `Overseer Operational Intelligence [Mode: ${mode}]: Workspace state verified for ${user.email} (${user.role}). Ask me to inspect renders, create videos, or research topics!`;
  }
}
