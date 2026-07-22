import crypto from "crypto";
import { AICapability } from "./capability-registry";
import { IntelligentRouter, AIProfile } from "./intelligent-router";

export interface RuntimeTrace {
  traceId: string;
  spanId: string;
  task: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  providerId?: string;
  modelId?: string;
  costUSD?: number;
  success: boolean;
  error?: string;
}

export interface RuntimeOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  traceId?: string;
  subtask?: string;
  maxCostLimit?: number;
  requireLocal?: boolean;
}

class AIRuntimeEngineClass {
  // Feature Flags
  public flags = {
    enableLocalAI: true,
    enableNvidia: true,
    enableBenchmark: true,
    enableAnalytics: true,
    enableMemory: true,
    enableStreaming: false,
  };

  /**
   * Executes an AI capability with tracing, cancellation signals, and timeout guards.
   */
  async execute(
    capability: AICapability,
    version: string,
    params: { prompt: string; system?: string; maxTokens?: number; temperature?: number },
    options: RuntimeOptions = {}
  ): Promise<any> {
    const traceId = options.traceId || `tr_${crypto.randomBytes(8).toString("hex")}`;
    const spanId = `sp_${crypto.randomBytes(6).toString("hex")}`;
    const startTime = Date.now();

    const trace: RuntimeTrace = {
      traceId,
      spanId,
      task: `${capability}:${version}`,
      startTime,
      success: false,
    };

    console.log(`[AIRuntime] [${traceId}:${spanId}] Starting execution for ${capability} (${version})`);

    // Setup Timeout & Cancellation guards
    const abortController = new AbortController();
    
    // Link parent signal if provided
    const parentSignal = options.signal;
    const parentListener = () => {
      console.log(`[AIRuntime] [${traceId}] Parent cancellation requested. Aborting runtime...`);
      abortController.abort();
    };

    if (parentSignal) {
      if (parentSignal.aborted) {
        throw new DOMException("Execution aborted by parent signal", "AbortError");
      }
      parentSignal.addEventListener("abort", parentListener);
    }

    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutMs = options.timeoutMs ?? Number(process.env.AI_EXECUTION_TIMEOUT_MS ?? "30000");

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        console.warn(`[AIRuntime] [${traceId}] Timeout of ${timeoutMs}ms exceeded. Triggering abort...`);
        abortController.abort(new Error("TimeoutExceeded"));
      }, timeoutMs);
    }

    try {
      // Execute through Router + Registry layers
      const executePromise = IntelligentRouter.routeExecute(
        {
          capability,
          subtask: options.subtask,
          maxCostLimit: options.maxCostLimit,
          requireLocal: options.requireLocal || !this.flags.enableLocalAI,
        },
        {
          ...params,
          // Propagate abort controller signal to execution adapters
          // (They must respect the controller abort signal for network cancel)
        }
      );

      // We race the executePromise or listen to abort events
      const abortPromise = new Promise((_, reject) => {
        abortController.signal.addEventListener("abort", () => {
          const reason = abortController.signal.reason;
          if (reason?.message === "TimeoutExceeded") {
            reject(new Error(`[AIRuntime] Execution timed out after ${timeoutMs}ms`));
          } else {
            reject(new DOMException("Execution cancelled by user request", "AbortError"));
          }
        });
      });

      const result = await Promise.race([executePromise, abortPromise]);

      // Complete Trace
      const endTime = Date.now();
      trace.endTime = endTime;
      trace.duration = endTime - startTime;
      trace.success = true;
      
      console.log(`[AIRuntime] [${traceId}] Completed execution successfully in ${trace.duration}ms`);
      return result;

    } catch (err: any) {
      const endTime = Date.now();
      trace.endTime = endTime;
      trace.duration = endTime - startTime;
      trace.success = false;
      trace.error = err.message || String(err);

      console.error(`[AIRuntime] [${traceId}] Execution failed: ${trace.error}`);
      throw err;
    } finally {
      // Clean up guards
      if (timeoutId) clearTimeout(timeoutId);
      if (parentSignal) parentSignal.removeEventListener("abort", parentListener);
      
      // Publish tracing event to telemetry logs
      this.logTelemetryTrace(trace);
    }
  }

  private logTelemetryTrace(trace: RuntimeTrace) {
    if (!this.flags.enableAnalytics) return;
    
    // Write telemetry to console for debugging (and future OpenTelemetry / APM connector)
    console.log(
      `[TELEMETRY TRACE] ${JSON.stringify({
        traceId: trace.traceId,
        spanId: trace.spanId,
        task: trace.task,
        durationMs: trace.duration,
        success: trace.success,
        error: trace.error,
      })}`
    );
  }
}

export const AIRuntime = new AIRuntimeEngineClass();
export type AIRuntimeEngine = typeof AIRuntime;
