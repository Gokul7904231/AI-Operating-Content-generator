import { AdminUser } from "../auth/types";
import { 
  AgentMode, ExecutionBudget, AgentStepTrace, 
  ConfirmationRequest, ContextualCard, OverseerMemory 
} from "./types";
import { OverseerToolRegistry } from "./tool-registry";
import { OverseerPermissions } from "./permissions";
import { OverseerGuardrails } from "./guardrails";
import { OverseerMemoryEngine } from "./memory";
import { OverseerAudit } from "./audit";
import { OverseerCognitivePipeline } from "@/factoryos/core/cognition/OverseerCognitivePipeline";

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

  private static cognitivePipeline = new OverseerCognitivePipeline();

  /**
   * Main Autonomous Bounded Agent Loop with Cognitive Layer Integration
   */
  static async run(
    message: string, 
    user: AdminUser, 
    mode: AgentMode = "OPERATE",
    sessionContext?: Record<string, any>
  ): Promise<AgentRunResponse> {
    const cleanMessage = OverseerGuardrails.sanitizeInputPrompt(message);
    const messageLower = cleanMessage.toLowerCase();

    // 1. Update Short-Term & Session Memory
    OverseerMemoryEngine.addConversationMessage(user.uid, "user", cleanMessage);
    if (sessionContext) {
      OverseerMemoryEngine.updateSessionContext(user.uid, sessionContext);
    }

    const memory = OverseerMemoryEngine.getMemory(user.uid);
    const recentMessages = (memory.shortTermHistory || []).slice(-5).map(m => `${m.role}: ${m.content}`);
    const traces: AgentStepTrace[] = [];
    const dataContext: Record<string, any> = {};

    let confirmationRequest: ConfirmationRequest | undefined;
    let contextualCard: ContextualCard | undefined;

    // 2. Action Request Check requiring human confirmation (e.g. create video)
    if (/^create.*video|^generate.*video|^make.*short/i.test(messageLower)) {
      const topic = cleanMessage.replace(/create video|generate video|make a short|about/gi, "").trim() || "AI Innovations";
      confirmationRequest = {
        id: `conf_${Date.now()}`,
        toolId: "createVideo",
        toolName: "Create Short Video",
        riskLevel: "HIGH",
        summary: `Create 30-second YouTube Short on "${topic}"`,
        payload: { topic, durationSeconds: memory.userPreferences.preferredDurationSeconds || 30 },
        status: "PENDING",
        timestamp: new Date().toISOString(),
      };

      traces.push({
        stepIndex: 1,
        toolName: "Create Short Video",
        riskLevel: "HIGH",
        status: "CONFIRMATION_REQUIRED",
        outputSummary: `Action requires user confirmation: Create Video Short on "${topic}".`,
        timestamp: new Date().toISOString(),
      });

      const answer = `I can create that video on "${topic}" for you. Please confirm the production details below.`;
      return {
        mode,
        userRole: user.role,
        answer,
        traces,
        confirmationRequest,
        dataContext,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Cognitive Runtime Execution Pipeline
    const cognitiveResult = await this.cognitivePipeline.processUserQuery(cleanMessage, {
      userId: user.uid,
      userRole: user.role,
      recentMessages,
    });

    dataContext.cognitiveIntent = cognitiveResult.intent;
    dataContext.sourceUsed = cognitiveResult.sourceUsed;
    dataContext.evidence = cognitiveResult.evidence;

    for (let i = 0; i < cognitiveResult.traces.length; i++) {
      const tr = cognitiveResult.traces[i];
      traces.push({
        stepIndex: i + 1,
        toolName: tr.stage,
        riskLevel: "READ",
        status: "EXECUTED",
        outputSummary: tr.detail,
        timestamp: tr.timestamp,
      });
    }

    // 4. Generate Contextual Card for active renders/jobs
    if (cognitiveResult.evidence.activeJobs && cognitiveResult.evidence.activeJobs > 0) {
      contextualCard = {
        type: "ACTIVE_RENDER",
        title: "Active Production Job",
        details: {
          status: "RENDERING",
          progress: 80,
          duration: "30s",
        },
      };
    }

    // Record audit log
    await OverseerAudit.logAction({
      userId: user.uid,
      role: user.role,
      toolId: cognitiveResult.sourceUsed || "OverseerCognition",
      toolName: "OverseerCognitivePipeline",
      riskLevel: "READ",
      action: mode,
      confirmationStatus: "NOT_REQUIRED",
      result: "SUCCESS",
    });

    return {
      mode,
      userRole: user.role,
      answer: cognitiveResult.answer,
      traces,
      confirmationRequest,
      contextualCard,
      dataContext,
      timestamp: new Date().toISOString(),
    };
  }
}
