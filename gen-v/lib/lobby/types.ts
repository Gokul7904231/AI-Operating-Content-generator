export type FactoryStatusType = "NORMAL" | "ATTENTION_REQUIRED" | "DEGRADED";

export type FloorState = "READY" | "WORKING" | "STANDBY" | "CONCEPTUAL" | "BLOCKED" | "ERROR";

export type AttentionPriority = "CRITICAL" | "ERROR" | "ATTENTION" | "WORKING" | "READY" | "STANDBY";

export interface PersonnelRole {
  title: string;
  name: string;
  status: "READY" | "ACTIVE" | "MONITORING" | "IDLE" | "ERROR";
  note?: string;
}

export interface FloorStatus {
  id: string; // e.g. "01", "02", "06"
  name: string; // Short name e.g. "Strategy & Intelligence"
  shortCode: string; // e.g. "STRATEGY"
  state: FloorState;
  activeJobCount: number;
  isConceptual?: boolean;
  hasAttention?: boolean;
  attentionCount?: number;
  description: string;
  personnel: {
    guardian: PersonnelRole;
    workersCount: number;
    advisor?: PersonnelRole;
    auditor?: PersonnelRole;
  };
  recentActivity: string[];
}

export interface ProductionJob {
  id: string;
  title: string;
  topic: string;
  currentFloor: string; // e.g. "Floor 04 · Physical Media Synthesis"
  floorId: string;
  state: "QUEUED" | "PROCESSING" | "RENDERING" | "AWAITING_REVIEW" | "COMPLETED" | "FAILED" | "BLOCKED";
  progressPct: number;
  elapsedTime: string;
  lastEvent: string;
  attentionState?: {
    priority: AttentionPriority;
    title: string;
    description: string;
    suggestedAction: string;
  };
  createdAt: string;
}

export interface FactoryEvent {
  id: string;
  timestamp: string;
  sender: string; // e.g. "Floor 04", "Slayer", "Healer", "Overseer"
  recipient: string; // e.g. "Floor 05", "Overseer"
  message: string;
  severity: "info" | "warning" | "success" | "error";
  floorId?: string;
  jobId?: string;
}

export interface AttentionItem {
  id: string;
  priority: AttentionPriority;
  floorId?: string;
  floorName?: string;
  jobId?: string;
  jobTitle?: string;
  title: string;
  description: string;
  suggestedAction: string;
  involvedRoles: string[]; // e.g. ["ReMaker", "Healer"]
  timestamp: string;
  resolved?: boolean;
}

export interface OverseerSummary {
  headline: string;
  status: "OPTIMAL" | "ATTENTION" | "INVESTIGATING";
  activeProductionsCount: number;
  floorsAwaitingReviewCount: number;
  criticalFailuresCount: number;
  recoveredJobsCount: number;
  activeWorkersCount: number;
  lastAuditTimestamp: string;
  recentDecisions: Array<{
    id: string;
    timestamp: string;
    decision: string;
    actor: string;
  }>;
}

export interface FactoryState {
  status: FactoryStatusType;
  floors: FloorStatus[];
  productions: ProductionJob[];
  events: FactoryEvent[];
  attention: AttentionItem[];
  overseer: OverseerSummary;
}
