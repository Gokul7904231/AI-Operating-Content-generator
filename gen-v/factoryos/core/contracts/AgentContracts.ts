/**
 * FactoryOS Frontier v3 — Agent Contracts
 * Defines operational specialist roles and hierarchical delegation structures.
 */

export type AgentRole =
  | "Overseer"
  | "TrendAnalysisAgent"
  | "ResearchAgent"
  | "ScriptAgent"
  | "VisualPlanningAgent"
  | "VoiceAgent"
  | "RenderAgent"
  | "VideoQAAgent"
  | "DeliveryAgent"
  | "RecoveryAgent"
  | "PublishingAgent";

export interface AgentDescriptor {
  readonly role: AgentRole;
  readonly name: string;
  readonly description: string;
  readonly primaryCapabilities: string[];
  readonly allowedTools: string[];
  readonly delegationSubordinates: AgentRole[];
  readonly maxConcurrency: number;
  readonly defaultTimeoutMs: number;
}

export interface AgentDelegationRequest {
  readonly callerAgent: AgentRole;
  readonly targetAgent: AgentRole;
  readonly missionId: string;
  readonly taskId: string;
  readonly taskObjective: string;
  readonly contextPayload: Record<string, unknown>;
  readonly timeoutMs?: number;
}

export interface AgentDelegationResult {
  readonly success: boolean;
  readonly executingAgent: AgentRole;
  readonly outputArtifactId?: string;
  readonly evidenceId?: string;
  readonly data: Record<string, unknown>;
  readonly executionTimeMs: number;
  readonly error?: string;
}
