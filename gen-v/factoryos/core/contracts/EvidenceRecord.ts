/**
 * FactoryOS Frontier v3 — Evidence Record & Authoritative Source Contracts
 * Zero-Placeholder Live-Only Evidence Architecture
 */

export type EvidenceType = 
  | "TELEMETRY" 
  | "WEB_RESEARCH" 
  | "DOCUMENT" 
  | "QUOTA" 
  | "MISSION" 
  | "PROVIDER" 
  | "ARTIFACT" 
  | "SYSTEM";

export type OutputState = 
  | "LOADING" 
  | "SUCCESS" 
  | "EMPTY" 
  | "UNAVAILABLE" 
  | "ERROR" 
  | "DEGRADED" 
  | "UNKNOWN";

export interface EvidenceRecord<T = unknown> {
  id: string;
  type: EvidenceType;
  source: string;
  sourceId?: string;
  retrievedAt: string;
  state: OutputState;
  retrievalMetadata?: {
    toolId?: string;
    toolCallId?: string;
    agentId?: string;
    provider?: string;
    model?: string;
    latencyMs?: number;
    cached?: boolean;
    ttlMs?: number;
  };
  data: T;
  claims?: string[];
  error?: string;
}

export interface CompletionPredicate<T = any> {
  name: string;
  evaluate(artifact: T): Promise<{ passed: boolean; reason?: string }>;
}

export class EvidenceFactory {
  static create<T>(
    type: EvidenceType,
    source: string,
    state: OutputState,
    data: T,
    options?: {
      sourceId?: string;
      claims?: string[];
      metadata?: EvidenceRecord["retrievalMetadata"];
      error?: string;
    }
  ): EvidenceRecord<T> {
    return {
      id: `ev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      source,
      sourceId: options?.sourceId,
      retrievedAt: new Date().toISOString(),
      state,
      data,
      claims: options?.claims,
      retrievalMetadata: options?.metadata,
      error: options?.error,
    };
  }
}
