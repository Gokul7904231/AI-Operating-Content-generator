/**
 * FactoryOS v0.1 — Result Contract
 *
 * Every Worker must return a WorkerResult.
 * Structured failure data prevents silent swallowing of errors.
 */

export interface WorkerError {
  code: string;
  message: string;
  /** Original exception if available */
  cause?: unknown;
}

export interface WorkerResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: WorkerError;
  /** Arbitrary key/value telemetry metadata */
  metadata?: Record<string, unknown>;
}

/** Convenience factory for a successful result */
export function ok<T>(output: T, metadata?: Record<string, unknown>): WorkerResult<T> {
  return { success: true, output, metadata };
}

/** Convenience factory for a failed result */
export function fail(
  code: string,
  message: string,
  cause?: unknown,
  metadata?: Record<string, unknown>
): WorkerResult<never> {
  return { success: false, error: { code, message, cause }, metadata };
}
