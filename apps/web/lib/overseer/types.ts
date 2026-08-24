/**
 * FactoryOS Overseer Core Data Types & Interfaces
 */

export type AgentMode = "CHAT" | "OPERATE" | "RESEARCH" | "CREATE" | "MONITOR" | "AUTOPILOT";
export type RiskLevel = "READ" | "LOW" | "MEDIUM" | "HIGH";

export interface ExecutionBudget {
  maxSteps: number;
  maxToolCalls: number;
  maxExecutionTimeMs: number;
}

export interface OverseerToolInputSchema {
  type: string;
  properties: Record<string, { type: string; description: string; required?: boolean }>;
  required?: string[];
}

export interface OverseerTool {
  id: string;
  name: string;
  description: string;
  inputSchema: OverseerToolInputSchema;
  requiredRole: "VIEWER" | "EDITOR" | "ADMIN" | "OWNER";
  riskLevel: RiskLevel;
  confirmationRequired: boolean;
  handler: (args: any, context: OverseerExecutionContext) => Promise<any>;
}

export interface OverseerExecutionContext {
  user: {
    uid: string;
    email: string;
    role: "VIEWER" | "EDITOR" | "ADMIN" | "OWNER";
  };
  mode: AgentMode;
  sessionContext?: {
    currentPage?: string;
    currentProjectId?: string;
    currentJobId?: string;
  };
}

export interface AgentStepTrace {
  stepIndex: number;
  subAgentName?: string;
  toolName: string;
  riskLevel: RiskLevel;
  status: "EXECUTED" | "CONFIRMATION_REQUIRED" | "FAILED" | "BLOCKED";
  outputSummary?: string;
  timestamp: string;
}

export interface ConfirmationRequest {
  id: string;
  toolId: string;
  toolName: string;
  riskLevel: RiskLevel;
  summary: string;
  payload: Record<string, any>;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  timestamp: string;
}

export interface ContextualCard {
  type: "ACTIVE_RENDER" | "FAILURE_ANALYSIS" | "RECOMMENDATION" | "AUTOMATION_SCHEDULED";
  title: string;
  details: Record<string, any>;
  actions?: Array<{ label: string; actionId: string; payload?: any }>;
}

export interface SubAgentResult {
  agentName: string;
  toolsUsed: string[];
  findings: string;
  data: Record<string, any>;
}

export interface OverseerMemory {
  shortTermHistory: Array<{ role: "user" | "assistant"; content: string; timestamp: string }>;
  sessionContext: Record<string, any>;
  userPreferences: {
    preferredDurationSeconds?: number;
    preferredTone?: string;
    preferredLocalProvider?: string;
    preferredPlatform?: string;
  };
}

export interface AutomationItem {
  id: string;
  userId: string;
  name: string;
  triggerType: "SCHEDULE" | "ON_JOB_COMPLETED" | "ON_JOB_FAILED" | "ON_PROVIDER_RECOVERY";
  scheduleCron?: string;
  prompt: string;
  enabled: boolean;
  lastExecuted?: string;
  createdAt: string;
}
