import { db } from "../firebase-admin";

export interface OverseerAuditPayload {
  userId: string;
  role: string;
  conversationId?: string;
  toolId: string;
  toolName: string;
  riskLevel: string;
  action: string;
  target?: string;
  confirmationStatus: "NOT_REQUIRED" | "CONFIRMED" | "CANCELLED";
  result: "SUCCESS" | "FAILED" | "BLOCKED";
}

export class OverseerAudit {
  static async logAction(payload: OverseerAuditPayload): Promise<void> {
    const record = {
      ...payload,
      eventType: "OVERSEER_ACTION",
      timestamp: new Date().toISOString(),
    };

    try {
      await db.collection("audit_logs").add(record);
    } catch {
      console.log(`[OverseerAudit] ${record.eventType} by user "${payload.userId}" on tool "${payload.toolName}" status="${payload.result}"`);
    }
  }
}
