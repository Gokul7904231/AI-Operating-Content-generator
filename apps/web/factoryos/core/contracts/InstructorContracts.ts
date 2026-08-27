/**
 * FactoryOS v1 — Bounded Instructor Contracts
 * Defines schema validation, output repair, and contract enforcement interfaces.
 */

export interface SchemaValidationRequest {
  readonly schemaName: string;
  readonly rawOutput: string | Record<string, unknown>;
  readonly expectedFields: string[];
  readonly autoRepair?: boolean;
}

export interface SchemaValidationResult<T = Record<string, unknown>> {
  readonly isValid: boolean;
  readonly validatedData?: T;
  readonly repaired: boolean;
  readonly errors: string[];
  readonly rawOutputString: string;
}

export interface IInstructorSubsystem {
  validateAndRepair<T = Record<string, unknown>>(
    request: SchemaValidationRequest
  ): Promise<SchemaValidationResult<T>>;
}
