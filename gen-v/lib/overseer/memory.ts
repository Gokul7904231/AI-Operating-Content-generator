import { OverseerMemory } from "./types";

const memoryStore = new Map<string, OverseerMemory>();

export class OverseerMemoryEngine {
  /**
   * Retrieves or initializes structured memory for a user.
   */
  static getMemory(userId: string): OverseerMemory {
    if (!memoryStore.has(userId)) {
      memoryStore.set(userId, {
        shortTermHistory: [],
        sessionContext: {},
        userPreferences: {
          preferredDurationSeconds: 30,
          preferredTone: "Educational",
          preferredPlatform: "YouTube Shorts",
        },
      });
    }
    return memoryStore.get(userId)!;
  }

  /**
   * Append message to short-term conversation history.
   */
  static addConversationMessage(userId: string, role: "user" | "assistant", content: string): void {
    const memory = this.getMemory(userId);
    memory.shortTermHistory.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    // Keep last 15 messages for short-term history
    if (memory.shortTermHistory.length > 15) {
      memory.shortTermHistory = memory.shortTermHistory.slice(-15);
    }
  }

  /**
   * Update session context (current page, active project).
   */
  static updateSessionContext(userId: string, context: Record<string, any>): void {
    const memory = this.getMemory(userId);
    memory.sessionContext = { ...memory.sessionContext, ...context };
  }

  /**
   * Update user preferences (long-term memory).
   */
  static updateUserPreference(userId: string, key: string, value: any): void {
    const memory = this.getMemory(userId);
    (memory.userPreferences as any)[key] = value;
  }

  /**
   * Clear user memory.
   */
  static clearMemory(userId: string): void {
    memoryStore.delete(userId);
  }
}
