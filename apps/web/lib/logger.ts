/**
 * SRE Logging Center
 *
 * Exposes a pluggable transport model (Console, Sentry).
 * Automatically formats JSON logs containing correlation IDs
 * (traceId, jobId, workflow, step, versions) for Elasticsearch/Datadog ingestion.
 */

export interface LogPayload {
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR";
  message: string;
  jobId?: string;
  traceId?: string;
  workflowId?: string;
  step?: string;
  provider?: string;
  durationMs?: number;
  retryCount?: number;
  error?: string;
  versions?: Record<string, string>;
  [key: string]: any;
}

export interface LogTransport {
  log(payload: LogPayload): void;
}

// ── Console Transport ────────────────────────────────────────────────────────
class ConsoleLogTransport implements LogTransport {
  log(payload: LogPayload): void {
    const output = JSON.stringify(payload);
    if (payload.level === "ERROR") {
      console.error(output);
    } else if (payload.level === "WARN") {
      console.warn(output);
    } else {
      console.log(output);
    }
  }
}

// ── Sentry Transport (Stub) ──────────────────────────────────────────────────
class SentryLogTransport implements LogTransport {
  log(payload: LogPayload): void {
    if (payload.level === "ERROR") {
      // Mocked Sentry capture
      console.log(`[SentryMock] Captured error alert for trace ${payload.traceId}: ${payload.message}`);
    }
  }
}

// ── Central Logger ───────────────────────────────────────────────────────────
class LoggerClass {
  private transports: LogTransport[] = [];
  private staticSessionId = `sess_${Math.random().toString(36).slice(2, 8)}`;

  constructor() {
    // Default transports setup
    this.register(new ConsoleLogTransport());
    this.register(new SentryLogTransport());
  }

  register(transport: LogTransport): void {
    this.transports.push(transport);
  }

  info(message: string, context: Partial<LogPayload> = {}): void {
    this.dispatch("INFO", message, context);
  }

  warn(message: string, context: Partial<LogPayload> = {}): void {
    this.dispatch("WARN", message, context);
  }

  error(message: string, error: any, context: Partial<LogPayload> = {}): void {
    this.dispatch("ERROR", message, {
      ...context,
      error: error?.message || String(error),
    });
  }

  private dispatch(level: LogPayload["level"], message: string, context: Partial<LogPayload>): void {
    const payload: LogPayload = {
      timestamp: new Date().toISOString(),
      level,
      message,
      sessionId: this.staticSessionId,
      traceId: context.traceId || context.requestId || `tr_${Math.random().toString(36).slice(2, 10)}`,
      requestId: context.requestId || `req_${Math.random().toString(36).slice(2, 10)}`,
      versions: {
        engine: process.env.ENGINE_VERSION || "1.0",
        workflow: process.env.WORKFLOW_VERSION || "1.0",
        ...context.versions
      },
      ...context,
    };

    for (const transport of this.transports) {
      try {
        transport.log(payload);
      } catch {
        // Safe SRE logging: never fail the thread due to logging transport errors
      }
    }
  }
}

export const Logger = new LoggerClass();
export default Logger;
export type SreLogger = typeof Logger;
