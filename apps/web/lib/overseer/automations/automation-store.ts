import { AutomationItem } from "../types";

const automationsStore = new Map<string, AutomationItem[]>();

export class OverseerAutomationStore {
  static getAutomations(userId: string): AutomationItem[] {
    return automationsStore.get(userId) || [];
  }

  static addAutomation(userId: string, item: Omit<AutomationItem, "id" | "userId" | "createdAt">): AutomationItem {
    const userAutomations = this.getAutomations(userId);
    const newAutomation: AutomationItem = {
      ...item,
      id: `auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      userId,
      createdAt: new Date().toISOString(),
    };

    userAutomations.push(newAutomation);
    automationsStore.set(userId, userAutomations);
    return newAutomation;
  }

  static toggleAutomation(userId: string, id: string, enabled: boolean): void {
    const userAutomations = this.getAutomations(userId);
    const item = userAutomations.find(a => a.id === id);
    if (item) {
      item.enabled = enabled;
    }
  }

  static removeAutomation(userId: string, id: string): void {
    const userAutomations = this.getAutomations(userId);
    automationsStore.set(userId, userAutomations.filter(a => a.id !== id));
  }
}
