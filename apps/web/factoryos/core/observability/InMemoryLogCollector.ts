/**
 * FactoryOS v0.1 — InMemory Log Collector
 *
 * In-memory collector for structured log entries.
 */

import type { LogCollector, LogEntry } from "./ObservabilityContracts";

export class InMemoryLogCollector implements LogCollector {
  private logs: LogEntry[] = [];

  log(
    level: "info" | "warn" | "error",
    message: string,
    context?: Record<string, unknown>
  ): void {
    this.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? structuredClone(context) : undefined,
    });
  }

  getLogs(): LogEntry[] {
    return structuredClone(this.logs);
  }

  clear(): void {
    this.logs = [];
  }
}
